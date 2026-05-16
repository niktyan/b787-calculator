# 05 · Crosswind Calculation Algorithm

## Назначение документа

Этот документ — **математически точная спецификация алгоритма расчёта максимально допустимого бокового ветра для взлёта Boeing 787-8**. Он содержит:

- Описание strategy-dispatched архитектуры и реализованной в PR 1 стратегии `bracketedLinear` (Dry / RWYCC 6).
- Точное описание модели и формул `bracketedLinear`.
- Покрытие всех граничных случаев.
- Авторитативную тест-таблицу (input → expected output) минимум 35 кейсов, по которым будет писаться unit-тест-сьют.
- Скелет реализации в TypeScript-стиле.
- Стратегию fail-safe.

**Правило точности:** любое расхождение между этим документом и реализацией в коде является багом. Любое расхождение между реализацией и тест-таблицей блокирует merge PR.

Алгоритм `bracketedLinear` **точно повторяет поведение Excel-формулы** из исходного файла заказчика (`123.xlsm`), включая все её особенности (специфика IFNA-fallback, ROUNDDOWN-поведение, разрыв на границах брекетов). Это сознательное проектное решение — см. секцию «Особенности Excel-эквивалентного поведения».

---

## Strategy dispatch (Architecture)

`calculateCrosswindLimit` — это **тонкая оркестрация**:

1. **Step 0** — `validateAlgorithmInput` (defence-in-depth: NaN / Infinity / phase mismatch).
2. **Step 1** — `resolveStrategy(input.aircraft, input.runwayCondition, data)` ищет `(aircraft × condition)` dataset и конструирует `CrosswindStrategy` соответствующего типа (или возвращает `NoLookupData` с reason `aircraft-not-implemented` / `condition-not-implemented`).
3. **Step 2** — `strategy.calculate(input)` выполняет сам расчёт.

`StrategyType` дискриминатор (см. `04-domain-model.md` § «Strategy
variants»):

| Type | Применяется к | Статус |
|------|---------------|--------|
| `bracketedLinear` | Dry (RWYCC 6) | **Active** — описан ниже |
| `variableSlopeBracketed` | Medium (RWYCC 3) | Stub (PR 5) |
| `cgOnlyPiecewise` | MediumToPoor (RWYCC 2) | Stub (PR 6) |
| `constant` | Poor (RWYCC 1) | Stub (PR 7) |
| `notAllowed` | RWYCC 0 | Stub (PR 8) |

Остальные секции этого документа описывают **`bracketedLinear`**. Когда
PR 5/6/7/8 активируют свои стратегии, к этому документу добавятся
аналогичные секции с уравнениями и тест-таблицами для каждой.

---

## Высокоуровневое описание стратегии `bracketedLinear`

Модель: **piecewise-linear surface в 3D-пространстве (Weight, CG, MaxCrosswind)**.

Геометрически: пять параллельных линий в плоскости (Weight, CG), каждая описывает «потолок» для одного из дискретных значений crosswind (40, 35, 30, 25, 20 KT). Все линии имеют одинаковый наклон по весу. Чем выше CG (для данного веса), тем ниже допустимый crosswind.

Между линиями значение интерполируется. Ниже самой нижней линии (low CG) → максимальный crosswind 40 KT. Выше самой верхней линии (high CG) → особый IFNA-fallback (см. ниже).

---

## Константы алгоритма

Все константы хранятся в bundled JSON (`b787-takeoff.json`,
вложенно по пути `byAircraft.b787_8.dry`). В коде они **не
хардкодятся** — читаются из JSON при инициализации репозитория и
передаются в стратегию в виде `BracketedLinearParams + StrategyContext`.

| Константа | Значение | Откуда |
|-----------|----------|--------|
| Конверсия вес → kilolbs | `tonsToKilolbsFactor = 2.20462` | JSON, top-level `weightConversion.tonsToKilolbsFactor` |
| Общий наклон | `slope = 0.0576` | JSON, `byAircraft.b787_8.dry.params.slope` |
| Точка 1 (макс. crosswind) | `crosswind = 40 KT, intercept = 6.1` | JSON, `…dry.params.brackets[0]` |
| Точка 2 | `crosswind = 35 KT, intercept = 9.3` | JSON, `…params.brackets[1]` |
| Точка 3 | `crosswind = 30 KT, intercept = 12.8` | JSON, `…params.brackets[2]` |
| Точка 4 | `crosswind = 25 KT, intercept = 16.3` | JSON, `…params.brackets[3]` |
| Точка 5 (мин. crosswind) | `crosswind = 20 KT, intercept = 19.8` | JSON, `…params.brackets[4]` |
| Max-cap | `null` (no clamp) | JSON, `…params.maxCap`; PR 2 переключит на `37` для Dry |
| Decimals (ROUNDDOWN precision) | `0` (integer floor) | JSON, `…params.decimals` |

