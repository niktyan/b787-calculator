# Module Contract · Crosswind

**Path:** `src/features/crosswind/`
**Status:** Active in MVP
**Owner module:** Core, Design System (для зависимостей)

## Ответственность

Feature-модуль Crosswind реализует **главную функциональность приложения в MVP** — расчёт максимально допустимого бокового ветра для взлёта (Takeoff) Boeing 787-8 на **всех 6 RWYCC** (Dry/Good/MediumToGood/Medium/MediumToPoor/Poor — RWYCC 6 через 1). RWYCC 0 (TAKE OFF NOT ALLOWED) intentionally not implemented в данных. Модуль самодостаточен: содержит свою domain-логику, источник данных, UI-экран и тесты.

Алгоритм расчёта детально описан в `02_Specification/05-crosswind-algorithm.md`. Этот контракт фокусируется на **публичном API** модуля и его зависимостях.

## Внутренняя структура

```
src/features/crosswind/
├── presentation/
│   ├── CrosswindScreen.tsx          — главный экран
│   ├── components/
│   │   ├── CrosswindInputForm.tsx   — форма ввода (Aircraft, TOW actual, CG, runway condition)
│   │   └── CrosswindResult.tsx      — single-card centred number panel
│   └── useCrosswindCalculator.ts    — view-model хук
├── domain/
│   ├── types.ts                     — domain-типы (Aircraft, RunwayCondition RWYCC scale, RWYCC mapping)
│   ├── valueObjects.ts              — Value Objects (WeightInTons, CGPercentMAC, CrosswindKnots)
│   ├── calculator.ts                — тонкая оркестрация (calculateCrosswindLimit + alias calculateMaxCrosswindTakeoff)
│   ├── strategy.ts                  — CrosswindStrategy interface, StrategyType union, *Params shapes
│   ├── strategy-resolver.ts         — resolveStrategy(aircraft, condition, data) → StrategyResolution
│   ├── strategies/
│   │   ├── bracketed-linear.ts      — `bracketedLinear` strategy (Dry / PR 1; Good / PR 3; MediumToGood / PR 4)
│   │   ├── variable-slope-bracketed.ts — `variableSlopeBracketed` strategy (Medium / PR 5)
│   │   ├── cg-only-piecewise.ts     — `cgOnlyPiecewise` strategy (MediumToPoor / PR 6)
│   │   └── constant.ts              — `constant` strategy (Poor / PR 7)
│   └── validators.ts                — validateAlgorithmInput + validateWeightEnvelope + validateCGEnvelope
├── data/
│   ├── crosswindRepository.ts       — обёртка над JSON-ресурсом
│   ├── schema.ts                    — zod-схема (byAircraft / strategy discriminated union)
│   └── b787-takeoff.json            — bundled lookup data (see 04-domain-model.md)
├── __tests__/
│   ├── calculator.test.ts                          — тест-таблица из 05-crosswind-algorithm.md (Dry / Sets #1-#3)
│   ├── good.test.ts                                — Good (RWYCC 5) тест-таблица: Set #6 (PR 3)
│   ├── medium-to-good.test.ts                      — MediumToGood (RWYCC 4) тест-таблица: Set #7 (PR 4)
│   ├── medium.test.ts                              — Medium (RWYCC 3) тест-таблица: Set #8 (PR 5)
│   ├── medium-to-poor.test.ts                      — MediumToPoor (RWYCC 2) тест-таблица: Set #9 (PR 6)
│   ├── poor.test.ts                                — Poor (RWYCC 1) тест-таблица: Set #10 (PR 7)
│   ├── bracketed-linear-strategy.test.ts           — direct unit tests for `bracketedLinear`
│   ├── variable-slope-bracketed-strategy.test.ts   — direct unit tests for `variableSlopeBracketed` (PR 5)
│   ├── cg-only-piecewise-strategy.test.ts          — direct unit tests for `cgOnlyPiecewise` (PR 6)
│   ├── constant-strategy.test.ts                   — direct unit tests for `constant` (PR 7)
│   ├── validators.test.ts
│   ├── edgeCases.test.ts
│   ├── repository.test.ts
│   └── acceptance.test.ts                          — end-to-end тесты модуля
└── index.ts                                — barrel
```

