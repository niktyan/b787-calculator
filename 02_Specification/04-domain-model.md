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

The set of `(weightTons, cgPercent)` pairs that fall within the
FCOM / Type-Certificate operational limits of the selected aircraft.
Since Sprint B / ADR-0013 the envelope is **per-aircraft** — each
variant in the bundled file carries its own bounds because B787-8 and
B787-9 differ in both axes:

- B787-8: weight `[104.1, 227.93]` t, CG `[6, 39.5]` %MAC.
- B787-9: weight `[110.677, 259.228]` t, CG `[8, 37.5]` %MAC.

Prior to PR `fix/envelope-bounds-and-menu-order` (2026-05-19) the
B787-8 bounds were estimated conservatively as `[110, 172]` / `[8, 35]`
for MVP scoping; the FCOM-certified envelope is wider in all four
directions. Prior to Sprint B / ADR-0013 the envelope lived at the top
level of `b787-takeoff.json` (a single shared object) — moved into
`byAircraft.<variant>.operationalEnvelope` so each ВС carries its own
safety bounds without a union-envelope safety risk.

The view-model resolves the envelope per the currently selected
aircraft (`resolveOperationalEnvelope(data, inputs.aircraft)`). When
the bundled file does not ship an entry for the requested variant the
view-model surfaces `data-not-available` — same signal the algorithm
raises via `resolveStrategy`.

Validation against the operational envelope happens in the **use case
layer** (presentation) via two independent validators — see
"Independent weight + cg validation" below. The algorithm itself does
NOT know about the operational envelope.

### Independent weight + cg validation

Operational-envelope validation runs as **two independent flows** —
`validateWeightEnvelope` and `validateCGEnvelope` — not as one combined
function. This lets the UI surface BOTH violations simultaneously: a
pilot who enters 300 t (above MTOW) AND 50 %MAC (above max CG) sees
both errors at once, not just the weight error.