---

## Поэтапный алгоритм

### Шаг 0. Валидация data-availability

Перед расчётом проверяется:
- `phase === data.phase` (MVP: `'takeoff'`). Иначе →
  `Result.error({ kind: 'DataNotAvailable', reason: 'phase-mismatch' })`.
- Входные значения числовые и конечные. NaN / Infinity →
  `Result.error({ kind: 'NoLookupData', reason: 'NaN' | 'NotFinite' })`.
  (Эти случаи на практике не должны возникать — Value Objects
  `WeightInTons` / `CGPercentMAC` уже отвергают их в фабриках; шаг 0 —
  defence in depth.)
- Lookup `data.byAircraft[input.aircraft]`. Отсутствует →
  `Result.error({ kind: 'DataNotAvailable',
  reason: 'aircraft-not-implemented' })`.
- Lookup `…[input.runwayCondition]`. Отсутствует →
  `Result.error({ kind: 'DataNotAvailable',
  reason: 'condition-not-implemented' })`.

**Operational-envelope валидация (вес/CG в регуляторных пределах) здесь
НЕ выполняется.** Алгоритм — это «pure data lookup». Проверка
operational envelope — отдельная функция use-case layer
`validateOperationalEnvelope` (см. `module-contracts/crosswind.md`
Public API). За пределами envelope UI показывает warning chip рядом с
вычисленным значением, но число остаётся на экране (см. `06-ui-spec.md`
Экран 4 ResultPanelState).

Если data-availability проверки пройдены — переходим к Шагу 1.

### Шаг 1. Конвертация веса в kilolbs

```
weightKilolbs = weightTons × tonsToKilolbsFactor
```

Результат — обычное `number`, не Value Object. Внутренняя промежуточная переменная.

### Шаг 2. Вычисление CG-порогов для всех breakpoints

Для каждого breakpoint `i ∈ {0, 1, 2, 3, 4}`:

```
threshold[i] = slope × weightKilolbs + breakpoints[i].intercept
```

Получаем массив из 5 порогов, отсортированный **по возрастанию** (так как `intercept` возрастает: 6.1 → 9.3 → 12.8 → 16.3 → 19.8). Каждому порогу соответствует значение crosswind в KT (40, 35, 30, 25, 20 — **убывающее**).

### Шаг 3. Поиск нижнего и верхнего порогов вокруг входного CG

Имитируем поведение `XLOOKUP` из Excel:

```
lowerBound = найти максимальный threshold[i], такой что threshold[i] ≤ cgPercent
upperBound = найти минимальный threshold[j], такой что threshold[j] ≥ cgPercent
```

Возможные результаты:

- **Both found** (типичный случай): CG находится в брекете между двумя порогами, или ровно на пороге.
- **lowerBound not found** (CG < threshold[0] = 27.687... при W=170): cgPercent ниже всех порогов.
- **upperBound not found** (CG > threshold[4] = 41.387... при W=170): cgPercent выше всех порогов.

### Шаг 4. Применение формулы интерполяции (либо fallback)

**Случай A · Both bounds found:**

```
F7 = crosswind associated with lowerBound  // например 35 KT
F8 = crosswind associated with upperBound  // например 30 KT
E7 = lowerBound threshold value
E8 = upperBound threshold value

E9 = (E8 - E7) / 5

resultRaw = F7 - (cgPercent - E7) × E9

result = floor(resultRaw)  // ROUNDDOWN-эквивалент для положительных значений
```

**Особый sub-case · cgPercent ровно на пороге:**

При `cgPercent === threshold[i]` для некоторого `i` обе границы возвращают одно и то же значение: `lowerBound = upperBound = threshold[i]`, `F7 = F8`, `E9 = 0`. Тогда `resultRaw = F7 - 0 = F7`. Результат — точное значение crosswind для этого breakpoint.

**Случай B · lowerBound not found** (CG ниже всех порогов):

```
result = 40
```

Это соответствует поведению Excel-формулы `IFNA(..., 40)`, когда XLOOKUP с режимом -1 возвращает `#N/A`.

**Случай C · upperBound not found** (CG выше всех порогов):

```
result = 40
```

**Это намеренно сохранённая особенность Excel-формулы.** Логически результат должен был быть «20 или меньше» (поскольку все breakpoints исчерпаны), но в исходной Excel-формуле IFNA-обёртка ловит ошибку расчёта `E9 = #N/A` и подставляет 40. Мы сохраняем это поведение для точного соответствия эталону.