**Примечание про расположение JSON-данных.** Bundled JSON-файл живёт
в `src/features/crosswind/data/b787-takeoff.json` — самодостаточно
внутри модуля. ESLint правила в `08-quality-gates.md` это допускают.

## Public API

`src/features/crosswind/index.ts`:

```typescript
// Screen для регистрации в навигации
export { CrosswindScreen } from './presentation';

// Domain types
export type {
  Aircraft,
  CrosswindCalculationInput,
  CrosswindCalculationOutput,
  CrosswindCalculationError,
  CrosswindTakeoffInput,
  CGViolation,
  EnvelopeViolation,
  WeightViolation,
  WeightInTons,
  CGPercentMAC,
  CrosswindKnots,
} from './domain';

// Pure calculation function. `calculateMaxCrosswindTakeoff` is a
// spec-named alias of `calculateCrosswindLimit` — same signature, same
// behaviour, documents intent at takeoff call sites. Internally a thin
// orchestrator: validateAlgorithmInput → resolveStrategy → strategy.calculate.
export { calculateCrosswindLimit, calculateMaxCrosswindTakeoff } from './domain';

// Strategy pattern surface (Phase D PR 1 — see ADR-0010).
//
//   CrosswindStrategy        — interface { type, calculate(input) }.
//   STRATEGY_TYPES           — 5-literal const array (active: bracketedLinear;
//                               future: variableSlope.../cgOnly.../constant/notAllowed).
//   BracketedLinearParams    — full params shape for the active strategy.
//   StrategyResolution       — { kind: 'strategy', strategy } | NoLookupData.
export type {
  BracketedLinearBracket,
  BracketedLinearParams,
  CalculatorInput,
  CrosswindStrategy,
  NoLookupData,
  StrategyResolution,
  StrategyType,
} from './domain';
export { STRATEGY_TYPES, createBracketedLinearStrategy, resolveStrategy } from './domain';
//
// signatures:
//   function resolveStrategy(
//     aircraft: Aircraft,
//     condition: RunwayCondition,
//     data: CrosswindDataFile,
//   ): StrategyResolution;
//
//   function createBracketedLinearStrategy(
//     params: BracketedLinearParams,
//     context: BracketedLinearContext,  // aircraft, dataVersion, referenceDocument, tonsToKilolbsFactor
//   ): CrosswindStrategy;

// Use-case validation (operational envelope — отдельно от lookup
// envelope). Independent flow on each axis so the UI can surface both
// errors at once. См. 04-domain-model.md § "Two distinct envelope
// concepts" / "Independent weight + cg validation".
//
// signatures:
//   function validateWeightEnvelope(
//     input: { weightTons: WeightInTons },
//     envelope: { minTons: number; maxTons: number },
//   ): Result<void, WeightViolation>;
//
//   function validateCGEnvelope(
//     input: { cgPercent: CGPercentMAC },
//     envelope: { minPercent: number; maxPercent: number },
//   ): Result<void, CGViolation>;
//
// WeightViolation: { weight.below, weight.above }.
// CGViolation:     { cg.below,     cg.above }.
// EnvelopeViolation = WeightViolation | CGViolation (alias for generic
// consumers — e.g., the result-panel warning chip).
//
// Use-case calls BOTH validators FIRST, composes results into
// `{ weight: WeightViolation | null, cg: CGViolation | null }`, then
// always calls calculateCrosswindLimit. UI shows the algorithm's number
// unconditionally; each non-null violation drives the corresponding
// field error, and the first non-null violation drives the warning chip
// next to the number.
export { validateCGEnvelope, validateWeightEnvelope } from './domain';

// Repository factory (для DI, если понадобится альтернативная реализация)
export { createCrosswindRepository } from './data';
export type { CrosswindRepository } from './data';
```

