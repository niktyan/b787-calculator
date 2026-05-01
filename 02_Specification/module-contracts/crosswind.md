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
- `calculator.test.ts` — 50+ тест-кейсов из тест-таблицы `05-crosswind-algorithm.md` (Test Sets #1, #2, #3 — ≥ 40 кейсов).
- `validators.test.ts` — Test Set #4 (out-of-envelope валидация — 7 кейсов).
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