Before PR `fix/independent-envelope-validators` (2026-05-23) a single
`validateOperationalEnvelope` used an early-return chain across the
four checks and returned only the first violation; the second axis was
hidden from the user until the first was corrected (user-testing bug
#2). After PR A2 each axis has its own validator:

- `validateWeightEnvelope(input, envelope.weight): Result<void, WeightViolation>`
- `validateCGEnvelope(input, envelope.cg): Result<void, CGViolation>`

The union alias `EnvelopeViolation = WeightViolation | CGViolation` is
preserved as a generic "any envelope violation" type for consumers
that need it. (The result-panel warning chip that previously consumed
this alias was removed in ADR-0012 — see Composition rule below; the
alias itself remains in the public API for forward compatibility.)

**Per-field timing is independent of the other field's state.** The
weight envelope is validated as soon as `weightText` is parseable into
a Value Object, regardless of whether `cgText` is empty / invalid /
valid (and vice versa). Field-level errors surface immediately on the
field that produced them. Result-panel calculation
(`calculateCrosswindLimit`) runs only when **both** fields parse
successfully into Value Objects — partial input keeps the result panel
in `empty` while per-field errors remain visible. See `06-ui-spec.md`
§ Экран 4 → "Per-field validation timing" and the integration test
matrix in `src/__tests__/app/crosswind.per-field-timing.test.tsx`.

### Composition rule for UI

Per ADR-0012, the result panel never shows a number when inputs are
outside the operational envelope. Composition collapses to three
cases:

- Inside lookup AND both inside operational → result panel shows
  `idle` with the value.
- Inside lookup AND at least one axis outside operational → result
  panel shows `out-of-envelope` with the localized reason "Out of
  operational envelope — adjust inputs". **No number is rendered.**
  Per-field errors under TOW / CG inputs continue to surface the
  specific axis violations (e.g., "Above maximum 227.93 t").
  Calculator is **skipped** — not just hidden — when an envelope
  violation is detected.
- Outside lookup (algorithm returns `NoLookupData`) → result panel
  shows `out-of-envelope` with explanatory message; no number.

Both operational-envelope and lookup-envelope violations render the
same caption-style panel — different reason strings, identical visual
treatment. This is intentional (см. ADR-0012 § Consequences) for UX
consistency: пилот видит один и тот же визуальный паттерн "no result"
независимо от природы нарушения.

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
вынесена в use-case layer (см. `validateWeightEnvelope` в module
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
%MAC`) вынесена в use-case layer (см. `validateCGEnvelope`).

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

### `Aircraft` / `AircraftVariant`

```typescript
const AIRCRAFT_VARIANTS = ['b787_8', 'b787_9'] as const;
type AircraftVariant = typeof AIRCRAFT_VARIANTS[number];
type Aircraft = AircraftVariant; // public alias
```

Aircraft — **полноправная dimension в lookup-таблице**: bundled JSON
ключует данные по `(aircraft, runwayCondition)` (см. § "JSON Schema"
ниже). После Sprint B / ADR-0013 заполнены **оба** варианта (`b787_8`
и `b787_9`) с собственными `operationalEnvelope` и полным покрытием
6/6 RWYCC. Если в будущем будет добавлен ещё один variant entry, для
которого `byAircraft.<variant>` ещё не shipped — выбор такого варианта
даст `DataNotAvailable.reason: 'aircraft-not-implemented'`.

**Location (Sprint C / ADR-0014).** `AircraftVariant`,
`AIRCRAFT_VARIANTS`, `FlightPhase`, `FLIGHT_PHASES`, `RunwayCondition`,
`RUNWAY_CONDITIONS`, `RunwayConditionCode` и `RWYCC` живут в
`src/core/aviation/types.ts`. Оба feature-модуля (`crosswind` для
takeoff и `crosswind-landing`) импортируют их через core. Модуль
`features/crosswind/domain/types.ts` re-export'ит те же имена для
обратной совместимости с существующими call sites.

### `RunwayCondition` — RWYCC scale (6 значений)

```typescript
const RUNWAY_CONDITIONS = [
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
] as const;
type RunwayCondition = typeof RUNWAY_CONDITIONS[number];
```

Это шесть значений ICAO RWYCC scale, в порядке убывания качества
ВПП (`dry` — лучшее, `poor` — худшее). Каждое значение имеет
собственный набор breakpoints в bundled JSON; UI рендерит их
шестью сегментами segmented control (single-row на iPad-regular,
2 ряда по 3 на compact). **После PR 7 все шесть значений
активны** (Dry, Good, MediumToGood, Medium, MediumToPoor, Poor) —
полное покрытие RWYCC 6/5/4/3/2/1 для B787-8. RWYCC 0
(TAKE OFF NOT ALLOWED) — intentional non-implementation: см.
`05-crosswind-algorithm.md` § "Open questions" #3.

### `RunwayConditionCode` (RWYCC) и numeric mapping

ICAO-стандарт. Каждое значение `RunwayCondition` маппится на один
RWYCC numeric code:

```typescript
type RunwayConditionCode = 1 | 2 | 3 | 4 | 5 | 6;

const RWYCC: Record<RunwayCondition, RunwayConditionCode> = {
  dry:          6,
  good:         5,
  mediumToGood: 4,
  medium:       3,
  mediumToPoor: 2,
  poor:         1,
};
```

Сейчас RWYCC numeric не используется в UI (display ограничивается
английскими лейблами «Dry» / «Good» / …) и не выходит наружу из
domain. Константа существует как явный мост между string-enum и
ICAO-номером для будущих чек-листов / экспортов.

### `FlightPhase`

```typescript
const FLIGHT_PHASES = ['takeoff', 'landing'] as const;
type FlightPhase = typeof FLIGHT_PHASES[number];
```

После Sprint C / ADR-0014 активны **оба** значения. Каждое значение
шипается со своим bundled JSON: `features/crosswind/data/b787-takeoff.json`
(Takeoff, schemaVersion 2.3.x) и
`features/crosswind-landing/data/b787-landing.json` (Landing,
schemaVersion 1.0.x). Main Menu рендерит две активные карточки —
Takeoff (`/crosswind`) и Landing (`/crosswind-landing`).

---

## Domain-типы для расчёта Crosswind

Эти типы описывают вход и выход операции «рассчитать crosswind limit».

### Input

```typescript
interface CrosswindCalculationInput {
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
  readonly rwyccCode?: RunwayConditionCode;
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}

// Spec-named alias for the takeoff-phase input. Identical shape; the
// alias documents intent at use-sites in the takeoff feature.
type CrosswindTakeoffInput = CrosswindCalculationInput;
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
  readonly aircraft: AircraftVariant;       // selected aircraft (traceability)
  readonly weightBracket: { lower: number; upper: number }; // диапазон веса в брекете
  readonly cgBracket: { lower: number; upper: number };     // диапазон CG в брекете
  readonly bracketCrosswindRange: { lower: CrosswindKnots; upper: CrosswindKnots };
  readonly calculationStrategy: 'within-bracket' | 'below-envelope' | 'above-envelope';
}
```

### Errors

```typescript
type DataUnavailableReason =
  | 'aircraft-not-implemented'   // input.aircraft has no entry in byAircraft
  | 'condition-not-implemented'  // aircraft is present but condition slot empty
  | 'phase-mismatch';            // input.phase ≠ data.phase

type CrosswindCalculationError =
  | { kind: 'NoLookupData'; reason: 'NaN' | 'NotFinite' | 'OutsideLookupBounds' }
  | {
      kind: 'DataNotAvailable';
      aircraft: AircraftVariant;
      condition: RunwayCondition;
      reason: DataUnavailableReason;
    }
  | { kind: 'CorruptedDataBundle'; details: string }
  | { kind: 'CalculationFailed'; reason: string };
```

Функция расчёта возвращает `Result<CrosswindCalculationOutput,
CrosswindCalculationError>`. Никогда не выбрасывает исключения,
никогда не возвращает `null`.

- **`NoLookupData`** — лукап не может быть выполнен в принципе
  (NaN/Infinity на входе, или результат расчёта получается `NaN`).
  Это НЕ operational-envelope нарушение.
- **`DataNotAvailable`** — bundled JSON не содержит данных для этой
  пары `(aircraft, condition)` или для этой phase. Поле `reason`
  различает три причины — UI рендерит их единым «No data
  available …»-капшеном с условно подставленным контекстом
  (см. `06-ui-spec.md` § Экран 4 → result panel states).

Operational-envelope нарушения возвращаются двумя независимыми use-case
функциями `validateWeightEnvelope` / `validateCGEnvelope` (см.
`module-contracts/crosswind.md` Public API и § "Independent weight + cg
validation" выше).

---

## Landing types (Sprint C / ADR-0014)

Crosswind Landing использует **categorical** модель — никаких Value
Objects (нет weight/CG), никаких branded типов. Все шесть входов —
строковые literal-unions из небольшого алфавита.

```typescript
const LANDING_MODES = ['manual', 'auto'] as const;
type LandingMode = typeof LANDING_MODES[number];

const YES_NO_VALUES = ['no', 'yes'] as const;
type YesNo = typeof YES_NO_VALUES[number];

interface CrosswindLandingInput {
  readonly aircraft: AircraftVariant;          // из core/aviation
  readonly runwayCondition: RunwayCondition;   // из core/aviation
  readonly landingMode: LandingMode;
  readonly asymReverse: YesNo;
  readonly catIIIII: YesNo;        // CAT II-III approach
  readonly engineInop: YesNo;      // ONE ENG INOP
}

interface CrosswindLandingAppliedAdjustments {
  readonly catCap: boolean;
  readonly asymPenalty: boolean;
  readonly inopCap: boolean;
}

interface CrosswindLandingMetadata {
  readonly dataVersion: string;
  readonly referenceDocument: string;
  readonly aircraft: AircraftVariant;
  readonly landingMode: LandingMode;
  readonly appliedAdjustments: CrosswindLandingAppliedAdjustments;
}

interface CrosswindLandingOutput {
  readonly maxCrosswindKnots: number;  // always integer per FCOM
  readonly metadata: CrosswindLandingMetadata;
}

type CrosswindLandingDataUnavailableReason =
  | 'aircraft-not-implemented'
  | 'condition-not-implemented'
  | 'mode-not-implemented';

type CrosswindLandingError =
  | {
      kind: 'DataNotAvailable';
      aircraft: AircraftVariant;
      runwayCondition: RunwayCondition;
      reason: CrosswindLandingDataUnavailableReason;
    }
  | { kind: 'CorruptedDataBundle'; details: string };
```

Pure-function entry-point:

```typescript
function calculateLandingCrosswind(
  input: CrosswindLandingInput,
  data: CrosswindLandingDataFile,
): Result<CrosswindLandingOutput, CrosswindLandingError>;
```

`maxCrosswindKnots` остаётся обычным `number`, **не** branded — landing
не делит Value Object с takeoff'ом. Demonstrated-bound check (40 KT)
не применяется на landing: верхняя граница base table — 37 KT (B787-8
Dry Manual), что ниже demonstrated bound для landing-фазы.

### Landing JSON schema (schemaVersion 1.0.x)

```jsonc
{
  "schemaVersion": "1.0.0",
  "dataVersion":   "2026-05-23.001",
  "phase":         "landing",
  "adjustments": {
    "catIIIIICap":         25,   // hard cap for Autoland in CAT II-III, KT
    "asymReversePenalty":  5     // KT subtracted when asym reverse on non-dry RWY
  },
  "byAircraft": {
    "b787_8": {
      "engineInopAutolandLimit": 28,
      "baseTable": {
        "dry":          { "manual": 37, "auto": 33 },
        "good":         { "manual": 35, "auto": 33 },
        "mediumToGood": { "manual": 35, "auto": 33 },
        "medium":       { "manual": 35, "auto": 33 },
        "mediumToPoor": { "manual": 20, "auto": 20 },
        "poor":         { "manual": 17, "auto": 17 }
      },
      "metadata": { /* createdAt, validatedBy, referenceDocument, notes */ }
    },
    "b787_9": { /* same shape; differs in engineInopAutolandLimit = 37 and baseTable values */ }
  }
}
```

Структурные отличия от takeoff JSON (schema 2.3.x):

- Один phase per file (`phase: 'landing'`).
- Нет `weightConversion` (categorical algorithm не работает с фунтами).
- Нет `operationalEnvelope` per aircraft (нет weight/CG входов
  для валидации).
- Нет strategy-discriminated dataset — только integer lookup matrix +
  per-aircraft `engineInopAutolandLimit` + file-level
  `adjustments.catIIIIICap` / `adjustments.asymReversePenalty`.
- `baseTable` keys строгий, оба aircraft entries обязательны (zod
  `.strict()`).

zod-схема и business-rule walker — `src/features/crosswind-landing/data/schema.ts`.
Business-rules: `engineInopAutolandLimit > 0`, `catIIIIICap > 0`,
`asymReversePenalty > 0`, phase matches `expectedPhase` контекста.

---

## Recent calculation entries (Sprint D / ADR-0016)

Recent Calculations хранит локальную историю последних 20 расчётов в
едином AsyncStorage-ключе. Типы живут в `src/core/recent-storage/types.ts`
и публичны через `core` barrel — оба crosswind-модуля пишут через
`saveRecent`, Recent screen читает через `loadRecent` / `findRecentById`.

**Discriminated union** `RecentEntry` по `module: 'takeoff' | 'landing'`:

```typescript
interface RecentEntryBase {
  readonly id: string;          // `${Date.now()}-${base36(random)}`
  readonly timestamp: string;   // ISO UTC
  readonly result: number;      // maxCrosswindKnots (integer ≥ 0)
  readonly fingerprint: string; // canonical JSON of {module, inputs}
}

interface RecentTakeoffEntry extends RecentEntryBase {
  readonly module: 'takeoff';
  readonly inputs: {
    readonly aircraft: AircraftVariant;
    readonly weightTons: number;
    readonly cgPercent: number;
    readonly runwayCondition: RunwayCondition;
  };
}

interface RecentLandingEntry extends RecentEntryBase {
  readonly module: 'landing';
  readonly inputs: {
    readonly aircraft: AircraftVariant;
    readonly runwayCondition: RunwayCondition;
    readonly landingMode: LandingMode;
    readonly asymReverse: YesNo;
    readonly catIIIII: YesNo;
    readonly engineInop: YesNo;
  };
}
```

Storage payload — `{ schemaVersion: 1, entries: RecentEntry[] }`,
валидируется zod-схемой при каждом чтении. Schema mismatch / corrupted
JSON / AsyncStorage exception → пустой список + лог через `core/logger`
(fail-safe). `fingerprint` — canonical JSON со словарным порядком ключей
inputs (исключает зависимость от порядка вставки в call site).

**Дедупликация.** При `saveRecent`, существующий entry с тем же
fingerprint удаляется, новый вставляется в head с свежим timestamp.
**FIFO cap 20** — `slice(0, RECENT_MAX_ENTRIES)` после insert.

**Restoration.** Тап entry в Recent screen → `router.push({ pathname,
params: { recentEntryId } })`. Калькулятор экран читает `recentEntryId`
через `useLocalSearchParams`, вызывает `findRecentById(id)`. Если
entry существует и его `module` совпадает с целевым экраном — setters
вызываются для prefill state. Cross-module id или несуществующий id —
no-op (screen остаётся в default state).

---

## Strategy variants (`StrategyType`)

Алгоритм crosswind — strategy-dispatched: каждый dataset в bundled JSON
явно указывает `strategyType` дискриминатор, и для каждого литерала есть
своя чистая функция расчёта. В PR 1 активна одна стратегия
(`bracketedLinear`), в PR 5 — вторая (`variableSlopeBracketed`).
Оставшиеся три литерала зарезервированы для PR 6/7/8 как type-only stubs:

| `StrategyType` | RWYCC | Назначение | Статус |
|----------------|-------|-----------|--------|
| `bracketedLinear` | 6 (Dry), 5 (Good), 4 (MediumToGood) | Excel-equivalent piecewise-linear. Один общий `slope`, ≥ 2 brackets, optional `maxCap` / `decimals`. | **Active** (PR 1/3/4) |
| `variableSlopeBracketed` | 3 (Medium) | Тот же piecewise подход, но **per-bracket slope**. Excel-faithful conditional interpolation (`/E9` when `E9 ≥ 1`, else `·E9`). | **Active** (PR 5) |
| `cgOnlyPiecewise` | 2 (MediumToPoor) | Plateau-then-linear-decreasing в CG. Single conditional formula. **Weight-independent**. No brackets, no XLOOKUP, no IFNA. | **Active** (PR 6) |
| `constant` | 1 (Poor) | Одно константное значение независимо от любого input. **Simplest strategy** в модуле. | **Active** (PR 7) |
| `notAllowed` | 0 | Полёт запрещён — intentional non-implementation per PR 7 user decision. См. `05-crosswind-algorithm.md` § Open questions #3. | Intentional stub |

`VariableSlopeBracketedParams` interface (активирована в PR 5):

```typescript
interface VariableSlopeBracketedParams {
  readonly brackets: readonly {
    readonly crosswindKnots: number;
    readonly slope: number;     // per-bracket; non-zero per integrity check
    readonly intercept: number;
  }[];
  readonly maxCap: number | null;
  readonly decimals: 0 | 1;
}
```

`CGOnlyPiecewiseParams` interface (активирована в PR 6 — **shape
redefined** from PR 1 speculative `points[]` stub):

```typescript
interface CGOnlyPiecewiseParams {
  readonly plateauValue: number;   // KT at-or-below cgThreshold (15 for MediumToPoor)
  readonly cgThreshold: number;    // %MAC at which decrease begins (30)
  readonly slopeDivisor: number;   // %MAC per KT decrease above threshold (1.9)
  readonly decimals: 0 | 1;
  // No maxCap — formula self-caps at plateauValue.
}
```

Stub shape redefinition was safe: PR 1's `points[]` shape was
speculative, never validated by zod (`futureNeverParamsSchema` rejected
it), and had no consumers. PR 6 replaced it with the actual Excel-
formula shape.

`ConstantParams` interface (активирована в PR 7 — PR 1 stub was
already minimal, promoted in-place):

```typescript
interface ConstantParams {
  readonly value: number; // KT — Poor ships value=10
}
```

`NotAllowedParams` stub (`Record<string, never>`) живёт в
`src/features/crosswind/domain/strategy.ts` для exhaustiveness
discriminated union'а. zod-схема rejects любой `params` на этом
дискриминаторе — to-be-implemented status is "intentional
non-implementation" per PR 7 user decision (см.
`05-crosswind-algorithm.md` § Open questions #3).

`StrategyResolution` — результат `resolveStrategy(aircraft, condition,
data)`: либо `{ kind: 'strategy', strategy: CrosswindStrategy }`, либо
`{ kind: 'no-lookup-data', reason: 'aircraft-not-implemented' |
'condition-not-implemented' }`. Top-level calculator конвертирует
`no-lookup-data` в `CrosswindCalculationError.DataNotAvailable` с тем же
`reason`.

---

## JSON Schema bundled данных

Bundled-файл — **один на phase**, ключующий lookup-данные по
`(aircraft, runwayCondition)`. В MVP файл — `b787-takeoff.json`,
содержит `byAircraft.b787_8.{dry, good, mediumToGood, medium,
mediumToPoor, poor}` — **все 6 RWYCC после PR 7**.

### Структура файла (schemaVersion 2.3.0 — per-aircraft envelope, Sprint B / ADR-0013)

`schemaVersion` history:

- `2.0.0` — takeoff rebrand (Block 2): per-phase file, `byAircraft[
  aircraft][runwayCondition]` lookup keys.
- `2.1.0` (PR 1) — strategy refactor: `strategyType` discriminator +
  `params` shape per strategy.
- `2.2.0` (PR 3) — Level-2 evolution: relaxation `brackets.length(5) →
  min(2)`. Структурно совместимо с предыдущим 2.1.0.
- `2.3.0` (Sprint B / ADR-0013): `operationalEnvelope` moves from
  top-level to per-aircraft (`byAircraft.<variant>.operationalEnvelope`).
  Each FCOM-certified variant carries its own bounds; top-level union
  envelope would have created a safety risk for the lower-MTOW variant.
  Schema-version regex tightened to `^2\.3\.\d+$` so legacy 2.2.x files
  fail loudly at parse-time.

```json
{
  "schemaVersion": "2.3.0",
  "dataVersion": "2026-05-23.002",
  "phase": "takeoff",
  "weightConversion": {
    "tonsToKilolbsFactor": 2.20462
  },
  "byAircraft": {
    "b787_8": {
      "operationalEnvelope": {
        "weight": { "minTons": 104.1, "maxTons": 227.93 },
        "cg":     { "minPercent": 6,  "maxPercent": 39.5 }
      },
      "dry": {
        "strategyType": "bracketedLinear",
        "params": {
          "brackets": [
            { "crosswindKnots": 40, "intercept": 6.1 },
            { "crosswindKnots": 35, "intercept": 9.3 },
            { "crosswindKnots": 30, "intercept": 12.8 },
            { "crosswindKnots": 25, "intercept": 16.3 },
            { "crosswindKnots": 20, "intercept": 19.8 }
          ],
          "slope": 0.0576,
          "maxCap": 37,
          "decimals": 0
        },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "Conservative advisory limits. Linear approximation per breakpoint band. Matches Excel formula exactly including IFNA fallback behavior."
        }
      },
      "good": {
        "strategyType": "bracketedLinear",
        "params": {
          "brackets": [
            { "crosswindKnots": 40, "intercept": 2 },
            { "crosswindKnots": 35, "intercept": 6 },
            { "crosswindKnots": 30, "intercept": 10 },
            { "crosswindKnots": 25, "intercept": 14 },
            { "crosswindKnots": 20, "intercept": 18 },
            { "crosswindKnots": 15, "intercept": 22 }
          ],
          "slope": 0.06,
          "maxCap": 37,
          "decimals": 0
        },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "RWYCC 5 (Good) advisory limits. 6-bracket bracketedLinear with added crosswindKnots=15 endpoint. Shares maxCap=37 with Dry per FCOM Tab 2.29.2a."
        }
      },
      "mediumToGood": {
        "strategyType": "bracketedLinear",
        "params": {
          "brackets": [
            { "crosswindKnots": 35, "intercept": 2.2 },
            { "crosswindKnots": 30, "intercept": 7.2 },
            { "crosswindKnots": 25, "intercept": 12.2 },
            { "crosswindKnots": 20, "intercept": 17.2 },
            { "crosswindKnots": 15, "intercept": 22.2 },
            { "crosswindKnots": 10, "intercept": 27.2 }
          ],
          "slope": 0.0436,
          "maxCap": null,
          "decimals": 0
        },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "RWYCC 4 (MediumToGood) advisory limits per Excel 'Medium to Good 788' sheet. Bracket labels shifted down (max 35, min 10), slope 0.0436. maxCap=null — first non-capped condition; Excel sheet has no G8 clamp."
        }
      },
      "medium": {
        "strategyType": "variableSlopeBracketed",
        "params": {
          "brackets": [
            { "crosswindKnots": 25, "slope": 0.032, "intercept": 5.1 },
            { "crosswindKnots": 20, "slope": 0.0384, "intercept": 11.9 },
            { "crosswindKnots": 15, "slope": 0.0388, "intercept": 21.8 },
            { "crosswindKnots": 10, "slope": 0.044, "intercept": 29.8 }
          ],
          "maxCap": null,
          "decimals": 1
        },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "RWYCC 3 (Medium) advisory limits per Excel 'Medium 788' sheet. First condition backed by variableSlopeBracketedStrategy — each bracket has its own slope. First condition with decimals=1 (sub-integer precision); UI displays 23.9 not 23."
        }
      },
      "mediumToPoor": {
        "strategyType": "cgOnlyPiecewise",
        "params": {
          "plateauValue": 15,
          "cgThreshold": 30,
          "slopeDivisor": 1.9,
          "decimals": 1
        },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "RWYCC 2 (Medium to Poor) advisory limits per Excel 'Medium to Poor 788' sheet. First condition backed by cgOnlyPiecewiseStrategy — single conditional, NO weight dependency. Plateau 15 KT for CG ≤ 30; linear decrease 1 KT per 1.9 %MAC above threshold."
        }
      },
      "poor": {
        "strategyType": "constant",
        "params": { "value": 10 },
        "metadata": {
          "createdAt": "2026-05-19",
          "validatedBy": "active-line-pilots",
          "referenceDocument": "Boeing 787 FCOM",
          "notes": "RWYCC 1 (Poor) advisory limit per Excel 'Poor 788' sheet G7 (literal value 10). First condition backed by constantStrategy — output is a single constant regardless of any input. Conservative simplification of FCOM RWYCC 1 row (alternating 15/10) per Q5 user decision."
        }
      }
    },
    "b787_9": {
      "operationalEnvelope": {
        "weight": { "minTons": 110.677, "maxTons": 259.228 },
        "cg":     { "minPercent": 8,    "maxPercent": 37.5 }
      },
      "dry":          { "strategyType": "variableSlopeBracketed", "params": { /* per-bracket slope */ }, "metadata": { /* ... */ } },
      "good":         { /* variableSlopeBracketed, maxCap 37 */ },
      "mediumToGood": { /* variableSlopeBracketed, maxCap null */ },
      "medium":       { /* variableSlopeBracketed, decimals 1 */ },
      "mediumToPoor": { "strategyType": "cgOnlyPiecewise", "params": { "plateauValue": 15, "cgThreshold": 30, "slopeDivisor": 1.5, "decimals": 1 }, "metadata": { /* ... */ } },
      "poor":         { "strategyType": "constant", "params": { "value": 10 }, "metadata": { /* ... */ } }
    }
  }
}
```

### Поля

| Поле | Тип | Назначение |
|------|-----|------------|
| `schemaVersion` | string (semver) | Версия структуры файла. `2.0.0` — takeoff rebrand (Block 2); `2.1.0` — strategy refactor (PR 1); `2.2.0` — variable bracket count (PR 3, `brackets.length(5)` → `.min(2)`); `2.3.0` — per-aircraft `operationalEnvelope` (Sprint B / ADR-0013). regex tightened to `^2\.3\.\d+$` so legacy files fail loudly. |
| `dataVersion` | string (date-based) | Версия конкретного набора значений. Инкрементируется при любом изменении brackets/params или envelope. |
| `phase` | FlightPhase | Phase, к которой относится файл. MVP: `takeoff`. |
| `weightConversion.tonsToKilolbsFactor` | number | Коэффициент перевода тонн в kilolbs (2.20462 — стандарт). |
| `byAircraft` | object | **Lookup-сетка**: ключи `b787_8` / `b787_9`, значения — `AircraftEntry`. Отсутствие ключа → `DataNotAvailable.reason: 'aircraft-not-implemented'`. zod применяет `.strict()` — неизвестные ключи (например `b777_300`) валятся как `CorruptedDataBundle`. |
| `byAircraft.<aircraft>` | object (`AircraftEntry`) | `operationalEnvelope` (required) + опциональные ключи на каждое значение `RunwayCondition` (6 RWYCC). Отсутствие condition-ключа → `DataNotAvailable.reason: 'condition-not-implemented'`. |
| `byAircraft.<aircraft>.operationalEnvelope.weight` | { minTons, maxTons } | Регуляторный диапазон веса для конкретного ВС (FCOM / Type Certificate). Resolved per active aircraft через `resolveOperationalEnvelope(data, inputs.aircraft)`. Алгоритм envelope не проверяет — проверка делается use-case-функцией `validateWeightEnvelope` (см. crosswind contract). За границами envelope UI показывает field error и result-panel переходит в out-of-envelope. |
| `byAircraft.<aircraft>.operationalEnvelope.cg` | { minPercent, maxPercent } | Регуляторный диапазон CG для конкретного ВС. Use-case-функция `validateCGEnvelope`; те же правила, что для веса. Weight и CG проверяются независимо, обе ошибки могут отображаться одновременно. |
| `byAircraft.<aircraft>.<condition>.strategyType` | `StrategyType` | Discriminator: одна из 5 strategy variants. После PR 7 активны 4: `'bracketedLinear'` (Dry/Good/MediumToGood), `'variableSlopeBracketed'` (Medium), `'cgOnlyPiecewise'` (MediumToPoor) и `'constant'` (Poor). `'notAllowed'` — intentional non-implementation, schema отклоняет любой params на этом дискриминаторе. |
| `byAircraft.<aircraft>.<condition>.params` | object | Содержимое зависит от `strategyType`. Для `bracketedLinear`: `{ brackets[≥2] (crosswindKnots+intercept), slope, maxCap, decimals }`. Для `variableSlopeBracketed`: `{ brackets[≥2] (crosswindKnots+slope+intercept), maxCap, decimals }` — slope per bracket. Для `cgOnlyPiecewise`: `{ plateauValue, cgThreshold, slopeDivisor, decimals }` — no brackets, no maxCap. Для `constant`: `{ value }` — single positive number. |
| `byAircraft.<aircraft>.<condition>.params.brackets[]` | `{ crosswindKnots, intercept }` для bracketedLinear; `{ crosswindKnots, slope, intercept }` для variableSlopeBracketed | ≥ 2 брекета, отсортированы по убыванию `crosswindKnots`. Дополнительно: intercept ascending; для variableSlope каждый slope ≠ 0. Примеры: Dry [40,35,30,25,20] · Good [40,35,30,25,20,15] · MediumToGood [35,30,25,20,15,10] · Medium [25,20,15,10]. |
| `byAircraft.<aircraft>.<condition>.params.slope` | number (only for `bracketedLinear`) | Общий наклон threshold-линий по весу (kilolbs). Должен быть ≠ 0. Dry — `0.0576`; Good — `0.06`; MediumToGood — `0.0436`. `variableSlopeBracketed` placement: slope is per-bracket (см. brackets[] выше). |
| `byAircraft.<aircraft>.<condition>.params.maxCap` | number ⎮ null | Верхний clamp результата. `null` — без clamp; число — clamp применяется после ROUNDDOWN при `result > maxCap` (cap inclusive). Dry/Good — `37` (PR 2/3, FCOM Tab 2.29.2a). MediumToGood/Medium — `null` (PR 4/5, Excel sheets не содержат G8). MediumToPoor/Poor — TBD. |
| `byAircraft.<aircraft>.<condition>.params.decimals` | `0` ⎮ `1` | Точность ROUNDDOWN финального значения. Dry — `0` (целые KT). |
| `byAircraft.<aircraft>.<condition>.metadata` | object | `createdAt`, `validatedBy`, `referenceDocument`, `notes` — описательно, читается About-экраном. |

### Правила инкремента `dataVersion`

- Любое изменение значений `slope`, `brackets`, `maxCap`, `decimals`, `envelope` → инкремент третьей цифры (`2026-04-29.001` → `2026-04-29.002`).
- Изменение `strategyType` для (aircraft, condition) → новая дата и minor-версия `schemaVersion`.
- Любое изменение `metadata` без изменения данных — `dataVersion` НЕ инкрементируется.

`dataVersion` отображается в About-экране приложения. При обновлении приложения с новой версией данных пользователь видит уведомление в первый запуск.

---

## zod-схема валидации

JSON проходит zod-схему при первом импорте. Схема в
`src/features/crosswind/data/schema.ts`, используется
`crosswindRepository.ts`.

```typescript
import { z } from 'zod';

