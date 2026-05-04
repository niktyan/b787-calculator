# 04 · Domain Model

## Назначение документа

Описывает **типы данных проекта**: Value Objects, Entities, типы для расчёта, схемы bundled JSON-файлов, стратегию валидации и версионирования. Это «словарь» проекта — все остальные документы и код используют термины и структуры, определённые здесь.

Любое появление нового domain-типа в коде должно быть отражено в этом документе в том же PR.

---

## Принципы domain model

**Принцип 1 · Domain — чистый TypeScript.** Никаких импортов из `react-native`, `expo-*`, или любых других runtime-фреймворков. Domain-код запускается в Node-окружении тестов без mocks. Это гарантия тестируемости и потенциальной портабельности.

**Принцип 2 · Value Objects через branded types.** Числа с физическим смыслом (вес, CG, ветер) не передаются как голые `number` — они оборачиваются в branded типы с валидацией при создании. Это исключает класс ошибок «передал tons вместо kilolbs».

**Принцип 3 · Иммутабельность.** Все domain-объекты — `readonly`. Никакого мутирования. Производные значения вычисляются через чистые функции, не через мутацию.

**Принцип 4 · Ровно одна валидация на границе.** JSON парсится через zod-схему один раз при загрузке. Domain дальше работает с уже валидированными типами без повторных проверок.

**Принцип 5 · Никаких null/undefined в domain.** Используем `Either`-pattern (или nominal `Result<T, E>`) для функций, которые могут не дать результата. Это делает обработку ошибок явной в типах.

---

## Two distinct envelope concepts

The domain distinguishes **two** envelopes that look superficially similar
but serve different purposes. They are intentionally separate, with separate
validation flows. **Confusing them was the root of a Sprint 5 readiness
blocker — see commit history of `chore/pre-sprint-5-prep`.**

### `LookupEnvelope` — what the algorithm CAN compute

The set of `(weightTons, cgPercent)` pairs for which the bundled JSON
breakpoints can produce a numeric crosswind value. This is a property of
the lookup data file, not of regulatory limits. Outside the lookup
envelope the algorithm returns `NoLookupData`; for some special points
(below all thresholds, above all thresholds) the Excel-equivalent
algorithm intentionally returns `40` KT via IFNA-fallback (см.
`05-crosswind-algorithm.md` Особенность 1) — that is still inside the
lookup envelope.

In practice, the lookup envelope is wide: it covers anything where the
math doesn't blow up (weight not NaN, finite, non-zero, and the
piecewise-linear formula yields a finite number).

### `OperationalEnvelope` — what the regulator/operator considers safe

The set of `(weightTons, cgPercent)` pairs that fall within published
B787-8 operational limits (typically `[110, 172]` t for landing weight
and `[8, 35]` %MAC). This is a property of regulatory documents (FCOM /
operator limits), independent of the lookup data.

Validation against the operational envelope happens in the **use case
layer** (presentation) via `validateOperationalEnvelope`. The
algorithm itself does NOT know about the operational envelope.

### Composition rule for UI

- Inside lookup AND inside operational → result panel shows `idle` with
  the value, no warning.
- Inside lookup AND outside operational → result panel shows `idle`
  with the value, plus a warning chip "Outside operational envelope —
  advisory only" (см. `06-ui-spec.md` Экран 4 ResultPanelState).
- Outside lookup (algorithm returns `NoLookupData`) → result panel
  shows `out-of-envelope` with explanatory message; no number.

## Value Objects

Value Object — это immutable объект, представляющий значение с физическим смыслом. Создаётся через factory-функцию, которая валидирует входное значение.

### `WeightInTons`

Посадочный вес в метрических тоннах.

```typescript
// brand-type, не constructible напрямую
type WeightInTons = number & { readonly __brand: 'WeightInTons' };

// factory с базовой валидацией (NaN / отрицательные / нечисловые)
function makeWeightInTons(value: number): Result<WeightInTons, WeightError>;

// типы ошибок
type WeightError =
  | { kind: 'NotANumber' }
  | { kind: 'NotFinite' }
  | { kind: 'Negative'; given: number };
```