### Шаг 5. Построение метаданных

После расчёта собирается `CalculationMetadata` (см. 04-domain-model.md):
- `dataVersion` из JSON
- `referenceDocument` из JSON
- Использованный `weightBracket` (фактически — диапазон `[weightTons, weightTons]`, поскольку алгоритм считает для конкретного веса)
- Использованный `cgBracket = [E7, E8]` или специальные значения для случаев B/C
- `bracketCrosswindRange = [F8, F7]` (or `[40, 40]` для fallback-случаев)
- `calculationStrategy = 'within-bracket' | 'below-envelope' | 'above-envelope'`

### Шаг 6. Возврат результата

```typescript
return Result.ok({
  maxCrosswindKnots: makeCrosswindKnots(result),
  metadata: { ... }
});
```

---

## Особенности Excel-эквивалентного поведения

Эти особенности являются **сознательно сохранённой спецификой исходной Excel-формулы**. Они могут показаться «математически странными», но мы их повторяем точно, потому что это — авторитативная модель пилотов авиакомпании, валидированная в реальной операционной практике.

### Особенность 1 · Above-envelope возвращает 40, а не 20

Когда CG превышает все пять порогов, логически следовало бы вернуть 20 KT (или меньше — поскольку CG ещё «более aft» чем граница 20 KT). Но Excel-формула, благодаря IFNA-обёртке, возвращает 40 KT. Мы повторяем это поведение точно.

**Практическое значение:** на реальных весах B787-8 верхний порог (`threshold[4]`) находится около 35–41 %MAC в зависимости от веса. Реальные операционные CG B787-8 не превышают ~35 %MAC, поэтому случай возникает редко. Тем не менее, тесты должны его покрывать.

### Особенность 2 · Слабая разрывность на границах брекетов

Из-за способа вычисления `E9 = (E8-E7)/5`, формула не достигает значения `F8` точно на границе `E8`. Например, при W=170 t, между брекетами [40 KT @ D7=27.6876] и [35 KT @ D8=30.8876]:

- При `CG = 30.886` (на 0.001 ниже D8): result = 37 KT.
- При `CG = 30.8876` (точно D8): result = 35 KT.

Это «прыжок на 2 KT» при пересечении точной границы. Линейная математическая интерполяция дала бы плавный переход через 36 KT. Мы сохраняем разрывное поведение Excel-формулы, потому что договорились на точное соответствие.

### Особенность 3 · ROUNDDOWN всегда вниз, не банковское округление

Округление выполняется как `Math.floor()` (для положительных значений) — ровно как `ROUNDDOWN(value, 0)` в Excel. Это **более консервативный** результат: 38.99 KT округляется до 38, а не до 39. Это работает в пользу безопасности (advisory limit получается чуть строже).

---

## Aircraft variant — MVP

В MVP bundled JSON содержит lookup-данные **только для `b787_8`**;
ветка `byAircraft.b787_9` отсутствует. Все алгоритмические test-кейсы
ниже фиксируют `aircraft: 'b787_8'`. Запрос `aircraft: 'b787_9'`
(или любого другого варианта) при любом `weight / cg / phase /
condition` возвращает
`Result.error({ kind: 'DataNotAvailable', reason: 'aircraft-not-implemented' })`
без обращения к piecewise-linear-функции. Это поведение покрывается
отдельным тестом в `__tests__/calculator.test.ts`.

Аналогично для всех non-dry значений `RunwayCondition` (`good`,
`mediumToGood`, `medium`, `mediumToPoor`, `poor`) — в MVP они
помечены disabled в UI и при программном запросе возвращают
`DataNotAvailable.reason: 'condition-not-implemented'`.

---

## Тест-таблица (авторитативная)

Эта таблица — единственный источник правды для unit-тестов. Каждая строка — отдельный test case в `crosswind/__tests__/calculator.test.ts`. Все значения CG-порогов вычислены точно: `threshold = 0.0576 × (weightTons × 2.20462) + intercept`.

**Aircraft / phase / runway condition фиксированы для всех Test
Sets #1–#3:** `aircraft: 'b787_8'`, `phase: 'takeoff'`,
`runwayCondition: 'dry'`. Эти значения входят в каждый
`calculateCrosswindLimit` call — в таблицах ниже опущены ради
читаемости.

