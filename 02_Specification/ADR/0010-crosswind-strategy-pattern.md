# ADR-0010 · Crosswind algorithm — Strategy pattern foundation

**Status:** Accepted
**Date:** 2026-05-17
**Related:** `02_Specification/04-domain-model.md` § «Strategy variants»,
`02_Specification/05-crosswind-algorithm.md` § «Strategy dispatch
(Architecture)», `02_Specification/module-contracts/crosswind.md` §
«Strategy refactor (PR 1 of feat/crosswind-strategy-refactor)»,
`src/features/crosswind/domain/strategy.ts`,
`src/features/crosswind/domain/strategies/bracketed-linear.ts`,
`src/features/crosswind/domain/strategy-resolver.ts`

## Context

В MVP алгоритм расчёта crosswind поддерживает только сухую ВПП (RWYCC 6 / Dry).
Реализация — `calculateExcelEquivalent` в `domain/strategies.ts` — единственная
чистая функция, точно повторяющая Excel-формулу из исходного файла заказчика
(piecewise-linear с IFNA-fallback и ROUNDDOWN). Top-level `calculateCrosswindLimit`
читает `dataset.interpolation.model` и делегирует расчёт этой функции — это уже
своего рода dispatcher, но привязанный к единственной интерполяционной модели.

Phase D roadmap включает поддержку оставшихся пяти ICAO RWYCC значений
(Good / MediumToGood / Medium / MediumToPoor / Poor) — каждое со своей
формулой / параметрами / лимитами:

- **Good (RWYCC 5)**: тот же piecewise подход, что Dry, но с другим
  максимальным cap (37 KT vs нелимитированный для Dry).
- **Medium (RWYCC 3)**: каждый bracket имеет собственный slope.
- **MediumToPoor (RWYCC 2)**: piecewise-linear по CG без зависимости от веса.
- **Poor (RWYCC 1)**: одно константное значение независимо от веса/CG.
- **RWYCC 0**: полёт запрещён — domain-error.

Текущая `calculateExcelEquivalent` подходит для Dry и Good (с добавлением
`maxCap`), но не для остальных трёх форм. Если оставить архитектуру как есть и
добавлять условия по `interpolation.model` напрямую в одну функцию, мы получим:

- Один файл с if-else веткой на каждый RWYCC — 4–5 параллельных формул.
- Сложное тестирование: каждая ветка требует своих fixtures.
- Высокую цену любого рефакторинга: изменения в Dry-ветке могут случайно сломать другие.
- Отсутствие явного контракта «что нужно для новой стратегии».

Это противоречит R15 («Respect the architectural escalation triggers»), а
именно — function > 80 lines / multiple data sources in a feature.

## Decision

Ввести **Strategy pattern foundation** в PR 1 (`feat/crosswind-strategy-refactor`),
до фактической реализации остальных стратегий:

- `StrategyType` дискриминатор — union из 5 литералов (`bracketedLinear`,
  `variableSlopeBracketed`, `cgOnlyPiecewise`, `constant`, `notAllowed`).
- `CrosswindStrategy` — interface `{ type: StrategyType; calculate(input):
  Result<CrosswindCalculationOutput, CrosswindCalculationError> }`.
- Per-strategy `XParams` shape. В PR 1 полностью описан только
  `BracketedLinearParams`; остальные четыре — type-only stubs, которые
  поднимутся в реальные типы в PR 5/6/7/8.
- Bundled JSON меняет shape: `byAircraft[*][*]` теперь содержит
  `{ strategyType, params, metadata }` вместо `{ interpolation, fallback, metadata }`.
  zod discriminated union по `strategyType` валидирует это структурно.
- `resolveStrategy(aircraft, condition, data)` инкапсулирует lookup +
  конструирование стратегии. Возвращает `{ kind: 'strategy', strategy } |
  NoLookupData`.
- Top-level `calculateCrosswindLimit` — тонкая оркестрация:
  `validateAlgorithmInput → resolveStrategy → strategy.calculate`.

В PR 1 активна одна стратегия — `bracketedLinear` (Dry / RWYCC 6),
поведение для Dry **bit-for-bit идентично** предыдущей реализации
(включая Excel IFNA quirk на обоих концах envelope и FP-tolerance
1e-9 для exact-breakpoint detection). PR 2 переключит `maxCap: null →
37` для Dry без изменений кода.