**Изменение от первоначальной редакции (Sprint 5 prep):** factory
больше не принимает `WeightEnvelope`. Operational-envelope валидация
вынесена в use-case layer (см. `validateOperationalEnvelope` в module
contract Crosswind), а lookup-envelope валидация выполняется самим
алгоритмом по факту того, проходит ли расчёт. Value Object отвечает
только за «это вообще число».

Принципиально: вес **всегда** в тоннах внутри domain. Конвертация в kilolbs (для алгоритма) — детальа реализации в calculator.

### `CGPercentMAC`

Центровка в процентах MAC (Mean Aerodynamic Chord).

```typescript
type CGPercentMAC = number & { readonly __brand: 'CGPercentMAC' };

function makeCGPercentMAC(value: number): Result<CGPercentMAC, CGError>;

type CGError =
  | { kind: 'NotANumber' }
  | { kind: 'NotFinite' };
```

**Изменение от первоначальной редакции (Sprint 5 prep):** factory
больше не принимает `CGEnvelope` и не отвергает значения в физически
осмысленном диапазоне. Operational-envelope валидация (типа `8–35
%MAC`) вынесена в use-case layer.

### `CrosswindKnots`

Значение бокового ветра в узлах. Всегда целое число (округление вниз — правило из Excel-формулы).

```typescript
type CrosswindKnots = number & { readonly __brand: 'CrosswindKnots' };

function makeCrosswindKnots(value: number): Result<CrosswindKnots, CrosswindError>;

type CrosswindError =
  | { kind: 'NotANumber' }
  | { kind: 'Negative'; given: number }
  | { kind: 'AboveDemonstrated'; given: number; demonstrated: number };
```

`CrosswindKnots` ограничен снизу нулём, сверху Boeing demonstrated-значением (40 KT). Любое значение вне этого диапазона — ошибка алгоритма или повреждение данных.

### Внутренние derived-значения

Для алгоритма используется промежуточное значение веса в kilolbs (сотни фунтов / 1000 фунтов). Оно **не Value Object**, а просто промежуточная переменная в чистой функции расчёта. Не утекает наружу из calculator-а.

---

## Entities (enum-подобные типы)

### `AircraftVariant`

```typescript
const AIRCRAFT_VARIANTS = ['b787_8', 'b787_9'] as const;
type AircraftVariant = typeof AIRCRAFT_VARIANTS[number];
```

В MVP активен только `b787_8`. `b787_9` присутствует в типе, но не имеет соответствующего bundled-файла — попытка его выбора в коде вернёт `Result.error`.

### `RunwayCondition`

**Polish-3 expansion** (forward signal, реализация в Polish-3):

```typescript
const RUNWAY_CONDITIONS = [
  'dry',
  'wet',
  'slipperyWet',
  'compactedSnow',
  'drySnow',
  'wetSnow',
] as const;
type RunwayCondition = typeof RUNWAY_CONDITIONS[number];
```

Это 6 явных runway-state кодов из FCOM landing performance таблиц,
заменяющих собой umbrella-значение `'contaminated'` из MVP-редакции
(`['dry', 'wet', 'contaminated']`). Причина расширения: B787 FCOM
оперирует пятью non-dry состояниями явно, сводя `contaminated` в
полезный enum невозможно — каждое состояние имеет свою таблицу
лимитов. Spec-only в этом PR; код, JSON-bundle и UI остаются на
MVP-варианте до Polish-3.