**Test sets ownership.** Sets #1–#3 + #5 — тесты алгоритма (`calculateCrosswindLimit`); #4 — тесты use-case-функции `validateOperationalEnvelope`. Это разделение явное: алгоритм НЕ проверяет operational envelope (см. Шаг 0 выше), поэтому test cases типа «CG=40 → InvalidInput» относятся к валидатору, а не к алгоритму. То же самое CG=40 при тех же threshold-ах остаётся валидным входом для алгоритма и даёт численный результат.

**Strategy column note.** Колонка «Strategy» в таблицах ниже отражает поведение `CalculationMetadata.calculationStrategy`. Этот enum имеет ровно три значения: `'within-bracket' | 'below-envelope' | 'above-envelope'`. В тест-описаниях встречается ярлык «exact-breakpoint» — это документационная сабкатегория `within-bracket`, когда `cgPercent` совпадает ровно с одним из threshold-ов (тогда `lower = upper`, `E9 = 0`, `result = F7 = F8`). Алгоритм возвращает `within-bracket` для этого случая; runtime-строка enum-а не равна `'exact-breakpoint'`.

### Test set #1 · Weight = 170 t (W_kilolbs = 374.7854)

Thresholds для этого веса:
- `T₁ (40 KT) = 0.0576 × 374.7854 + 6.1 = 27.68763904`
- `T₂ (35 KT) = 30.88763904`
- `T₃ (30 KT) = 34.38763904`
- `T₄ (25 KT) = 37.88763904`
- `T₅ (20 KT) = 41.38763904`

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 1.01 | 170 | 8.0 | 40 | below-envelope | CG значительно ниже T₁; IFNA-fallback |
| 1.02 | 170 | 15.0 | 40 | below-envelope | Тот же сценарий |
| 1.03 | 170 | 25.0 | 40 | below-envelope | Тот же сценарий |
| 1.04 | 170 | 27.0 | 40 | below-envelope | CG ниже T₁ (27.6876), но близко |
| 1.05 | 170 | 27.68763904 | 40 | within-bracket | Ровно на T₁; lower = upper = T₁; F7=F8=40 (exact-breakpoint sub-case) |
| 1.06 | 170 | 27.7 | 39 | within-bracket | Чуть выше T₁; result_raw ≈ 39.992; floor → 39 |
| 1.07 | 170 | 28.0 | 39 | within-bracket | result_raw ≈ 39.800; floor → 39 |
| 1.08 | 170 | 30.0 | 38 | within-bracket | result_raw ≈ 38.520; floor → 38 |
| 1.09 | 170 | 30.886 | 37 | within-bracket | Чуть ниже T₂; разрывность; floor → 37 |
| 1.10 | 170 | 30.88763904 | 35 | within-bracket | Ровно на T₂; F7=F8=35; result=35 (exact-breakpoint sub-case) |
| 1.11 | 170 | 31.0 | 34 | within-bracket | result_raw ≈ 34.921; floor → 34 |
| 1.12 | 170 | 32.0 | 34 | within-bracket | result_raw ≈ 34.221; floor → 34 (соответствует видео) |
| 1.13 | 170 | 33.0 | 33 | within-bracket | result_raw ≈ 33.521; floor → 33 |
| 1.14 | 170 | 34.387 | 32 | within-bracket | Чуть ниже T₃; floor → 32 |
| 1.15 | 170 | 34.38763904 | 30 | within-bracket | Ровно на T₃; F7=F8=30 (exact-breakpoint sub-case) |
| 1.16 | 170 | 34.4 | 29 | within-bracket | Чуть выше T₃; floor → 29 |
| 1.17 | 170 | 35.0 | 29 | within-bracket | result_raw ≈ 29.571; floor → 29 |
| 1.18 | 170 | 36.0 | 28 | within-bracket | result_raw ≈ 28.871; floor → 28 |
| 1.19 | 170 | 37.88763904 | 25 | within-bracket | Ровно на T₄ (exact-breakpoint sub-case) |
| 1.20 | 170 | 38.0 | 24 | within-bracket | Чуть выше T₄; floor → 24 |
| 1.21 | 170 | 40.0 | 23 | within-bracket | result_raw ≈ 23.521; floor → 23 |
| 1.22 | 170 | 41.38763904 | 20 | within-bracket | Ровно на T₅ (exact-breakpoint sub-case; последний breakpoint) |
| 1.23 | 170 | 42.0 | 40 | above-envelope | CG выше T₅; IFNA-fallback (Excel-quirk!) |
| 1.24 | 170 | 50.0 | 40 | above-envelope | Same |

### Test set #2 · Weight = 130 t (W_kilolbs = 286.6006)