const flightPhaseSchema = z.enum(['takeoff', 'landing']);
const runwayConditionSchema = z.enum([
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
]);

const bracketSchema = z.object({
  crosswindKnots: z.number().int().min(0).max(50),
  intercept: z.number().finite(),
});

// Active strategies — bracketedLinear (Dry / PR 1; Good / PR 3; MediumToGood / PR 4)
//                    variableSlopeBracketed (Medium / PR 5)
//                    cgOnlyPiecewise (MediumToPoor / PR 6)
//                    constant (Poor / PR 7)
const bracketedLinearParamsSchema = z.object({
  brackets: z.array(bracketSchema).min(2), // schema 2.2.0: was .length(5)
  slope: z.number().finite(),
  maxCap: z.number().finite().nullable(),
  decimals: z.union([z.literal(0), z.literal(1)]),
});
const bracketedLinearDatasetSchema = z.object({
  strategyType: z.literal('bracketedLinear'),
  params: bracketedLinearParamsSchema,
});

// Future strategies (PR 5/6/7/8): discriminator literals declared,
// params shape stubbed to reject all current data.
const futureNeverParamsSchema = z.object({}).strict();
const variableSlopeBracketedDatasetSchema = z.object({
  strategyType: z.literal('variableSlopeBracketed'),
  params: futureNeverParamsSchema,
});
const cgOnlyPiecewiseDatasetSchema = z.object({
  strategyType: z.literal('cgOnlyPiecewise'),
  params: futureNeverParamsSchema,
});
const constantDatasetSchema = z.object({
  strategyType: z.literal('constant'),
  params: futureNeverParamsSchema,
});
const notAllowedDatasetSchema = z.object({
  strategyType: z.literal('notAllowed'),
  params: futureNeverParamsSchema,
});