**Removed in Block 5 (takeoff rebrand) — formerly public:**

- `getLookupCGRange` / `LookupCGRange` — drove the deleted
  `EnvelopePositionBar`. No remaining consumers.
- `EnvelopePositionBar` component — deleted.
- `RegularIdleBody` component — deleted (folded into the simplified
  `CrosswindResult`).
- Result-panel meta-grid + footnote.

Что НЕ экспортируется:
- Внутренние компоненты презентации (InputForm, Result, SourceChip).
- View-model хук (`useCrosswindCalculator`) — он используется только внутри `CrosswindScreen`.
- Внутренние validators, schema.
- Future-strategy params (`VariableSlopeBracketedParams`, `CGOnlyPiecewiseParams`,
  `ConstantParams`, `NotAllowedParams`) — type-only stubs внутри `domain/strategy.ts`,
  не экспортируются на уровне модуля. PR 5/6/7/8 поднимут их в публичный API
  одновременно со своими реализациями.
- Любые приватные типы и функции.

## Dependencies

**От других модулей:**
- `core` — `useTranslation`, `useTheme`, `logger`, `ok`, `err`, `Result`, `useFeatureFlag` (для возможного скрытия модуля флагом).
- `design-system` — `Screen`, `Stack`, `Card`, `Text`, `MonoText`, `NumericInput`, `SegmentedControl` (Aircraft), `RunwayConditionPicker` (runway condition — dropdown с G2 / ADR-0021, заменил 6-сегментный SegmentedControl), `ResultPanel`, `BackButton`.

**От библиотек:**
- `react`, `react-native`.
- `expo-router` (для navigation).
- `zod` (для schema validation в data-слое).

**НЕ зависит от:**
- Других feature-модулей (правило архитектуры).
- Прямо от `react-native` или `expo` в domain-слое (правило архитектуры).

## Side-effects

- При первом обращении к `CrosswindScreen` происходит загрузка JSON через `crosswindRepository`. Это синхронное чтение из bundle (`require()` или `import`).
- Validation через zod — может выбросить fail-safe state, но не side-effect наружу.
- `useCrosswindCalculator` хук подписывается на изменение полей ввода и пересчитывает — local state, не глобальный side-effect.

## Поведение при ошибках

В соответствии с `05-crosswind-algorithm.md` и `06-ui-spec.md`:
- При невалидном вводе → `CrosswindResult` показывает error-состояние, не число.
- При corrupted JSON → fail-safe экран на уровне App Shell (не Crosswind модуля).
- При NaN / Infinity в промежуточных вычислениях → возврат `Result.err`, UI показывает «Calculation unavailable».

## Performance budget

- Один расчёт от изменения input до обновления result-панели: ≤ 50 ms на iPad 9-го gen.
- Загрузка JSON и zod-валидация: ≤ 100 ms (один раз при первом открытии экрана).

## Тестирование

