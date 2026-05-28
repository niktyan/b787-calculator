# ADR-0017 · Crosswind output rounding policy

**Status:** Accepted
**Date:** 2026-05-28
**Related:** `02_Specification/05-crosswind-algorithm.md` § «Шаг 3»,
`02_Specification/module-contracts/crosswind.md` § «Public API»,
`02_Specification/ADR/0010-crosswind-strategy-pattern.md`,
`src/features/crosswind/domain/rounding.ts`,
`src/features/crosswind/domain/calculator.ts`,
`src/features/crosswind/domain/strategies/`,
`src/features/crosswind/presentation/components/CrosswindResult.tsx`

## Context

До этого ADR каждая стратегия Crosswind (Takeoff) выполняла собственный
ROUNDDOWN-шаг (см. ADR-0010, спецификация 05-crosswind-algorithm §
«Шаг 3»). Параметр `params.decimals: 0 | 1` хранился в bundled JSON
на уровне per-condition и определял точность округления внутри
конкретной стратегии:

- `bracketedLinear` / `variableSlopeBracketed` / `cgOnlyPiecewise` для
  Dry / Good / MediumToGood (`b787_8`, `b787_9`) использовали
  `decimals: 0` — `Math.floor(value)` до целого.
- Те же стратегии для Medium / MediumToPoor использовали
  `decimals: 1` — `Math.floor(value * 10) / 10`.
- `constant` (Poor) не использует ROUNDDOWN вовсе — возвращает
  значение JSON `params.value = 10` как есть.

В этой схеме итоговая точность output'а зависела от того, какое
условие выбрал пилот. Для Dry/Good/MediumToGood пилот видел
целые узлы (например, `38`), для Medium/MediumToPoor — дробные
(например, `23.9`).

Curator-review xlsm-исходников (`787-8 (1).xlsm`, `787-9 (1).xlsm`)
выявил, что **во всех листах** crosswind-таблицы итоговая формула
использует `=ОКРУГЛВНИЗ(...; 1)` — единый ROUNDDOWN до 0.1 KT для
любого RWYCC. Прежняя реализация (целые узлы для Dry/Good/MtG)
оказалась расхождением с авиационным источником, не
консервативной интерпретацией.

Конкретные anchor'ы из xlsm, подтверждённые куратором:

| Aircraft | Condition       | TOW   | CG    | Expected |
|----------|-----------------|-------|-------|----------|
| B787-9   | MediumToGood    | 205 t | 26    | **30.5** |
| B787-9   | Good            | 140 t | 30    | **28.9** |
| B787-9   | Dry             | 140 t | 30    | **34.7** |
| B787-8   | MediumToPoor    | —     | 32    | **13.9** |
| B787-9   | MediumToPoor    | —     | 33.75 | **12.5** |
| B787-{8,9} | Poor          | —     | —     | **10.0** |

При `decimals: 0` для Dry/Good/MtG модель возвращала бы `30 / 28 / 34`
вместо `30.5 / 28.9 / 34.7` — расхождение до 1 KT в неконсервативную
сторону (заявленный лимит ниже истинного, что само по себе ещё
консервативно, но **не соответствует FCOM presentation**, который
пилоту знаком как 0.1-precision значение).

## Decision

Округление output'а Crosswind (Takeoff) — **единое, ROUNDDOWN до 0.1 KT**,
применяется **в единственной точке** на границе калькулятора, после
того как выбранная стратегия вернула результат, и до того как этот
результат уходит в view-model хук.

```ts
// src/features/crosswind/domain/rounding.ts
export function roundDownToTenth(value: number): number {
  return Math.floor(value * 10) / 10;
}
```

Семантика: **truncate toward zero at 0.1 step** (НЕ half-up, НЕ
банковское округление). Для положительных входов эквивалентно Excel
`ROUNDDOWN(value; 1)`.

Применение **в единственном месте** — `calculator.ts`, после
`strategy.calculate(...)`:

```ts
const raw = resolution.strategy.calculate(input);
if (!raw.ok) return raw;
return ok({
  ...raw.value,
  maxCrosswindKnots: makeCrosswindKnots(roundDownToTenth(raw.value.maxCrosswindKnots)),
});
```

Каждая стратегия после этого ADR возвращает **raw**, не-округлённое
значение. Прежний per-strategy ROUNDDOWN-шаг (Шаг 3 в
05-crosswind-algorithm) удаляется из тел `bracketedLinear`,
`variableSlopeBracketed`, `cgOnlyPiecewise`. `constant` стратегия не
меняется (она и так не округляла). Параметр `params.decimals` в bundled
JSON остаётся в schema для backwards-compat валидации существующих
файлов, но **игнорируется в runtime**. Удаление поля — отдельная
schema-bump задача (post-MVP).

Presentation layer (`CrosswindResult.tsx`) форматирует значение через
`value.toFixed(1)` — гарантирует, что пилот всегда видит ровно один
знак после запятой: `10.0`, `12.5`, `28.9`, `34.7`. Это закрывает
кейс «raw integer 10 рендерится как `10`, а не `10.0`».

### Rationale

- **Curator parity.** xlsm-источник использует единое
  `=ОКРУГЛВНИЗ(...; 1)`. Спецификация и код приложения теперь
  бит-в-бит соответствуют тому, что пилот видит в FCOM presentation.
- **Conservative aviation behaviour.** `Math.floor` для положительных
  значений никогда не overstate'ит лимит: `27.890 → 27.8`,
  `30.500 → 30.5`, `34.764 → 34.7`. Пилот никогда не получит
  завышенную оценку из приложения.
- **Single source of truth.** Один файл (`rounding.ts`), одна функция,
  один вызов на границе. Изменение политики (например, переход на
  0.5 KT в будущем) — однострочное.
- **Uniform over special-case.** Для Poor (constant 10) и
  MediumToPoor (cgOnlyPiecewise с plateauValue 15) выходные значения
  уже лежат на 0.1-сетке, поэтому `roundDownToTenth` — no-op:
  `10 → 10`, `13.9 → 13.9` (B787-8 MtP @ CG=32),
  `12.5 → 12.5` (B787-9 MtP @ CG=33.75). Нет специальных веток —
  политика одинаковая для всех 6 RWYCC × 2 ВС.

## Consequences

**Positive:**

- Output для Dry/Good/MediumToGood становится 0.1-precision —
  совпадает с xlsm curator'а и FCOM presentation.
- Стратегии упрощаются: больше не несут precision-параметр в
  formula-шаге; `roundDown(value, decimals)` helper удаляется из
  трёх strategy-файлов.
- Calculator boundary становится единственным enforcement-пунктом:
  для любой будущей стратегии (включая Phase 2 RWYCC 0
  `notAllowed`) политика округления применяется автоматически.
- Тест `result === Math.floor(result * 10) / 10` становится
  module-wide инвариантом — добавляется один integration smoke per
  (strategy × RWYCC × variant).
- Presentation guarantees one-decimal display: `10` → `"10.0"`,
  `12.5` → `"12.5"`. Пилот не путается между разными precision
  для разных RWYCC.

**Negative:**

- Per-strategy unit-тесты с явными целочисленными ожиданиями
  (например, `toBe(38)` для Dry) переводятся на 0.1-precision
  (`toBe(38.5)`). Затрагивает `bracketed-linear-strategy.test.ts`,
  `variable-slope-bracketed-strategy.test.ts`,
  `cg-only-piecewise-strategy.test.ts`, `calculator.test.ts`,
  `acceptance.test.ts`, `good.test.ts`, `medium-to-good.test.ts`,
  `medium-to-poor.test.ts`, `b787-9-acceptance.test.ts`,
  `edgeCases.test.ts`, `poor.test.ts`. Это разовая стоимость
  refactor'а, не повторяющаяся.
- Поле `params.decimals` в bundled JSON и его schema-валидация
  становятся «dead config»: schema по-прежнему требует `0 | 1`, но
  runtime игнорирует значение. Удаление — отдельный
  schema-bump PR (2.4.0), потому что bundled JSON изменения трогают
  data versioning отдельно.