Thresholds для этого веса:
- `T₁ (40 KT) = 0.0576 × 286.6006 + 6.1 = 22.60819456`
- `T₂ (35 KT) = 25.80819456`
- `T₃ (30 KT) = 29.30819456`
- `T₄ (25 KT) = 32.80819456`
- `T₅ (20 KT) = 36.30819456`

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 2.01 | 130 | 10.0 | 40 | below-envelope | CG значительно ниже T₁ |
| 2.02 | 130 | 22.6 | 40 | below-envelope | Чуть ниже T₁ (22.608) |
| 2.03 | 130 | 22.60819456 | 40 | within-bracket | Ровно на T₁ (exact-breakpoint sub-case) |
| 2.04 | 130 | 23.0 | 39 | within-bracket | result_raw ≈ 39.749; floor → 39 |
| 2.05 | 130 | 25.0 | 38 | within-bracket | result_raw ≈ 38.469; floor → 38 |
| 2.06 | 130 | 27.0 | 34 | within-bracket | В бракете [T₂, T₃]; result_raw ≈ 34.166; floor → 34 |
| 2.07 | 130 | 30.0 | 29 | within-bracket | В бракете [T₃, T₄]; result_raw ≈ 29.516; floor → 29 |
| 2.08 | 130 | 35.0 | 23 | within-bracket | В бракете [T₄, T₅]; result_raw ≈ 23.466; floor → 23 |
| 2.09 | 130 | 36.30819456 | 20 | within-bracket | Ровно на T₅ (exact-breakpoint sub-case) |
| 2.10 | 130 | 38.0 | 40 | above-envelope | CG выше T₅; IFNA-fallback |

### Test set #3 · Weight = 160 t (W_kilolbs = 352.7392)

Thresholds для этого веса:
- `T₁ = 0.0576 × 352.7392 + 6.1 = 26.41777792`
- `T₂ = 29.61777792`
- `T₃ = 33.11777792`
- `T₄ = 36.61777792`
- `T₅ = 40.11777792`

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 3.01 | 160 | 20.0 | 40 | below-envelope | |
| 3.02 | 160 | 26.41777792 | 40 | within-bracket | Ровно на T₁ (exact-breakpoint sub-case) |
| 3.03 | 160 | 27.0 | 39 | within-bracket | result_raw ≈ 39.627 |
| 3.04 | 160 | 30.0 | 34 | within-bracket | В бракете [T₂, T₃]; result_raw ≈ 34.732 |
| 3.05 | 160 | 33.0 | 32 | within-bracket | result_raw ≈ 32.633 |
| 3.06 | 160 | 35.0 | 28 | within-bracket | В бракете [T₃, T₄]; result_raw ≈ 28.682 |
| 3.07 | 160 | 40.0 | 22 | within-bracket | В бракете [T₄, T₅]; result_raw ≈ 22.633 |

### Test set #4 · Operational-envelope validator (use-case layer, NOT algorithm)

**Important.** Эти кейсы тестируют функцию `validateOperationalEnvelope`
из use-case layer (см. `module-contracts/crosswind.md` Public API), а
НЕ сам алгоритм. Алгоритм (`calculateCrosswindLimit`) для тех же входов
вернёт численный результат — operational envelope проверяется отдельно.
`operationalEnvelope` для MVP взят из bundled JSON (`weight ∈ [110, 172]
tons`, `cg ∈ [8, 35] %MAC`), но эти числа — placeholder, уточняются на
Phase B (см. Open questions).

Test cases #4.01–4.04: validator returns `EnvelopeViolation` (не
`InvalidInput`). UI на эти кейсы реагирует warning chip-ом рядом с
численным результатом, рассчитанным алгоритмом.

Test cases #4.05–4.07: NaN / Infinity / negative — отсекаются на уровне
Value Object factories (`makeWeightInTons`, `makeCGPercentMAC`), до
вызова и алгоритма, и validator-а. Соответствующие ошибки — `WeightError`
/ `CGError`.

| # | Layer | Weight (t) | CG (%MAC) | Expected | Reason |
|---|-------|------------|-----------|----------|--------|
| 4.01 | Validator | 100 | 25 | EnvelopeViolation.weight.below | weight < 110 |
| 4.02 | Validator | 200 | 25 | EnvelopeViolation.weight.above | weight > 172 |
| 4.03 | Validator | 150 | 5 | EnvelopeViolation.cg.below | cg < 8 |
| 4.04 | Validator | 150 | 40 | EnvelopeViolation.cg.above | cg > 35 |
| 4.05 | Value Object | 150 | NaN | CGError.NotANumber | cg не число |
| 4.06 | Value Object | NaN | 25 | WeightError.NotANumber | weight не число |
| 4.07 | Value Object | -5 | 25 | WeightError.Negative | weight отрицательный |