const datasetSchema = z.intersection(
  z.discriminatedUnion('strategyType', [
    bracketedLinearDatasetSchema,
    variableSlopeBracketedDatasetSchema,
    cgOnlyPiecewiseDatasetSchema,
    constantDatasetSchema,
    notAllowedDatasetSchema,
  ]),
  z.object({
    metadata: z.object({
      createdAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
      validatedBy: z.string().min(1),
      referenceDocument: z.string().min(1),
      notes: z.string(),
    }),
  }),
);

const operationalEnvelopeSchema = z.object({
  weight: z.object({ minTons: z.number().positive(), maxTons: z.number().positive() }),
  cg:     z.object({ minPercent: z.number(),         maxPercent: z.number() }),
});

const aircraftEntrySchema = z
  .object({
    operationalEnvelope: operationalEnvelopeSchema,
    dry:          datasetSchema.optional(),
    good:         datasetSchema.optional(),
    mediumToGood: datasetSchema.optional(),
    medium:       datasetSchema.optional(),
    mediumToPoor: datasetSchema.optional(),
    poor:         datasetSchema.optional(),
  })
  .strict();

const crosswindDataFileSchema = z.object({
  // Tightened in Sprint B / ADR-0013: legacy 2.2.x files (top-level
  // envelope) fail at parse time instead of loading silently.
  schemaVersion: z.string().regex(/^2\.3\.\d+$/),
  dataVersion: z.string().min(1),
  phase: flightPhaseSchema,
  weightConversion: z.object({
    tonsToKilolbsFactor: z.number().positive(),
  }),
  byAircraft: z
    .object({
      b787_8: aircraftEntrySchema.optional(),
      b787_9: aircraftEntrySchema.optional(),
    })
    .strict(),
});

