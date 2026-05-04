# Module Contract · Crosswind

**Path:** `src/features/crosswind/`
**Status:** Active in MVP
**Owner module:** Core, Design System (для зависимостей)

## Ответственность

Feature-модуль Crosswind реализует **главную функциональность приложения в MVP** — расчёт максимально допустимого бокового ветра для посадки Boeing 787-8 на сухой ВПП. Модуль самодостаточен: содержит свою domain-логику, источник данных, UI-экран и тесты.

Алгоритм расчёта детально описан в `02_Specification/05-crosswind-algorithm.md`. Этот контракт фокусируется на **публичном API** модуля и его зависимостях.

## Внутренняя структура

```
src/features/crosswind/
├── presentation/
│   ├── CrosswindScreen.tsx          — главный экран
│   ├── components/
│   │   ├── CrosswindInputForm.tsx   — форма ввода (weight, CG, runway condition)
│   │   ├── CrosswindResult.tsx      — отображение результата
│   │   └── CrosswindSourceChip.tsx  — chip "Reference: 787 FCOM"
│   └── useCrosswindCalculator.ts    — view-model хук
├── domain/
│   ├── types.ts                     — domain-типы
│   ├── valueObjects.ts              — Value Objects (WeightInTons, CGPercentMAC, CrosswindKnots)
│   ├── calculator.ts                — чистая функция расчёта
│   ├── strategies.ts                — implementation для 'piecewise-linear-excel-equivalent'
│   ├── validators.ts                — валидация входных данных
│   ├── lookupRange.ts               — getLookupCGRange query helper (envelope-bar driver)
│   └── errors.ts                    — типы ошибок
├── data/
│   ├── crosswindRepository.ts       — обёртка над JSON-ресурсом
│   ├── schema.ts                    — zod-схема для bundled JSON
│   └── b787-8-landing-dry.json      — opcional: см. примечание ниже
├── __tests__/
│   ├── calculator.test.ts           — тест-таблица из 05-crosswind-algorithm.md
│   ├── validators.test.ts
│   ├── repository.test.ts
│   └── acceptance.test.ts           — end-to-end тесты модуля
└── index.ts                         — barrel
```

**Примечание про расположение JSON-данных.** Bundled JSON-файл может лежать либо в `src/features/crosswind/data/b787-8-landing-dry.json`, либо в более общей папке `src/data/crosswind/`. Решение принимается при имплементации; ESLint правила в `08-quality-gates.md` это допускают. Рекомендуется внутри модуля для самодостаточности.

## Public API

`src/features/crosswind/index.ts`:

```typescript
// Screen для регистрации в навигации
export { CrosswindScreen } from './presentation';

// Domain types для использования снаружи (если понадобится)
export type {
  CrosswindCalculationInput,
  CrosswindCalculationOutput,
  CrosswindCalculationError,
} from './domain';

// Value Objects (для типобезопасной работы с числами в App Shell, если понадобится)
export type {
  WeightInTons,
  CGPercentMAC,
  CrosswindKnots,
} from './domain';

// Pure calculation function (для тестов или future use cases)
export { calculateCrosswindLimit } from './domain';

// Use-case validation (operational envelope — отдельно от lookup envelope).
// См. 04-domain-model.md "Two distinct envelope concepts".
//
// signature:
//   function validateOperationalEnvelope(
//     input: { weightTons: WeightInTons; cgPercent: CGPercentMAC },
//     envelope: { weight: { minTons: number; maxTons: number };
//                 cg:     { minPercent: number; maxPercent: number } },
//   ): Result<void, EnvelopeViolation>;
//
// EnvelopeViolation discriminated union covers the four cases:
//   weight.below, weight.above, cg.below, cg.above.
//
// Use-case calls validateOperationalEnvelope FIRST, then always calls
// calculateCrosswindLimit. UI shows the algorithm's number unconditionally
// (assuming it returned a value); the validator's result drives the warning
// chip next to it.
export { validateOperationalEnvelope } from './domain';
export type { EnvelopeViolation } from './domain';

// Lookup-range query.
//
// signature:
//   interface LookupCGRange { readonly min: number; readonly max: number }
//   function getLookupCGRange(
//     data: CrosswindDataFile,
//     weightTons: WeightInTons,
//   ): LookupCGRange;
//
// Returns the CG (% MAC) interval at the given weight for which the
// lookup table produces an interpolated number rather than the
// IFNA-fallback 40 KT (см. 05-crosswind-algorithm.md Шаг 3 lower /
// upper bound search). Endpoints = `slope × weightKilolbs + intercept`
// for the first and last breakpoints. Pure data introspection — no
// business decisions, no side effects.
//
// Used by the presentation layer to drive the EnvelopePositionBar
// zones (см. 06-ui-spec.md § Экран 4 → "Envelope-position bar"); not
// consumed by `calculateCrosswindLimit` itself.
export { getLookupCGRange } from './domain';
export type { LookupCGRange } from './domain';

// Repository factory (для DI, если понадобится альтернативная реализация)
export { createCrosswindRepository } from './data';
export type { CrosswindRepository } from './data';
```

Что НЕ экспортируется:
- Внутренние компоненты презентации (InputForm, Result, SourceChip).
- View-model хук (`useCrosswindCalculator`) — он используется только внутри `CrosswindScreen`.
- Внутренние strategies, validators, schema.
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
- `calculator.test.ts` — Test Sets #1, #2, #3 + algorithm-only NaN/Infinity cases. ≥ 40 кейсов из тест-таблицы `05-crosswind-algorithm.md`. Тестирует `calculateCrosswindLimit`.
- `valueObjects.test.ts` — Test Set #4 кейсы #4.05–4.07 (NaN / Infinity / negative). Тестирует фабрики `makeWeightInTons` / `makeCGPercentMAC`.
- `validateOperationalEnvelope.test.ts` — Test Set #4 кейсы #4.01–4.04 (вес/CG вне operational envelope). Тестирует use-case-функцию.
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

Версия данных читается из `b787-8-landing-dry.json` поле `dataVersion`. При обновлении JSON:
1. Обновить значения в JSON.
2. Инкрементировать `dataVersion`.
3. Обновить тест-таблицу в `05-crosswind-algorithm.md`.
4. Обновить unit-тесты в `__tests__/calculator.test.ts`.
5. Создать PR `chore(data): update crosswind values to <new-dataVersion>`.

См. `04-domain-model.md` раздел «Правила инкремента dataVersion».

## Эволюция модуля

Модуль спроектирован с явной поддержкой эволюции (см. `05-crosswind-algorithm.md`, раздел «Стратегия эволюции алгоритма»). Уровни изменений:

- **Уровень 1** (значения) — только JSON, код не трогается.
- **Уровень 2** (количество breakpoints) — изменение JSON + zod-схема. Алгоритм работает с любым количеством.
- **Уровень 3** (interpolation model) — strategy pattern, новая чистая функция в `domain/strategies.ts`. Старые остаются для backward compatibility.
- **Уровень 4** (структура данных) — major schema bump, новый формат JSON, новая ветка алгоритма. Старая поддерживается до полной миграции.

Strategy dispatcher уже имплементирован с MVP. Это значит, что добавить новую strategy = добавить функцию + ветку в switch.

## Открытые вопросы

1. Точные значения envelope (weight 110–172 t, CG 8–35 %MAC) — отложены до Phase B. При уточнении JSON и тест-таблица обновляются.
2. Нужно ли передавать `dataVersion` в `CalculationMetadata` для отображения в UI? Решение: да, это сделано (см. `04-domain-model.md`).