### Test set #5 · Data integrity (повреждённые данные)

Эти тесты не для алгоритма как такового, а для слоя `data` (репозитория). Они проверяют, что некорректный JSON триггерит `CorruptedDataBundle`.

| # | Сценарий | Expected |
|---|----------|----------|
| 5.01 | `byAircraft.b787_8.dry.interpolation.breakpoints.length === 4` | CorruptedDataBundle |
| 5.02 | `byAircraft.b787_8.dry.interpolation.slope === 0` | CorruptedDataBundle (zero slope невалиден) |
| 5.03 | `byAircraft` содержит неизвестный ключ (например `b777_300`) | CorruptedDataBundle (zod `.strict()` failure) |
| 5.04 | `byAircraft.b787_8.dry.interpolation.breakpoints` с не-возрастающими `intercept` | CorruptedDataBundle |
| 5.05 | `operationalEnvelope.weight.minTons > operationalEnvelope.weight.maxTons` | CorruptedDataBundle |

---

## Скелет TypeScript-реализации

Для агента-реализатора. Это **не финальный код**, а контракт интерфейса.

### Top-level orchestrator (strategy dispatch)

```typescript
// src/features/crosswind/domain/calculator.ts

import type { Result } from '@/core/result';
import type { CrosswindDataFile } from '../data/schema';
import type {
  CrosswindCalculationError,
  CrosswindCalculationOutput,
} from './types';
import type { CalculatorInput } from './strategy';

export function calculateCrosswindLimit(
  input: CalculatorInput,
  data: CrosswindDataFile,
): Result<CrosswindCalculationOutput, CrosswindCalculationError>;
```

```typescript
// псевдокод тела функции (для понимания, не финальный код)

function calculateCrosswindLimit(input, data) {
  // Step 0: defence-in-depth NaN/Infinity + phase check.
  const v = validateAlgorithmInput(input, data);
  if (!v.ok) return v;

  // Step 1: resolve the strategy for (aircraft, condition).
  const resolution = resolveStrategy(input.aircraft, input.runwayCondition, data);
  if (resolution.kind === 'no-lookup-data') {
    return error('DataNotAvailable', resolution.reason);
  }

  // Step 2: pure-function calculation inside the strategy.
  //         (Operational-envelope validation is NOT performed here —
  //          see `validateOperationalEnvelope` in the use-case layer.)
  return resolution.strategy.calculate(input);
}
```

### Strategy interface (shared across PR 5/6/7/8)

```typescript
// src/features/crosswind/domain/strategy.ts

export interface CrosswindStrategy {
  readonly type: StrategyType;  // discriminator
  calculate(
    input: CalculatorInput,
  ): Result<CrosswindCalculationOutput, CrosswindCalculationError>;
}
```

### `bracketedLinear` strategy (PR 1)

```typescript
// src/features/crosswind/domain/strategies/bracketed-linear.ts

export function createBracketedLinearStrategy(
  params: BracketedLinearParams,    // brackets[5], slope, maxCap, decimals
  context: BracketedLinearContext,  // aircraft, dataVersion, referenceDocument, tonsToKilolbsFactor
): CrosswindStrategy;
```

```typescript
// псевдокод тела strategy.calculate (для понимания, не финальный код)

function calculate(input) {
  // Step 1: convert weight to kilolbs
  const weightKilolbs = input.weightTons * context.tonsToKilolbsFactor;
  if (!Number.isFinite(weightKilolbs)) return error('NoLookupData', 'NotFinite');

  // Step 2: compute thresholds for all brackets
  const thresholds = params.brackets.map(b => ({
    crosswind: b.crosswindKnots,
    threshold: params.slope * weightKilolbs + b.intercept,
  }));

  // Step 3: find lower and upper bounds (XLOOKUP-equivalent)
  const lowerBound = …largest threshold ≤ cg…
  const upperBound = …smallest threshold ≥ cg…

  // Step 4: apply formula or IFNA fallback (= params.brackets[0].crosswindKnots)
  let result: number;
  let strategy: 'within-bracket' | 'below-envelope' | 'above-envelope';

  if (lowerBound === null) {
    result = params.brackets[0].crosswindKnots;   // IFNA fallback
    strategy = 'below-envelope';
  } else if (upperBound === null) {
    result = params.brackets[0].crosswindKnots;   // Excel IFNA quirk
    strategy = 'above-envelope';
  } else {
    const f7 = lowerBound.crosswind;
    const e7 = lowerBound.threshold;
    const e8 = upperBound.threshold;
    const e9 = (e8 - e7) / 5;
    const resultRaw = f7 - (input.cgPercent - e7) * e9;
    result = roundDown(resultRaw, params.decimals);  // ROUNDDOWN at params.decimals precision
    strategy = 'within-bracket';
  }

  // Step 4b: maxCap clamp (PR 2+ Dry: 37; PR 1: null = no-op)
  if (params.maxCap !== null && result > params.maxCap) {
    result = params.maxCap;
  }

  // Step 5: build metadata, Step 6: return.
  …
}
```