**Unit-тесты domain (обязательно):**
- `calculator.test.ts` — Test Sets #1, #2, #3 (Dry) + algorithm-only NaN/Infinity cases. ≥ 40 кейсов из тест-таблицы `05-crosswind-algorithm.md`. Тестирует `calculateCrosswindLimit`.
- `good.test.ts` — Test Set #6 (Good / RWYCC 5, PR 3). 41 кейс в 4 sub-sets по весовым диапазонам (W=170/130/160/150) + standalone Excel-verified anchor (W=150/CG=26 → 34 KT) + cap-mechanism regressions.
- `medium-to-good.test.ts` — Test Set #7 (MediumToGood / RWYCC 4, PR 4). 41 кейс в 4 sub-sets по весовым диапазонам (W=170/130/160/175) + standalone Excel-verified anchor (W=175/CG=24 → 30 KT) + cap-absence regressions (verifying `maxCap=null` ≠ Dry/Good cap=37) + cross-condition ordering invariant (Dry ≥ Good ≥ MediumToGood).
- `medium.test.ts` — Test Set #8 (Medium / RWYCC 3, PR 5). 39 кейсов в 4 sub-sets (W=170/130/160/182) + standalone Excel-verified anchor (W=182/CG=20 → **23.9 KT** — first sub-integer condition; asserts both numeric value AND `String(value) === '23.9'`) + 1-decimal precision regression + cap-absence + full cross-condition ordering chain (Dry ≥ Good ≥ MediumToGood ≥ Medium).
- `medium-to-poor.test.ts` — Test Set #9 (MediumToPoor / RWYCC 2, PR 6). 22 кейса в 5 sub-sets: plateau branch (CG ≤ 30, multiple weights), decreasing branch (CG > 30), user-anchor sub-set W=182, **weight-independence regression** (defining property — same CG × 5 weights → same output), out-of-envelope CG (CalculationFailed per A1). Plus standalone Excel-verified anchor (W=182/CG=32 → **13.9 KT**), full 5-condition cross-condition ordering chain at W=170/CG=32 (Dry 34 ≥ Good 32 ≥ MediumToGood 21 ≥ Medium 17.1 ≥ MediumToPoor 13.9), metadata sanity.
- `poor.test.ts` — Test Set #10 (Poor / RWYCC 1, PR 7). 5 кейсов в таблице + standalone anchor + **full input-independence matrix** (single test asserting 5 weights × 5 CGs = 25 combinations all return 10 via `toEqual(Array.from({length:25}, () => 10))`) + **full 6-condition cross-condition ordering** at W=170/CG=30 (Dry 37 ≥ Good 33 ≥ MediumToGood 23 ≥ Medium 18.1 ≥ MediumToPoor 15 ≥ Poor 10). Last per-condition test file in the suite — after PR 7 all 6 RWYCC active.
- `variable-slope-bracketed-strategy.test.ts` — direct unit tests for the new `variableSlopeBracketed` strategy (PR 5). 16 cases including anchor, both `/E9` and `·E9` formula branches (the latter exercised with synthetic tight-bracket params), decimals=0 vs 1, IFNA fallback derived from `brackets[0]`, maxCap clamp/no-clamp, empty brackets, Infinity defence in depth.
- `cg-only-piecewise-strategy.test.ts` — direct unit tests for the new `cgOnlyPiecewise` strategy (PR 6). 19 cases including plateau (3 in-plateau CGs), decreasing branch with anchor, boundary CG=threshold, weight-independence (5 weights × CG=32 → all 13.9), decimals=0 vs 1, out-of-envelope negative-output transition (CG=40→9.7, CG=50→4.4, CG=60→CalculationFailed, CG=100→CalculationFailed), slopeDivisor=0 defensive guard, Infinity defence in depth, metadata sanity (single-point bracket ranges since CG-only model has no bracket structure).
- `constant-strategy.test.ts` — direct unit tests for the new `constant` strategy (PR 7). 10 cases: discriminator, input-independence 3×3 matrix asserted as 9-element toEqual, metadata sanity (`calculationStrategy='within-bracket'` per PR 6 enum-stretch convention; cgBracket and bracketCrosswindRange collapse to single-point ranges), it.each over `value ∈ {5, 10, 15, 20}` confirming each instance returns its own constant, defensive paths (negative value and value > 40 KT both → CalculationFailed via `makeCrosswindKnots`).
- `validators.test.ts` — Test Set #4: кейсы #4.01–4.02 для `validateWeightEnvelope` + #4.03–4.04 для `validateCGEnvelope` + boundary edges (just-inside / just-outside) + 4-combination matrix on independent flow (both-ok / weight-only-bad / cg-only-bad / both-bad incl. above-max + below-min + mixed) плюс кейсы #4.05–4.07 для Value Object factories (`makeWeightInTons` / `makeCGPercentMAC` отвергают NaN / Infinity / negative).
- `edgeCases.test.ts` — strategy-dispatcher fall-through, validateAlgorithmInput defence-in-depth NaN/Infinity guards, runtime const arrays.
- Coverage: ≥ 90%.

