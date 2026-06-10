# Module Contract · Crosswind Landing

**Path:** `src/features/crosswind-landing/`
**Status:** Active in MVP (Sprint C / ADR-0014)
**Owner module:** Core, Design System (для зависимостей)

## Ответственность

Feature-модуль Crosswind Landing реализует расчёт максимально допустимого
бокового ветра для **посадки** Boeing 787-8 и Boeing 787-9 — второй
активный модуль в MVP после Crosswind Takeoff. Алгоритм — categorical
lookup по FCOM Tab 2.29.3 + page 2-105 с тремя FCOM CAUTION
корректировками (CAT II-III cap, Asymmetric Reverse penalty, ONE ENG
INOP cap).

Модуль самодостаточен: содержит свой domain, свой источник данных
(`b787-landing.json`, schemaVersion 2.4.0 — см. ADR-0018), свой UI-экран
и тесты. Никакого кросс-импорта из `features/crosswind/` (правило
архитектуры). Общие aviation-примитивы (`AircraftVariant`,
`LandingRunwayCondition`, `FlightPhase`) импортируются из
`core/aviation/`. Landing-специфичный `LandingRunwayCondition` (7
значений: dry / goodWetDamp / goodSlushSnow / goodToMedium / medium /
mediumToPoor / poor) намеренно отделён от takeoff'овского
`RunwayCondition` (6 значений), потому что AFM Rev. 20 разделяет
«Good» на Wet/Damp и Slush/DSN/WSN только для landing.

Архитектурное обоснование — см. `02_Specification/ADR/0014-landing-module-architecture.md`
и `02_Specification/ADR/0018-landing-runway-condition-taxonomy-v2.md`.

## Внутренняя структура

```
src/features/crosswind-landing/
├── presentation/
│   ├── CrosswindLandingScreen.tsx
│   ├── components/
│   │   ├── CrosswindLandingInputForm.tsx   — 6 segmented controls, conditional hide CAT/INOP
│   │   ├── CrosswindLandingResult.tsx      — single-card centred number panel
│   │   └── __tests__/
│   │       └── CrosswindLandingResult.test.tsx
│   ├── useCrosswindLandingCalculator.ts
│   └── index.ts
├── domain/
│   ├── calculator.ts                       — calculateLandingCrosswind (pure function)
│   ├── types.ts                            — LandingMode, YesNo, Input/Output/Error
│   └── index.ts
├── data/
│   ├── b787-landing.json
│   ├── landingRepository.ts
│   ├── schema.ts                           — zod schema + business-rule walker
│   └── index.ts
├── __tests__/
│   ├── acceptance.test.ts                  — 18 anchors из ADR-0014
│   ├── calculator.test.ts                  — applied-adjustments + error dispatch
│   ├── repository.test.ts                  — corruption + memoization
│   └── types.test.ts                       — runtime const arrays sanity
└── index.ts                                — barrel
```

## Public API

`src/features/crosswind-landing/index.ts`:

```typescript
// Screen для регистрации в навигации
export { CrosswindLandingScreen } from './presentation';

// Domain types
export type {
  CrosswindLandingAppliedAdjustments,
  CrosswindLandingDataUnavailableReason,
  CrosswindLandingError,
  CrosswindLandingInput,
  CrosswindLandingMetadata,
  CrosswindLandingOutput,
  LandingMode,
  YesNo,
} from './domain';
export { LANDING_MODES, YES_NO_VALUES } from './domain';

// Pure calculation function
//
//   function calculateLandingCrosswind(
//     input: CrosswindLandingInput,
//     data: CrosswindLandingDataFile,
//   ): Result<CrosswindLandingOutput, CrosswindLandingError>;
//
// Pure: same input → same output; never throws.
export { calculateLandingCrosswind } from './domain';

// Repository factory
//
//   function createCrosswindLandingRepository(
//     options?: { raw?: unknown; context?: { expectedPhase?: 'takeoff' | 'landing' } },
//   ): CrosswindLandingRepository;
//
// Default context expects phase: 'landing'. Default raw is the bundled
// b787-landing.json. Returned repository memoizes — repeated load()
// returns the same Result instance.
export { createCrosswindLandingRepository } from './data';
export type {
  CrosswindLandingRepository,
  CrosswindLandingRepositoryError,
} from './data';
```