---

## Стратегия fail-safe

Если на любом шаге возникает аномалия, не покрытая тест-таблицей:

- **NaN/Infinity** в промежуточных вычислениях → `Result.error({ kind: 'CalculationFailed', reason: 'numeric overflow or NaN' })`. UI показывает «Calculation unavailable. Verify inputs and try again.», никогда не показывает число.
- **Несоответствие aircraft/phase/condition** между input и data file → `Result.error({ kind: 'DataNotAvailable' })`. UI показывает «This combination is not yet supported.».
- **Структурно повреждённый JSON** (поймано на уровне zod в data-слое) → `Result.error({ kind: 'CorruptedDataBundle' })`. UI показывает fail-safe экран с retry и контактом поддержки.

UI **никогда не показывает число**, если есть любая ошибка в Result. Молча показывать «—» тоже нельзя — пилот должен явно увидеть, что приложение не смогло посчитать, и понять причину.

---

## Performance budget

- Полный расчёт от вызова `calculateCrosswindLimit` до возврата результата — не более **5 ms** на тестовом устройстве (iPad 9-го поколения как baseline). Реальная сложность алгоритма O(1) с константными арифметическими операциями, реальное время — микросекунды.
- Загрузка JSON из bundle и его zod-валидация — однократно при первом обращении, не более **50 ms**. После — кэшируется в репозитории.

---

## Стратегия эволюции алгоритма

Этот раздел описывает, **как впоследствии менять и улучшать алгоритм без риска сломать существующие данные, тесты или релизы**. Эволюция алгоритма — ожидаемый процесс, и проект спроектирован так, чтобы делать её было легко.

### Уровни изменений

Возможные изменения в алгоритме делятся на четыре уровня по степени влияния. Для каждого уровня — своя стратегия.

**Уровень 1 · Корректировка значений (intercept, slope, breakpoints).**
Например: «Boeing выпустил новую ревизию FCOM, intercept для 35 KT теперь 9.4 вместо 9.3».
- Изменение происходит **только в JSON** (`b787-takeoff.json` для MVP-такеоф-таблицы; в Phase 2 аналогично для `b787-landing.json`).
- Код не трогается.
- `dataVersion` инкрементируется (`2026-04-29.001` → `2026-05-15.001`).
- Тесты пересчитываются: открывается отдельный PR, в котором обновляется и JSON, и таблица ожидаемых значений в `acceptance.test.ts`.
- App Store update либо OTA-update через EAS Update.

**Уровень 2 · Добавление breakpoints (например, 6-я точка).**
Например: «нужна точка 38 KT между 40 и 35 для более тонкого разрешения».
- Изменение в JSON: добавляется новый элемент в `breakpoints`.
- В коде: алгоритм работает с любым количеством breakpoints (он итерирует по массиву, а не по индексам). Менять не надо.
- zod-схема: убирается ограничение `.length(5)` или меняется на `.min(2)`. Это правка одной строки.
- Тесты: расширяются на новые случаи интерполяции.
- `schemaVersion` поднимается minor (1.0.0 → 1.1.0), потому что структура данных совместима с предыдущим кодом.

**Уровень 3 · Изменение интерполяционной модели.**
Например: «переходим с Excel-эквивалентной разрывной интерполяции на чистую линейную (без quirk-а с E9)».
- В JSON меняется `interpolation.model`: `'piecewise-linear-excel-equivalent'` → `'piecewise-linear-pure'`.
- В коде: появляется новая чистая функция `calculateCrosswindLimit_pureLinear` рядом с существующей `calculateCrosswindLimit_excelEquivalent`. Обе живут одновременно.
- Public API модуля Crosswind использует **strategy pattern**: главная функция `calculateCrosswindLimit` смотрит на `data.interpolation.model` и делегирует расчёт нужной чистой функции.
- Старые тесты остаются — они тестируют `excelEquivalent`-вариант.
- Новые тесты добавляются для `pureLinear`-варианта со своей таблицей ожидаемых значений.
- `schemaVersion` поднимается minor (новый разрешённый литерал в enum), `dataVersion` пересчитывается.
- Какой вариант использует приложение в production — решается в JSON. Можно даже A/B-тестировать через два разных bundled-файла, выбирая загружаемый по feature-flag.