**Unit-тесты data:**
- `repository.test.ts` — Test Set #5 (corrupted JSON — 5 кейсов).
- Schema-валидация zod-схемы.

**Integration-тесты:**
- `acceptance.test.ts` — несколько end-to-end сценариев: open repo → load JSON → run calculation → verify result.

**UI-тесты:**
- Snapshot тесты для `CrosswindScreen` в empty, idle, error, out-of-envelope состояниях.
- Behavior тесты для `CrosswindInputForm`: ввод значений, валидация, переключение runway condition через `RunwayConditionPicker` (open → select → callback), 3-viewport снапшоты, restore-матрица 6 conditions × 2 aircraft (closed field показывает label восстановленного значения).

**Coverage threshold:** Domain ≥ 90%, общий по модулю ≥ 80%.

## Версионирование

Версия данных читается из `b787-takeoff.json` поле `dataVersion`. При обновлении JSON:
1. Обновить значения в JSON.
2. Инкрементировать `dataVersion`.
3. Обновить тест-таблицу в `05-crosswind-algorithm.md`.
4. Обновить unit-тесты в `__tests__/calculator.test.ts`.
5. Создать PR `chore(data): update crosswind values to <new-dataVersion>`.

См. `04-domain-model.md` раздел «Правила инкремента dataVersion».

## Эволюция модуля

Модуль спроектирован с явной поддержкой эволюции (см. `05-crosswind-algorithm.md`, раздел «Стратегия эволюции алгоритма»). Уровни изменений:

- **Уровень 1** (значения) — только JSON (`params.slope`, `params.brackets`, `params.maxCap`, `params.decimals`), код не трогается. `dataVersion` инкрементируется.
- **Уровень 2** (количество brackets) — изменение JSON + zod (`.length(5)` → `.min(2)`). Алгоритм работает с любым количеством.
- **Уровень 3** (новая стратегия) — добавляется новая ветка в `StrategyType` union + zod discriminated union + новая чистая функция в `domain/strategies/<name>.ts` + ветка в `resolveStrategy`. Старые стратегии не трогаются (backward compatibility).
- **Уровень 4** (структура данных) — major schema bump, новый формат JSON. Resolver делает switch на `schemaVersion` (если потребуется).

Strategy dispatcher имплементирован с PR 1 (см. ADR-0010). Это значит, что добавить новую strategy = (1) описать TS-тип params в `domain/strategy.ts`, (2) добавить zod-схему её params в `data/schema.ts`, (3) реализовать `createXStrategy(params, context)` в `domain/strategies/`, (4) подключить ветку в `resolveStrategy`. Существующий код Dry-стратегии не трогается.

### Takeoff rebrand structural change (Block 2 of feat/crosswind-takeoff-rebrand)

Bundled JSON переехал с flat per-(aircraft, phase, condition) shape
на per-phase файл, в котором lookup-данные ключуются `byAircraft[
aircraft][runwayCondition]`. Это **уровень 4** по классификации выше
— major schema bump (`schemaVersion 1.x → 2.0.0`). `RunwayCondition`
одновременно расширился до 6-state RWYCC scale (`dry / good /
mediumToGood / medium / mediumToPoor / poor`).

Public API изменения:
- `calculateCrosswindLimit` — сигнатура та же, поведение поменялось
  при miss: `aircraft`-not-implemented и `condition`-not-implemented
  возвращают `DataNotAvailable.reason` с явным дискриминатором.
- Добавлены: `Aircraft` (alias `AircraftVariant`), `CrosswindTakeoffInput`,
  `calculateMaxCrosswindTakeoff` (alias).
- Удалены: `getLookupCGRange`, `LookupCGRange` — драйверы удалённого
  `EnvelopePositionBar`.

`validateOperationalEnvelope` неизменён в этот момент; впоследствии
заменён независимой парой `validateWeightEnvelope` / `validateCGEnvelope`
в PR `fix/independent-envelope-validators` — см. § "Independent envelope
validation split (PR A2)" ниже.

### Strategy refactor (PR 1 of feat/crosswind-strategy-refactor)