## Consequences

**Positive:**

- Каждая новая стратегия = новый файл `domain/strategies/<name>.ts` +
  одна ветка в `resolveStrategy` + одна ветка в zod discriminated union.
  Нет правок в Dry-коде → нулевой риск регрессии Dry при добавлении
  новых RWYCC.
- Per-strategy unit tests — каждый файл стратегии можно тестировать
  изолированно от других; нет cross-strategy fixtures.
- JSON-данные явно типизированы по стратегии: `strategyType` — discriminator,
  `params` — shape по стратегии. Невалидные комбинации (например, `slope`
  без `brackets`) отвергаются zod-схемой при парсинге.
- `calculateMaxCrosswindTakeoff` остаётся прежним по контракту (Result-shape
  и errors неизменны). Текущие потребители (`useCrosswindCalculator`,
  acceptance tests) не требуют изменений.
- Public API модуля экспортирует `CrosswindStrategy`, `resolveStrategy`,
  `createBracketedLinearStrategy` — будущим PR не нужно ломать barrel.

**Negative:**

- Лишний уровень indirection: вместо `dataset.interpolation.slope` теперь
  `dataset.params.slope`, а вызов проходит через resolver и closure внутри
  стратегии. Для одного MVP-кейса (Dry) это outdone в boilerplate, но
  компенсация — масштабируемость от PR 2.
- 5 type-only stubs живут в `domain/strategy.ts` ещё до того, как их
  поведение существует. Это сознательная цена за полноту дискриминатора:
  TS не позволит случайно "забыть" обработать одну из стратегий.
- `schemaVersion` bumped to 2.1.0 — bundled JSON и тесты, которые мутируют
  старую форму (`dataset.interpolation.*`), требуют обновления (учтено
  в PR 1).

**Neutral:**

- `dataVersion` инкрементирован до `2026-05-17.001`; About-screen
  snapshot переснят в PR 1.
- 4 future-strategy params не экспортируются на уровне модуля — это
  internal-only до тех пор, пока их PR не активируют.
- Тест-таблица в `05-crosswind-algorithm.md` (Test Sets #1–#3, 47 кейсов)
  не меняется: она по-прежнему авторитативно описывает поведение
  `bracketedLinear` для Dry-данных.

## Alternatives considered

**(a) Inline-switch на `interpolation.model` без strategy interface.**
Добавлять if-else / switch по `interpolation.model` внутри одной большой
функции `calculateCrosswindLimit`. Rejected: к PR 5 функция вырастает
до 200+ строк и нарушает R15 escalation trigger (function > 80 lines).
Cross-strategy mutations в shared parameters делают unit-тестирование
fragile.

**(b) Один универсальный алгоритм с runtime-dispatch на параметры.**
Параметризовать единственную функцию так, чтобы она покрывала все 5
RWYCC через настройки в JSON (например, `interpolation.mode = 'linear'
| 'bilinear' | 'constant'`). Rejected: четыре стратегии (variable-slope,
cg-only, constant, notAllowed) имеют принципиально разные shape входных
данных. Универсальная функция требует условной интерпретации полей,
что мутным способом маскирует разные алгоритмы под одним именем.

**(c) Отложить рефакторинг до момента реализации второй стратегии (PR 5).**
Оставить текущий monolithic путь в PR 1 / PR 2, переехать на strategy
только когда станет нужна вторая формула. Rejected: PR 2 (применение
maxCap для Dry) органично укладывается в новый `BracketedLinearParams.maxCap`
без отдельных code-paths; делая рефакторинг сейчас, мы получаем
правильный фундамент для PR 2 + всех последующих RWYCC. Сделать
рефакторинг в PR 5 будет сложнее: придётся одновременно мигрировать
Dry, Good, и новую Medium-стратегию.

**(d) Strategy без resolver — calculator делает switch сам.**
Калькулятор switch-ит по `dataset.strategyType` и вызывает соответствующую
функцию `calculateBracketedLinear / calculateVariableSlopeBracketed / …`.
Rejected: switch-логика дублировалась бы при каждом use-case, который
хочет узнать, какую стратегию применит lookup. `resolveStrategy` —
single source of truth для разрешения; calculator становится действительно
thin orchestrator.