**Уровень 4 · Принципиально другой алгоритм (не piecewise-linear).**
Например: «делаем bilinear interpolation в 2D-плоскости (Weight, CG) с настоящей таблицей значений N×M, а не пятью линиями».
- В JSON: `schemaVersion` поднимается major (1.x.x → 2.0.0), потому что структура данных меняется радикально (например, появляется `grid: number[][]` вместо `breakpoints[]`).
- В коде: новая чистая функция `calculateCrosswindLimit_bilinearGrid`. Старые функции остаются для совместимости с пользователями, у которых по какой-то причине ещё не обновлены данные.
- Strategy-dispatcher уже умеет выбирать функцию по `interpolation.model`.
- Тесты: новый набор для bilinear, старые остаются для legacy-моделей.
- При выкладке: в App Store идёт версия приложения, поддерживающая обе модели (старую и новую). Затем — обновление JSON с новым `model: 'bilinear-grid'`. Это исключает риск, что пользователь с устаревшим приложением получит файл нового формата.

### Архитектурные требования к эволюционируемости

Эти правила реализуются с первого коммита, чтобы потом всё работало гладко:

1. **Strategy dispatcher уже есть с MVP.** Даже когда поддерживается только один `model: 'piecewise-linear-excel-equivalent'`, главная функция уже использует switch/factory по этому полю. Добавление нового алгоритма — это добавление одной новой ветки и новой функции, без рефакторинга общего пути.

2. **Алгоритмы — pure functions.** Каждая реализация — чистая функция без доступа к внешним сервисам. Это даёт: (а) тривиальную замену, (б) тривиальное unit-тестирование, (в) детерминированность (одинаковый input → одинаковый output на любой машине).

3. **JSON-схема версионируется отдельно от кода.** `schemaVersion` определяет структуру файла, `dataVersion` — конкретные значения. Это два независимых уровня эволюции.

4. **Тест-таблица — авторитетный артефакт спецификации, не приложения.** Когда меняются значения или модель, тест-таблица обновляется в `05-crosswind-algorithm.md` ОДНОВРЕМЕННО с обновлением кода и JSON. Этот документ всегда отражает реальность production.

5. **Старые модели не удаляются легкомысленно.** Удаление поддержки модели — это major schema bump и сознательное архитектурное решение через ADR. По умолчанию мы поддерживаем backward compatibility для как минимум одного предыдущего major.

### Чек-лист «как улучшить алгоритм через 6 месяцев»

Для разработчика (или агента-реализатора) в будущем:

- [ ] Прочитать `05-crosswind-algorithm.md` целиком, особенно секцию «Стратегия эволюции».
- [ ] Определить уровень изменения (1, 2, 3 или 4) — это определяет план действий.
- [ ] Создать ADR в `ADR/` с обоснованием перехода: что меняется, зачем, какие риски.
- [ ] Открыть feature-ветку, обновить: JSON, код (если уровень ≥ 3), zod-схему (если уровень ≥ 2), тест-таблицу в этом документе, unit-тесты, acceptance-тесты.
- [ ] Прогнать всю старую тест-таблицу — она должна пройти, если уровень ≤ 2 (значения не изменились) или с обновлёнными ожиданиями для уровней 3–4.
- [ ] Создать PR с подробным описанием.
- [ ] После merge — выпустить либо App Store update (для structural changes), либо EAS Update (для значений в JSON, если структура неизменна).

---

## Open questions

1. Точные значения `envelope` (weight 110–172 t, CG 8–35 %MAC) — отложены, см. `04-domain-model.md`. Если в Phase B они изменятся — тест-таблица под Test Set #4 пересчитывается.
2. Должен ли `metadata.calculationStrategy` отображаться в UI явно, или это только debug-информация? Решение: в MVP — debug-only, не показываем пользователю. В Phase 2+ может появиться в expanded-mode.

---

## Exit-критерии этого документа

- [ ] Разработчик понимает все три «особенности Excel-эквивалентного поведения» и согласен их сохранить в коде.
- [ ] Тест-таблица (Test Sets #1–#5) принята как авторитативный источник истины.
- [ ] Скелет TypeScript-реализации отражает то, что разработчик ожидает увидеть в коде.
- [ ] Стратегия fail-safe (UI никогда не показывает число при ошибке) одобрена.
- [ ] Open questions либо закрыты, либо явно отложены.