Алгоритм crosswind переехал с monolithic `calculateExcelEquivalent` на
strategy pattern (см. ADR-0010). `schemaVersion 2.0.0 → 2.1.0`
(additive, не major: тот же production output, новый дискриминатор в
JSON). `dataVersion` пересчитан до `2026-05-17.001`.

Изменения шейпа bundled JSON для каждого `byAircraft[*][*]` dataset:
- Удалены: `interpolation: { model, slope, breakpoints }` и
  `fallback: { belowEnvelope, aboveEnvelope }`.
- Добавлены: `strategyType: 'bracketedLinear'` (дискриминатор) и
  `params: { brackets[5], slope, maxCap: number | null, decimals: 0 | 1 }`.
  Поле `breakpoints` переименовано в `brackets` (без изменения содержимого).
- IFNA-fallback derive-ится из `brackets[0].crosswindKnots` (для Dry — 40).

Public API additions:
- `CrosswindStrategy` interface, `StrategyType` union, `STRATEGY_TYPES`
  runtime const array.
- `BracketedLinearParams`, `BracketedLinearBracket`, `BracketedLinearContext`,
  `CalculatorInput`, `NoLookupData`, `StrategyResolution`.
- `createBracketedLinearStrategy(params, context)`,
  `resolveStrategy(aircraft, condition, data)`.

Future-strategy params (`VariableSlopeBracketedParams`,
`CGOnlyPiecewiseParams`, `ConstantParams`, `NotAllowedParams`)
объявлены как type-only stubs внутри domain — не экспортируются на
уровне модуля, поднимутся в публичный API соответствующими PR 5/6/7/8.

Поведение для Dry — bit-for-bit unchanged: все 50+ test cases в
`calculator.test.ts` проходят без модификаций.

### Independent envelope validation split (PR A2 — fix/independent-envelope-validators, 2026-05-23)

User-testing bug #2: with both TOW and CG out of operational envelope
the form showed only the weight error until the user corrected the
weight, hiding the CG violation. The single `validateOperationalEnvelope`
used an early-return chain across four checks and surfaced only the
first violation.

Replaced by two independent validators:

- `validateWeightEnvelope(input, envelope.weight): Result<void, WeightViolation>`
- `validateCGEnvelope(input, envelope.cg):       Result<void, CGViolation>`

Type-level split:

- `WeightViolation = { weight.below } | { weight.above }`.
- `CGViolation     = { cg.below }     | { cg.above }`.
- `EnvelopeViolation = WeightViolation | CGViolation` — union alias
  preserved for consumers that need a generic any-violation type
  (result-panel warning chip).

Public API change:

- Removed: `validateOperationalEnvelope`.
- Added:   `validateWeightEnvelope`, `validateCGEnvelope`,
           `WeightViolation`, `CGViolation`.
- Unchanged: `EnvelopeViolation` (now a union alias).

Use-case (`useCrosswindCalculator.compute`) now calls BOTH validators in
parallel and composes the two `Result`s into `{ weight, cg }` field
errors. The result-panel `warning` chip stays bound to the first
non-null violation; PR A3 will revisit the chip behaviour.

No data shape change, no `schemaVersion` / `dataVersion` bump, no ADR.
Spec impact: this contract + `04-domain-model.md` § "Independent weight
+ cg validation" + `06-ui-spec.md` § Экран 4 composition rule +
`05-crosswind-algorithm.md` cross-refs to the validator name.

### Per-aircraft operational envelope (Sprint B / ADR-0013, 2026-05-23)

`operationalEnvelope` moves from top-level of `b787-takeoff.json` into
`byAircraft.<aircraft>.operationalEnvelope`. B787-9 ships with its
own FCOM-certified envelope (weight `[110.677, 259.228]` t, CG
`[8, 37.5]` %MAC) — different from B787-8 (`[104.1, 227.93]` t /
`[6, 39.5]` %MAC). A top-level union envelope would have created a
safety risk for B787-8 inputs above B787-8 MTOW but below B787-9 MTOW.