Что НЕ экспортируется:

- Внутренние компоненты презентации (`CrosswindLandingInputForm`,
  `CrosswindLandingResult`, header pills).
- View-model хук (`useCrosswindLandingCalculator`) — используется только
  внутри `CrosswindLandingScreen`.
- Внутренние validators / schema / business-rule walker.
- Любые приватные типы и функции domain слоя.

## Algorithm

Точная формализация — см. `ADR-0014` § Decision (Algorithm
formalization). Кратко:

- **Step 1 · Base lookup.**
  `byAircraft[aircraft].baseTable[runwayCondition][landingMode]`.
  Отсутствие `aircraft` → `DataNotAvailable.reason: 'aircraft-not-implemented'`.
  Отсутствие `runwayCondition` → `'condition-not-implemented'`.
- **Step 2 · Manual branch.** Применить asymmetric-reverse penalty
  (см. ниже). Stop.
- **Step 3 · Auto branch.** Stacked adjustments:
  1. CAT II-III cap: `if catIIIII == 'yes' AND base > catCap: result = catCap`.
  2. Asymmetric reverse penalty: см. ниже.
  3. ONE ENG INOP cap: `if engineInop == 'yes' AND inopLimit < afterAsym: result = inopLimit`.
- **Asymmetric reverse penalty.** `-5 KT` если `asymReverse == 'yes'`
  И `runwayCondition != 'dry'`. Dry — FCOM-exempt. Применяется и в
  Manual, и в Auto после CAT cap.

Все значения целочисленные. Финального округления не требуется (base
table и adjustments — integer per FCOM).

## Conditional UI behaviour (F3 / ADR-0019 — reserved-slot)

`CrosswindLandingInputForm` рендерит **static 5-row grid**:

```
Row 1 — Aircraft                    (full width)
Row 2 — Runway condition            (full width, picker)
Row 3 — Asymmetric Reverse Thrust   (full width)
Row 4 — Landing                     (full width)
Row 5 — [CAT II/III | ONE ENG INOP] (2-column reserved pair)
```

Row 5 — это **always-mounted** пара `<ToggleCell>` с пропом
`hidden={landingMode !== 'auto'}`. В Manual обе cell'ы рендерятся
как **invisible spacers** (`opacity: 0`, `pointerEvents: 'none'`,
`accessibilityElementsHidden: true`, `importantForAccessibility:
'no-hide-descendants'`), но **сохраняют свою layout-высоту** — поэтому
result-панель не сдвигается при flip'е Manual ↔ Autoland. При Autoland
те же cell'ы становятся visible + interactive **в том же offset'е**.
Переход instant (без анимации).

Sprint-C поведение (unmount + ScrollView + auto-scroll hook) удалено
в F3. См. ADR-0019 § Decision и § Alternatives considered (a)–(c) для
обоснования.

Спека для UI: `06-ui-spec.md` § "Экран 4b · Crosswind Landing Calculator".

## Dependencies

**От других модулей:**

- `core/aviation` — `AircraftVariant`, `LandingRunwayCondition`,
  `RunwayConditionCode`, `RWYCC` (импортируются и takeoff модулем —
  shared via core; landing uses `LandingRunwayCondition` instead of the
  6-value `RunwayCondition` per ADR-0018).
- `core` — `useTranslation`, `useTheme`, `useReduceMotion`, `ok`, `err`,
  `Result`.
- `design-system` — `Screen`, `Stack`, `Row`, `Text`, `SegmentedControl`,
  `RunwayConditionPicker` (с G2 / ADR-0021 компонент живёт в
  design-system как generic-примитив; до этого был feature-local в
  `presentation/components/`), `ErrorState`, `tokens`.

**От библиотек:**

- `react`, `react-native`.
- `expo-router` (только для navigation `useRouter().back()`).
- `@expo/vector-icons` (для info-outline в caption views).
- `react-native-reanimated` (для LinearTransition анимации в result panel).
- `zod` (для schema validation в data-слое).

**НЕ зависит от:**

- `features/crosswind/` — кросс-feature импорты запрещены.
- Прямо от `react-native` или `expo` в domain-слое.

## Side-effects

