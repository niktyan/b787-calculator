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

## Value Objects

Value Object — это immutable объект, представляющий значение с физическим смыслом. Создаётся через factory-функцию, которая валидирует входное значение.

### `WeightInTons`

Посадочный вес в метрических тоннах.

```typescript
// brand-type, не constructible напрямую
type WeightInTons = number & { readonly __brand: 'WeightInTons' };

interface WeightEnvelope {
  readonly minTons: number; // OEW нижняя граница
  readonly maxTons: number; // MLW верхняя граница
}

// factory с валидацией
function makeWeightInTons(value: number, envelope: WeightEnvelope): Result<WeightInTons, WeightError>;

// типы ошибок
type WeightError =
  | { kind: 'NotANumber' }
  | { kind: 'BelowMinimum'; min: number; given: number }
  | { kind: 'AboveMaximum'; max: number; given: number };
```

Принципиально: вес **всегда** в тоннах внутри domain. Конвертация в kilolbs (для алгоритма) — детальа реализации в calculator.

### `CGPercentMAC`

Центровка в процентах MAC (Mean Aerodynamic Chord).

```typescript
type CGPercentMAC = number & { readonly __brand: 'CGPercentMAC' };

interface CGEnvelope {
  readonly minPercent: number; // forward CG limit
  readonly maxPercent: number; // aft CG limit
}

function makeCGPercentMAC(value: number, envelope: CGEnvelope): Result<CGPercentMAC, CGError>;

type CGError =
  | { kind: 'NotANumber' }
  | { kind: 'BelowMinimum'; min: number; given: number }
  | { kind: 'AboveMaximum'; max: number; given: number };
```

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

```typescript
const RUNWAY_CONDITIONS = ['dry', 'wet', 'contaminated'] as const;
type RunwayCondition = typeof RUNWAY_CONDITIONS[number];
```

В MVP активен только `dry`. `wet` и `contaminated` появятся в Phase 2.

### `RunwayConditionCode` (RWYCC)

ICAO-стандарт. Используется только при `RunwayCondition === 'contaminated'`.

```typescript
type RunwayConditionCode = 1 | 2 | 3 | 4 | 5 | 6;
```

В MVP не используется (Dry only). Тип определён заранее, чтобы Phase 2 добавлялась без изменения сигнатур.

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
  readonly rwyccCode?: RunwayConditionCode; // только если runwayCondition === 'contaminated'
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
  | { kind: 'InvalidInput'; field: string; reason: string }
  | { kind: 'DataNotAvailable'; aircraft: AircraftVariant; condition: RunwayCondition }
  | { kind: 'CorruptedDataBundle'; details: string }
  | { kind: 'CalculationFailed'; reason: string };
```

Функция расчёта возвращает `Result<CrosswindCalculationOutput, CrosswindCalculationError>`. Никогда не выбрасывает исключения, никогда не возвращает `null`.

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
  "envelope": {
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
| `envelope.weight` | { minTons, maxTons } | Допустимый диапазон веса (вне него — Calculator возвращает error «out of envelope») |
| `envelope.cg` | { minPercent, maxPercent } | Допустимый диапазон CG |
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
  envelope: z.object({
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

1. `envelope.weight.minTons < envelope.weight.maxTons` — иначе `CorruptedDataBundle`.
2. `envelope.cg.minPercent < envelope.cg.maxPercent` — иначе `CorruptedDataBundle`.
3. `breakpoints` отсортированы по убыванию `crosswindKnots` (40, 35, 30, 25, 20) — иначе `CorruptedDataBundle`.
4. `breakpoints` отсортированы по возрастанию `intercept` — иначе `CorruptedDataBundle`.
5. `aircraft`, `phase`, `runwayCondition` соответствуют ожидаемым значениям файла-репозитория (например, `b787-8-landing-dry.json` обязан содержать `aircraft: 'b787_8'`).

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