- 05-crosswind-algorithm.md в § «Шаг 3» / § «Особенность 3»
  ссылается на per-strategy ROUNDDOWN. Эти ссылки помечены как
  superseded ADR-0017 (in-place note, без переписывания всей
  спеки в этом PR).

**Neutral:**

- `params.value` в Constant strategy (Poor = 10) остаётся целым в
  JSON. После `roundDownToTenth` и `.toFixed(1)` пилот видит
  `"10.0"`. Это не «искусственное» дробное представление — просто
  единое визуальное правило.
- Negative inputs (теоретически возможные в pathological
  `cgOnlyPiecewise` сценариях с очень большим CG) обрабатываются
  как раньше: `makeCrosswindKnots(negative)` → reject →
  `CalculationFailed`. `roundDownToTenth(-0.05) = -0.1` — `Math.floor`
  округляет в сторону минус-бесконечности, что в данном контексте
  корректнее «truncate toward zero» (хотя в production-flow до
  этой точки не доходит, blocked by VO factory).

## Alternatives considered

**A. Data-only change: `decimals: 0 → 1` в JSON, strategies без
изменений.**

Поменять 6 entries `decimals` в bundled JSON
(`src/features/crosswind/data/b787-takeoff.json`) с `0` на `1`.
Strategies продолжают использовать per-strategy ROUNDDOWN. Boundary
helper не нужен — округление уже происходит в каждой стратегии при
её `decimals: 1`.

Отвергнуто:
- **Политика расфасована.** Реальный ROUNDDOWN-шаг живёт в 3 strategy-
  файлах, а не в одном boundary-месте. Любое будущее изменение политики
  (например, добавление новой стратегии без honoring `decimals`)
  потребует трогать каждый файл — то самое scattering, которого ADR
  избегает.
- **`decimals` data-field остаётся живым параметром, а не deprecated
  config.** Это маскирует факт, что округление перестало быть
  per-condition настройкой.
- Curator (user) явно попросил «src/data НЕ ТРОГАЕМ. Все
  slope/intercept/plateau/slopeDivisor остаются как есть» —
  минимизация bundled data diff'а в этом PR.

**B. Hybrid: оставить per-strategy ROUNDDOWN, добавить boundary
helper как defence-in-depth.**

Strategies продолжают округлять, boundary дополнительно вызывает
`roundDownToTenth`. Для `decimals: 0` strategy выдаст `30`, boundary
сделает `30 → 30.0` (no-op как число, разница только в display).

Отвергнуто:
- **Не решает curator-anchor mismatch.** Для Dry/Good/MtG с
  `decimals: 0` strategy уже потеряла дробную часть; boundary не
  может её восстановить. Anchor `30.5` всё равно вернёт `30.0`.
- Two-step rounding — два места, обе нужно понимать одновременно.
  Когнитивная нагрузка без выигрыша в корректности.

**C. Half-up rounding (`Math.round` / `toFixed(1)` без `Math.floor`).**

Отвергнуто:
- **Авиация: never overstate.** Округление up может выдать
  оптимистичную оценку лимита. `Math.floor` гарантирует
  conservative behaviour.
- xlsm-источник использует `ОКРУГЛВНИЗ` (= ROUNDDOWN = floor), не
  `ОКРУГЛ` (= ROUND = half-up). Соответствие curator'у обязательно.

**D. Banker's rounding (round-half-to-even).**

Отвергнуто по той же причине, что C: any rounding-up branch может
дать optimistic limit. Не соответствует xlsm-источнику.

## Status of the deprecated `params.decimals` field

В этом PR поле остаётся в schema и в JSON, но **игнорируется в коде
strategies**. Это явная technical debt, помеченная для отдельного
schema-bump PR (2.4.0 → 3.0.0 или внутренний clean-up sprint).
Документация в `05-crosswind-algorithm.md` ссылается на ADR-0017 как
on superseder для всех упоминаний `decimals` в формулах стратегий.