`schemaVersion` bumped `2.2.0 → 2.3.0` (regex tightened to
`^2\.3\.\d+$` — legacy files fail loudly). `dataVersion` bumped to
`2026-05-23.002`. Bundled file now ships envelope + 6/6 RWYCC datasets
for both `b787_8` and `b787_9`.

Public API additions:

- `resolveOperationalEnvelope(data, aircraft): OperationalEnvelope | null`
  — exported from `@features/crosswind` (re-exported via `data/`
  barrel). Returns `null` when the variant is absent (no entry in
  `byAircraft`).

View-model (`useCrosswindCalculator.compute`) resolves envelope per
the currently selected aircraft and falls back to `data-not-available`
when the envelope is missing.

UI: `CrosswindInputForm.AIRCRAFT_OPTIONS` no longer marks B787-9 as
`disabled: true`. Both segments are equally active; tapping switches
the resolved envelope and dataset.

### Shared aviation primitives extracted to `core/aviation` (Sprint C / ADR-0014, 2026-05-23)

`AircraftVariant`, `Aircraft`, `FlightPhase`, `RunwayCondition`,
`RunwayConditionCode`, the const arrays `AIRCRAFT_VARIANTS` /
`FLIGHT_PHASES` / `RUNWAY_CONDITIONS`, and the `RWYCC` numeric mapping
moved from `src/features/crosswind/domain/types.ts` to
`src/core/aviation/types.ts`. The new `features/crosswind-landing/`
feature consumes them from `core/aviation` — features cannot
cross-import each other.

`features/crosswind/domain/types.ts` re-exports the same identifiers
from `core/aviation`, so:

- Every internal import path inside the takeoff feature (e.g.,
  `import type { AircraftVariant } from '../domain/types'`) remains
  valid.
- The takeoff feature's public API (`@features/crosswind` barrel)
  exports `Aircraft` as before — no consumer change required.
- Architectural lint rules (`no-restricted-paths`) are unaffected;
  the takeoff feature still imports only from `core` and itself.

No data shape change, no `schemaVersion` / `dataVersion` bump, no
behaviour change. Verified by the existing crosswind test suite —
18 suites, 412 tests, all green without modification.

### Hide result on operational envelope violation (PR A3 / ADR-0012, 2026-05-23)

Safety-first follow-up to PR A2. When either field is outside the
operational envelope, the view-model now **skips
`calculateCrosswindLimit` entirely** and returns
`{ kind: 'out-of-envelope', reason: "Out of operational envelope —
adjust inputs" }`. The result-panel warning chip is gone; the `idle`
state always means "valid result is shown".

Internal changes only — no Public API change:

- `CrosswindUIState.idle` shrinks from `{ kind, output, warning }`
  to `{ kind, output }`.
- `CrosswindResult.IdleView` loses warning chip rendering, the
  `warning` / `warningText` props, and `styles.warningChip`.
- `EnvelopeViolation` import removed from both `CrosswindResult`
  and `useCrosswindCalculator` (no remaining in-file consumers); the
  type itself is still exported from the module barrel.
- i18n: new key `crosswind.outOfOperationalEnvelope` (EN + RU); the
  no-longer-referenced `crosswind.warningOutsideEnvelope` removed
  from both locale files.
- `crosswind-warning-chip` testID no longer emitted anywhere.

See ADR-0012 for the full rationale (safety, App Store positioning,
UX consistency).

## Открытые вопросы

1. ✅ **Resolved 2026-05-19** — envelope финализирован как FCOM /
   Type Certificate B787-8: weight `[104.1, 227.93]` t, CG `[6, 39.5]`
   %MAC. Предварительные значения `110–172 / 8–35` были консервативной
   оценкой; JSON и тест-таблицы обновлены в PR
   `fix/envelope-bounds-and-menu-order`.
2. Нужно ли передавать `dataVersion` в `CalculationMetadata` для отображения в UI? Решение: да, это сделано (см. `04-domain-model.md`).