- При первом обращении к `CrosswindLandingScreen` происходит загрузка
  JSON через `createCrosswindLandingRepository().load()` — синхронное
  чтение из bundle. Memoized.
- Validation через zod может вернуть `Result.err`, но не выбрасывает.
- `useCrosswindLandingCalculator` хук пересчитывает на каждое изменение
  6 категорий — local state, не глобальный side-effect.

## Поведение при ошибках

- `DataNotAvailable.aircraft-not-implemented` или `condition-not-implemented`
  → UI рендерит `data-not-available` caption с локализованной причиной.
  Не должно случиться в MVP — JSON ship-ит полную 2×6 матрицу.
- `CorruptedDataBundle` (на уровне репозитория) → fail-safe экран
  через `ErrorState` (не Crosswind Landing-специфичный — переиспользуется
  с takeoff'а).
- Defence-in-depth `error` UI state зарезервирован за future failures
  (например, расширение алгоритма с новой стратегией возврата ошибок).

## Performance budget

- Один расчёт от изменения toggle до обновления result-панели: ≤ 5 ms
  на iPad 9-го gen (categorical lookup — даже быстрее piecewise-linear
  takeoff'а).
- Загрузка JSON и zod-валидация: ≤ 50 ms (один раз при первом открытии
  экрана; JSON меньше, чем у takeoff'а).

## Тестирование

**Unit-тесты domain:**

- `acceptance.test.ts` — 18 FCOM anchor combinations через `it.each`
  table (manual / auto × оба ВС × stacked adjustments × edge cases).
- `calculator.test.ts` — error dispatch (missing aircraft / condition),
  applied-adjustments bookkeeping (per-branch `appliedAdjustments`
  flags), metadata shape, purity (referential transparency).
- `types.test.ts` — sanity coverage для `LANDING_MODES` / `YES_NO_VALUES`
  const arrays.

**Unit-тесты data:**

- `repository.test.ts` — memoization, schemaVersion mismatch, unknown
  aircraft / runway keys (strict objects), non-integer KT values,
  `engineInopAutolandLimit <= 0`, `catIIIIICap <= 0`, phase mismatch,
  non-shaped JSON.

**UI-тесты:**

- `CrosswindLandingResult.test.tsx` — snapshot и behaviour для idle /
  data-not-available / error variants + compact↔regular sizing.

**Coverage threshold:** Domain ≥ 90%, общий по модулю ≥ 70% (per
jest.config.js global threshold).

## Версионирование

- `schemaVersion` (semver) — структура файла. MVP: `1.0.0`.
- `dataVersion` (date-based) — конкретный набор значений. MVP:
  `2026-05-23.001`. Инкрементируется при любом изменении `baseTable`,
  `adjustments`, или `engineInopAutolandLimit`.

При обновлении JSON:

1. Обновить значения.
2. Инкрементировать `dataVersion`.
3. Обновить `LANDING_ANCHORS` в `acceptance.test.ts`, если затронуты
   anchor-cases.
4. PR `chore(data): update landing values to <new-dataVersion>`.

## Эволюция модуля

- **Уровень 1** (значения) — только JSON. Код не трогается.
- **Уровень 2** (новые adjustment-кнопки) — добавить дискриминант в
  `CrosswindLandingInput`, расширить `calculator.ts` ветвью,
  обновить zod-схему. Backward-compatible если поле опциональное.
- **Уровень 3** (новый aircraft) — добавить ключ в `byAircraft` JSON +
  расширить `AircraftVariant` в `core/aviation/types.ts`. Затрагивает
  оба crosswind модуля одновременно.
- **Уровень 4** (структура данных) — major schema bump. Schema 2.0.0+
  если когда-либо потребуется (например, добавление wind direction
  → автоматического crosswind component).

## Открытые вопросы

1. Должны ли `appliedAdjustments` (catCap / asymPenalty / inopCap)
   отображаться в UI? MVP — нет (метаданные только в output для будущего
   debug-overlay или verification). Решение пересмотрит первый
   пользовательский фидбек после релиза.
2. Локализация aviation-терминов (Autoland, CAT II-III, ONE ENG INOP)
   — закрыт, AGENTS.md Rule 9: остаются на английском в обоих локалях.