type CrosswindDataFile = z.infer<typeof crosswindDataFileSchema>;
```

### Дополнительные business-rule валидации

После прохождения структурной zod-валидации репозиторий выполняет
дополнительные проверки на каждом непустом dataset-е в
`byAircraft[*][*]`:

1. Для каждого присутствующего `byAircraft.<aircraft>.operationalEnvelope`:
   `weight.minTons < weight.maxTons` и `cg.minPercent < cg.maxPercent` —
   иначе `CorruptedDataBundle`. Walker проходит по всем aircraft entries
   (Sprint B / ADR-0013: envelope per-aircraft).
2. (объединено с #1 — оба axes одного envelope проверяются вместе.)
3. Для каждого присутствующего `byAircraft.<aircraft>.<condition>` со `strategyType === 'bracketedLinear'`:
   - `params.slope !== 0` — иначе `CorruptedDataBundle`.
   - `params.brackets` отсортированы по убыванию `crosswindKnots` (40, 35, 30, 25, 20) — иначе `CorruptedDataBundle`.
   - `params.brackets` отсортированы по возрастанию `intercept` — иначе `CorruptedDataBundle`.
4. `phase` соответствует ожидаемому значению context-а (для MVP-репозитория — `'takeoff'`).

Future strategies (PR 5/6/7/8) добавят свои business-rule проверки в
этот пайплайн по мере активации.

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

1. ✅ **Resolved 2026-05-19** — `envelope.weight.minTons` для B787-8 финализирован как `104.1` t (FCOM / Type Certificate), `maxTons` как `227.93` t (MTOW). Предварительное значение 110 t было консервативной оценкой; FCOM-certified envelope шире.
2. ✅ **Resolved 2026-05-19** — `envelope.cg.minPercent` финализирован как `6`, `maxPercent` как `39.5` (FCOM / Type Certificate). Предварительные значения 8% / 35% были консервативной оценкой.
3. Нужно ли в metadata добавить поле `localizedNotes` для отображения по-русски и по-английски? Сейчас `notes` — единая строка. Решение: пока единая English, RU-отображение в About — через статический i18n ключ, не через JSON.

---

## Exit-критерии этого документа

- [ ] Разработчик согласен с branded-type подходом для Value Objects.
- [ ] Структура JSON-схемы понятна и не вызывает возражений.
- [ ] Названия полей (`schemaVersion`, `dataVersion`, `interpolation.model` и т.д.) кажутся подходящими.
- [ ] Стратегия fail-safe при невалидных данных одобрена.
- [ ] Open questions либо закрыты, либо явно отложены на Phase B.
