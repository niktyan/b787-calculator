# Module Contract · Crosswind

**Path:** `src/features/crosswind/`
**Status:** Active in MVP
**Owner module:** Core, Design System (для зависимостей)

## Ответственность

Feature-модуль Crosswind реализует **главную функциональность приложения в MVP** — расчёт максимально допустимого бокового ветра для взлёта (Takeoff) Boeing 787-8 на Dry (RWYCC 6) и Good (RWYCC 5) ВПП. Модуль самодостаточен: содержит свою domain-логику, источник данных, UI-экран и тесты.

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
│   │   └── bracketed-linear.ts      — `bracketedLinear` strategy implementation (Dry / PR 1; Good / PR 3)
│   └── validators.ts                — validateAlgorithmInput + validateOperationalEnvelope
├── data/
│   ├── crosswindRepository.ts       — обёртка над JSON-ресурсом
│   ├── schema.ts                    — zod-схема (byAircraft / strategy discriminated union)
│   └── b787-takeoff.json            — bundled lookup data (see 04-domain-model.md)
├── __tests__/
│   ├── calculator.test.ts                  — тест-таблица из 05-crosswind-algorithm.md (Dry / Sets #1-#3)
│   ├── good.test.ts                        — Good (RWYCC 5) тест-таблица: Set #6 (PR 3)
│   ├── bracketed-linear-strategy.test.ts   — direct unit tests for `bracketedLinear`
│   ├── validators.test.ts
│   ├── edgeCases.test.ts
│   ├── repository.test.ts
│   └── acceptance.test.ts                  — end-to-end тесты модуля
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
  EnvelopeViolation,
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
// envelope). См. 04-domain-model.md "Two distinct envelope concepts".
//
// signature:
//   function validateOperationalEnvelope(
//     input: { weightTons: WeightInTons; cgPercent: CGPercentMAC },
//     envelope: { weight: { minTons: number; maxTons: number };
//                 cg:     { minPercent: number; maxPercent: number } },
//   ): Result<void, EnvelopeViolation>;
//
// EnvelopeViolation covers four cases: weight.below / weight.above /
// cg.below / cg.above. Use-case calls validateOperationalEnvelope
// FIRST, then always calls calculateCrosswindLimit. UI shows the
// algorithm's number unconditionally; the validator's result drives
// the warning chip next to it.
export { validateOperationalEnvelope } from './domain';

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
- `design-system` — `Screen`, `Stack`, `Card`, `Text`, `MonoText`, `NumericInput`, `SegmentedControl`, `ResultPanel`, `BackButton`.

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
- `validators.test.ts` — Test Set #4: кейсы #4.01–4.04 для `validateOperationalEnvelope` плюс кейсы #4.05–4.07 для Value Object factories (`makeWeightInTons` / `makeCGPercentMAC` отвергают NaN / Infinity / negative).
- `edgeCases.test.ts` — strategy-dispatcher fall-through, validateAlgorithmInput defence-in-depth NaN/Infinity guards, runtime const arrays.
- Coverage: ≥ 90%.

**Unit-тесты data:**
- `repository.test.ts` — Test Set #5 (corrupted JSON — 5 кейсов).
- Schema-валидация zod-схемы.

**Integration-тесты:**
- `acceptance.test.ts` — несколько end-to-end сценариев: open repo → load JSON → run calculation → verify result.

**UI-тесты:**
- Snapshot тесты для `CrosswindScreen` в empty, idle, error, out-of-envelope состояниях.
- Behavior тесты для `CrosswindInputForm`: ввод значений, валидация, переключение runway condition.

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

`validateOperationalEnvelope` неизменён.

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

## Открытые вопросы

1. Точные значения envelope (weight 110–172 t, CG 8–35 %MAC) — отложены до Phase B. При уточнении JSON и тест-таблица обновляются.
2. Нужно ли передавать `dataVersion` в `CalculationMetadata` для отображения в UI? Решение: да, это сделано (см. `04-domain-model.md`).