В **MVP** (текущий код) активен только `dry`. После Polish-3 активен
останется только `dry`, остальные 5 — `comingSoon` (см. § "JSON Schema
bundled данных" → "Polish-3 expansion: map-shaped lookup data").

### `RunwayConditionCode` (RWYCC)

ICAO-стандарт. После Polish-3 expansion используется для non-dry
runway-conditions, где FCOM предписывает RWYCC sub-classification
(особенно `slipperyWet`, `compactedSnow`, `drySnow`, `wetSnow`).
В MVP-редакции (до Polish-3) был привязан только к
`RunwayCondition === 'contaminated'`.

```typescript
type RunwayConditionCode = 1 | 2 | 3 | 4 | 5 | 6;
```

В MVP не используется (Dry only). Тип определён заранее, чтобы
Polish-3 (и далее Phase 2) добавлялись без изменения сигнатур.

### `FlightPhase`

```typescript
const FLIGHT_PHASES = ['takeoff', 'landing'] as const;
type FlightPhase = typeof FLIGHT_PHASES[number];
```

В MVP активен только `landing`.

---

## Domain-типы для расчёта Crosswind

Эти типы описывают вход и выход операции «рассчитать crosswind limit».

### Input

```typescript
interface CrosswindCalculationInput {
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
  readonly rwyccCode?: RunwayConditionCode; // non-dry conditions, см. RWYCC выше
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}
```

### Output

```typescript
interface CrosswindCalculationOutput {
  readonly maxCrosswindKnots: CrosswindKnots;
  readonly metadata: CalculationMetadata;
}

interface CalculationMetadata {
  readonly dataVersion: string;             // версия bundled JSON
  readonly referenceDocument: string;       // "Boeing 787 FCOM"
  readonly weightBracket: { lower: number; upper: number }; // диапазон веса в брекете
  readonly cgBracket: { lower: number; upper: number };     // диапазон CG в брекете
  readonly bracketCrosswindRange: { lower: CrosswindKnots; upper: CrosswindKnots };
  readonly calculationStrategy: 'within-bracket' | 'below-envelope' | 'above-envelope';
}
```

### Errors

```typescript
type CrosswindCalculationError =
  | { kind: 'NoLookupData'; reason: 'NaN' | 'NotFinite' | 'OutsideLookupBounds' }
  | { kind: 'DataNotAvailable'; aircraft: AircraftVariant; condition: RunwayCondition }
  | { kind: 'CorruptedDataBundle'; details: string }
  | { kind: 'CalculationFailed'; reason: string };
```

Функция расчёта возвращает `Result<CrosswindCalculationOutput, CrosswindCalculationError>`. Никогда не выбрасывает исключения, никогда не возвращает `null`. **`NoLookupData`** покрывает случаи, когда лукап не может быть выполнен в принципе (NaN/Infinity на входе, или результат расчёта получается `NaN`); это НЕ оperational-envelope нарушение. Operational-envelope нарушения возвращаются отдельной use-case функцией `validateOperationalEnvelope` (см. `module-contracts/crosswind.md` Public API). Поле `kind: 'InvalidInput'` удалено как смешивавшее два уровня валидации.

---

## JSON Schema bundled данных

Bundled-файлы лежат в `src/data/crosswind/`. Каждая комбинация (aircraft, phase, runwayCondition) — отдельный файл. В MVP это один файл: `b787-8-landing-dry.json`.

### Структура файла

```json
{
  "schemaVersion": "1.0.0",
  "dataVersion": "2026-04-29.001",
  "aircraft": "b787_8",
  "phase": "landing",
  "runwayCondition": "dry",
  "operationalEnvelope": {
    "weight": {
      "minTons": 110,
      "maxTons": 172
    },
    "cg": {
      "minPercent": 8,
      "maxPercent": 35
    }
  },
  "weightConversion": {
    "tonsToKilolbsFactor": 2.20462
  },
  "interpolation": {
    "model": "piecewise-linear-excel-equivalent",
    "slope": 0.0576,
    "breakpoints": [
      { "crosswindKnots": 40, "intercept": 6.1 },
      { "crosswindKnots": 35, "intercept": 9.3 },
      { "crosswindKnots": 30, "intercept": 12.8 },
      { "crosswindKnots": 25, "intercept": 16.3 },
      { "crosswindKnots": 20, "intercept": 19.8 }
    ]
  },
  "fallback": {
    "belowEnvelope": "max-crosswind-40",
    "aboveEnvelope": "ifna-fallback-40-match-excel"
  },
  "metadata": {
    "createdAt": "2026-04-29",
    "validatedBy": "active-line-pilots",
    "referenceDocument": "Boeing 787 FCOM",
    "notes": "Conservative advisory limits. Linear approximation per breakpoint band. Matches Excel formula exactly including IFNA fallback behavior."
  }
}
```

### Поля

| Поле | Тип | Назначение |
|------|-----|------------|
| `schemaVersion` | string (semver) | Версия структуры файла. При изменении структуры — major bump |
| `dataVersion` | string (date-based) | Версия конкретного набора значений. Инкрементируется при любом изменении breakpoints или envelope |
| `aircraft` | AircraftVariant | Для какого варианта самолёта данные |
| `phase` | FlightPhase | Для какой фазы полёта |
| `runwayCondition` | RunwayCondition | Для какого состояния ВПП |
| `operationalEnvelope.weight` | { minTons, maxTons } | Регуляторный диапазон веса. Алгоритм этот диапазон не проверяет — проверка делается use-case-функцией `validateOperationalEnvelope` (см. crosswind contract). За границами envelope UI показывает warning chip рядом с числом (см. `06-ui-spec.md` Экран 4) |
| `operationalEnvelope.cg` | { minPercent, maxPercent } | Регуляторный диапазон CG. Те же правила, что для веса |
| `weightConversion.tonsToKilolbsFactor` | number | Коэффициент перевода тонн в kilolbs (2.20462 — стандарт) |
| `interpolation.model` | string enum | Имя алгоритма. Для MVP — `'piecewise-linear-excel-equivalent'`. Другие модели появятся в Phase 2+ |
| `interpolation.slope` | number | Общий наклон линий (одинаковый для всех breakpoints) |
| `interpolation.breakpoints` | array | 5 точек: значение crosswind в KT и intercept (C-коэффициент) |
| `fallback.belowEnvelope` | string enum | Что возвращать, если CG ниже всех breakpoints. MVP: `'max-crosswind-40'` |
| `fallback.aboveEnvelope` | string enum | Что возвращать, если CG выше всех breakpoints. MVP: `'ifna-fallback-40-match-excel'` (особенность Excel-формулы, см. 05-crosswind-algorithm.md) |
| `metadata` | object | Описательная информация для About-экрана и debug |

### Правила инкремента `dataVersion`

- Любое изменение значений `slope`, `breakpoints`, `envelope` → инкремент третьей цифры (`2026-04-29.001` → `2026-04-29.002`).
- Изменение модели интерполяции (`interpolation.model`) → новая дата (`2026-05-15.001`) и major-версия `schemaVersion` (1.0.0 → 2.0.0).
- Любое изменение `metadata` без изменения данных — `dataVersion` НЕ инкрементируется.

`dataVersion` отображается в About-экране приложения. При обновлении приложения с новой версией данных пользователь видит уведомление в первый запуск.

---

## zod-схема валидации

Все JSON-файлы проходят через zod-схему при первом импорте. Схема описывается в `src/features/crosswind/data/schema.ts` и используется в `data/crosswindRepository.ts` при загрузке.

```typescript
import { z } from 'zod';

const aircraftVariantSchema = z.enum(['b787_8', 'b787_9']);
const flightPhaseSchema = z.enum(['takeoff', 'landing']);
// MVP редакция; Polish-3 расширяет до 6-state enum (см. RunwayCondition выше):
const runwayConditionSchema = z.enum(['dry', 'wet', 'contaminated']);

const breakpointSchema = z.object({
  crosswindKnots: z.number().int().min(0).max(50),
  intercept: z.number().finite(),
});

const crosswindDataFileSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  dataVersion: z.string().min(1),
  aircraft: aircraftVariantSchema,
  phase: flightPhaseSchema,
  runwayCondition: runwayConditionSchema,
  operationalEnvelope: z.object({
    weight: z.object({
      minTons: z.number().positive(),
      maxTons: z.number().positive(),
    }),
    cg: z.object({
      minPercent: z.number(),
      maxPercent: z.number(),
    }),
  }),
  weightConversion: z.object({
    tonsToKilolbsFactor: z.number().positive(),
  }),
  interpolation: z.object({
    model: z.literal('piecewise-linear-excel-equivalent'),
    slope: z.number().finite(),
    breakpoints: z.array(breakpointSchema).length(5),
  }),
  fallback: z.object({
    belowEnvelope: z.literal('max-crosswind-40'),
    aboveEnvelope: z.literal('ifna-fallback-40-match-excel'),
  }),
  metadata: z.object({
    createdAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    validatedBy: z.string().min(1),
    referenceDocument: z.string().min(1),
    notes: z.string(),
  }),
});

type CrosswindDataFile = z.infer<typeof crosswindDataFileSchema>;
```

### Дополнительные business-rule валидации

После прохождения структурной zod-валидации репозиторий выполняет дополнительные проверки:

1. `operationalEnvelope.weight.minTons < operationalEnvelope.weight.maxTons` — иначе `CorruptedDataBundle`.
2. `operationalEnvelope.cg.minPercent < operationalEnvelope.cg.maxPercent` — иначе `CorruptedDataBundle`.
3. `breakpoints` отсортированы по убыванию `crosswindKnots` (40, 35, 30, 25, 20) — иначе `CorruptedDataBundle`.
4. `breakpoints` отсортированы по возрастанию `intercept` — иначе `CorruptedDataBundle`.
5. `aircraft`, `phase`, `runwayCondition` соответствуют ожидаемым значениям файла-репозитория (например, `b787-8-landing-dry.json` обязан содержать `aircraft: 'b787_8'`).

---

## JSON Schema · Polish-3 expansion (forward signal)

Polish-3 переключает Crosswind-модуль с одного flat-файла на one-file-
per-aircraft / per-phase, в котором lookup-данные представлены **map-
ой, ключ которой — `RunwayCondition`** (см. § Entities выше). Это
spec-only forward signal: код, JSON-bundle и repository остаются на
MVP-варианте до Polish-3.

Новая структура (один файл на пару aircraft × phase):

```json
{
  "schemaVersion": "2.0.0",
  "dataVersion": "2026-XX-YY.001",
  "aircraft": "b787_8",
  "phase": "landing",
  "operationalEnvelope": { /* как сейчас */ },
  "weightConversion": { /* как сейчас */ },
  "datasets": {
    "dry":           { "interpolation": { … }, "fallback": { … }, "metadata": { … } },
    "wet":           { "status": "comingSoon" },
    "slipperyWet":   { "status": "comingSoon" },
    "compactedSnow": { "status": "comingSoon" },
    "drySnow":       { "status": "comingSoon" },
    "wetSnow":       { "status": "comingSoon" }
  }
}
```

**Дискриминированный формат значений `datasets[k]`:**

```typescript
type DatasetEntry =
  | { status: 'comingSoon' }
  | { interpolation: InterpolationConfig; fallback: FallbackConfig; metadata: DatasetMetadata };
```

**Правила:**

- `datasets` — обязательное поле, содержащее **все 6** ключей из
  `RUNWAY_CONDITIONS` (zod-схема `z.object({ dry: …, wet: …, …
  }).strict()`). Отсутствие ключа = `CorruptedDataBundle`.
- Явный `{ status: 'comingSoon' }` распознаётся UI и алгоритмом как
  «не реализовано», результат — `Result.err({ kind:
  'DataNotAvailable', ..., reason: 'comingSoon' })`. Сегмент в UI
  становится disabled с подсказкой «Available in upcoming release»
  (см. `06-ui-spec.md` § Экран 4).
- Полная запись (без `status`-маркера) даёт обычный lookup-расчёт.
- В Polish-3 заполняется только `dry` (та же таблица что сейчас).
  Остальные 5 — `comingSoon`.

**Обновлённая zod-схема (spec snippet, не код):**

```typescript
const runwayConditionSchema = z.enum([
  'dry', 'wet', 'slipperyWet', 'compactedSnow', 'drySnow', 'wetSnow',
]);

const datasetEntrySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('comingSoon') }),
  z.object({
    status: z.undefined(),  // или omit-вариант
    interpolation: interpolationSchema,
    fallback: fallbackSchema,
    metadata: datasetMetadataSchema,
  }),
]);

const crosswindDataFileSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  dataVersion: z.string().min(1),
  aircraft: aircraftVariantSchema,
  phase: flightPhaseSchema,
  operationalEnvelope: /* как сейчас */,
  weightConversion: /* как сейчас */,
  datasets: z.object({
    dry:           datasetEntrySchema,
    wet:           datasetEntrySchema,
    slipperyWet:   datasetEntrySchema,
    compactedSnow: datasetEntrySchema,
    drySnow:       datasetEntrySchema,
    wetSnow:       datasetEntrySchema,
  }).strict(),
});
```

**Алгоритм-uplift в Polish-3.** `calculateCrosswindLimit` принимает
`runwayCondition` и проверяет `datasets[runwayCondition]`:
- `{ status: 'comingSoon' }` → `Result.err({ kind: 'DataNotAvailable',
  reason: 'comingSoon' })`.
- Полный entry → существующая XLOOKUP-логика на его `interpolation` /
  `fallback`.
Step 0a из `05-crosswind-algorithm.md` дополняется этой проверкой;
отдельные функции / strategy dispatcher не меняются (модель остаётся
`piecewise-linear-excel-equivalent`).

**Версионирование.** Структурный переход (flat → map) — major
schema-bump: `schemaVersion` 1.x → 2.0.0. Старая flat-структура
остаётся валидной только для приложений до Polish-3 (фактически —
заменяется одной MVP-сборкой; OTA не задействован для structural
changes).

---

## Fail-safe при невалидных данных

Если bundled JSON не проходит валидацию — приложение не показывает мусор и не крашится. Поведение:

1. На splash-экране (или там, где данные впервые загружаются) показывается экран ошибки: «Reference data unavailable. Please contact support and reinstall.»
2. Контактный email из About — кликабельная ссылка.
3. Кнопка «Retry» — пробует заново загрузить (на случай transient-ошибки).
4. Crash-репорт через нативный Apple crash reporting содержит причину (через осознанный `assertionFailure` в production).

Этот fail-safe режим — отдельный экран, дизайн которого описан в `06-ui-spec.md`.

---

## Маппинг между layers

Сейчас структура bundled JSON и domain-модели **совпадают** (одно поле в одно поле). Поэтому маппер не нужен — мы напрямую используем zod-инфер типы как domain.

**Триггер для появления маппера** (см. 02-architecture.md): если структура data расходится с domain (например, в JSON хранятся kilolbs, а domain работает в тоннах) — появляется явный mapper в `data/`.

---

## Open questions

1. Точное значение `envelope.weight.minTons` для B787-8 (OEW). Зафиксировано предварительно как 110 t, на этапе Phase B уточняется по 787 ACAP.
2. Значения `envelope.cg.minPercent` и `maxPercent`. Предварительно 8% и 35%. Уточняются на Phase B.
3. Нужно ли в metadata добавить поле `localizedNotes` для отображения по-русски и по-английски? Сейчас `notes` — единая строка. Решение: пока единая English, RU-отображение в About — через статический i18n ключ, не через JSON.

---

## Exit-критерии этого документа

- [ ] Разработчик согласен с branded-type подходом для Value Objects.
- [ ] Структура JSON-схемы понятна и не вызывает возражений.
- [ ] Названия полей (`schemaVersion`, `dataVersion`, `interpolation.model` и т.д.) кажутся подходящими.
- [ ] Стратегия fail-safe при невалидных данных одобрена.
- [ ] Open questions либо закрыты, либо явно отложены на Phase B.
