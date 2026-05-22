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
| `bracketedLinear` | Dry (RWYCC 6), Good (RWYCC 5), MediumToGood (RWYCC 4) | **Active** — описан ниже |
| `variableSlopeBracketed` | Medium (RWYCC 3) | **Active** (PR 5) — описан ниже |
| `cgOnlyPiecewise` | MediumToPoor (RWYCC 2) | **Active** (PR 6) — описан ниже |
| `constant` | Poor (RWYCC 1) | **Active** (PR 7) — описан ниже |
| `notAllowed` | RWYCC 0 | Intentional non-implementation (см. Open questions) |

Остальные секции этого документа описывают **`bracketedLinear`**. Когда
PR 5/6/7/8 активируют свои стратегии, к этому документу добавятся
аналогичные секции с уравнениями и тест-таблицами для каждой.

---

## Высокоуровневое описание стратегии `bracketedLinear`

Модель: **piecewise-linear surface в 3D-пространстве (Weight, CG, MaxCrosswind)**.

Геометрически: N параллельных линий в плоскости (Weight, CG), каждая описывает «потолок» для одного из дискретных значений crosswind (для Dry — 5 линий: 40/35/30/25/20 KT; для Good — 6 линий: 40/35/30/25/20/15 KT). Все линии имеют одинаковый наклон по весу. Чем выше CG (для данного веса), тем ниже допустимый crosswind.

Между линиями значение интерполируется. Ниже самой нижней линии (low CG) → максимальный crosswind = `brackets[0].crosswindKnots` (40 KT для Dry и Good). Выше самой верхней линии (high CG) → особый IFNA-fallback (см. ниже).

---

## Константы алгоритма

Все константы хранятся в bundled JSON (`b787-takeoff.json`). В коде
они **не хардкодятся** — читаются из JSON при инициализации
репозитория и передаются в стратегию в виде
`BracketedLinearParams + StrategyContext`.

### Dry (`byAircraft.b787_8.dry`, RWYCC 6)

| Константа | Значение | Откуда |
|-----------|----------|--------|
| Конверсия вес → kilolbs | `tonsToKilolbsFactor = 2.20462` | JSON, top-level `weightConversion.tonsToKilolbsFactor` |
| Общий наклон | `slope = 0.0576` | JSON, `byAircraft.b787_8.dry.params.slope` |
| Точка 1 (макс. crosswind) | `crosswind = 40 KT, intercept = 6.1` | JSON, `…dry.params.brackets[0]` |
| Точка 2 | `crosswind = 35 KT, intercept = 9.3` | JSON, `…params.brackets[1]` |
| Точка 3 | `crosswind = 30 KT, intercept = 12.8` | JSON, `…params.brackets[2]` |
| Точка 4 | `crosswind = 25 KT, intercept = 16.3` | JSON, `…params.brackets[3]` |
| Точка 5 (мин. crosswind) | `crosswind = 20 KT, intercept = 19.8` | JSON, `…params.brackets[4]` |
| Max-cap | `37` (Dry, per FCOM Tab 2.29.2a) | JSON, `…params.maxCap`; PR 2 включил clamp для Dry |
| Decimals (ROUNDDOWN precision) | `0` (integer floor) | JSON, `…params.decimals` |

### Good (`byAircraft.b787_8.good`, RWYCC 5)

Те же strategy + cap, но с **6 брекетами** и единообразными
параметрами (slope/intercept-step uniform per Excel «Good 788» sheet):

| Константа | Значение | Откуда |
|-----------|----------|--------|
| Общий наклон | `slope = 0.06` | JSON, `byAircraft.b787_8.good.params.slope` |
| Точка 1 (макс. crosswind) | `crosswind = 40 KT, intercept = 2` | JSON, `…good.params.brackets[0]` |
| Точка 2 | `crosswind = 35 KT, intercept = 6` | JSON, `…params.brackets[1]` |
| Точка 3 | `crosswind = 30 KT, intercept = 10` | JSON, `…params.brackets[2]` |
| Точка 4 | `crosswind = 25 KT, intercept = 14` | JSON, `…params.brackets[3]` |
| Точка 5 | `crosswind = 20 KT, intercept = 18` | JSON, `…params.brackets[4]` |
| Точка 6 (мин. crosswind) | `crosswind = 15 KT, intercept = 22` | JSON, `…params.brackets[5]` |
| Max-cap | `37` (Good, shared с Dry per FCOM Tab 2.29.2a) | JSON, `…params.maxCap`; активирован в PR 3 |
| Decimals | `0` (integer floor) | JSON, `…params.decimals` |

Единственное структурное отличие Good от Dry — наличие 6-го брекета
(`crosswindKnots: 15`). Это обусловило minor-bump схемы `2.1.0 → 2.2.0`
с relaxation `brackets.length(5) → .min(2)` (Level-2 evolution, см.
секцию «Стратегия эволюции» ниже).

### MediumToGood (`byAircraft.b787_8.mediumToGood`, RWYCC 4)

Та же `bracketedLinear` strategy с 6 брекетами, но brackets-labels
сдвинуты вниз (`max = 35`, `min = 10` против Good's `max = 40` /
`min = 15`), slope мягче (0.0436), и **`maxCap = null`** —
**первое условие в датасете без cap**.

| Константа | Значение | Откуда |
|-----------|----------|--------|
| Общий наклон | `slope = 0.0436` | JSON, `byAircraft.b787_8.mediumToGood.params.slope` |
| Точка 1 (макс. crosswind) | `crosswind = 35 KT, intercept = 2.2` | JSON, `…mediumToGood.params.brackets[0]` |
| Точка 2 | `crosswind = 30 KT, intercept = 7.2` | JSON, `…params.brackets[1]` |
| Точка 3 | `crosswind = 25 KT, intercept = 12.2` | JSON, `…params.brackets[2]` |
| Точка 4 | `crosswind = 20 KT, intercept = 17.2` | JSON, `…params.brackets[3]` |
| Точка 5 | `crosswind = 15 KT, intercept = 22.2` | JSON, `…params.brackets[4]` |
| Точка 6 (мин. crosswind) | `crosswind = 10 KT, intercept = 27.2` | JSON, `…params.brackets[5]` |
| Max-cap | `null` (no clamp) | JSON, `…params.maxCap`; Excel sheet «Medium to Good 788» **не содержит G8 clamp** |
| Decimals | `0` (integer floor) | JSON, `…params.decimals` |

**Numerical convenience:** intercepts step by exactly 5
(`[2.2, 7.2, 12.2, 17.2, 22.2, 27.2]`) и consecutive crosswindKnots
step by 5 (`[35, 30, 25, 20, 15, 10]`), что даёт `E9 = (E_(i+1) −
E_i)/5 ≡ 1` в каждом брекете. Формула вырождается в `result = F7 −
(cg − E7)` — ровно 1 KT drop на 1 %MAC внутри любого брекета.

**Observable output range:** `[10, 35] KT`. Максимум — IFNA-fallback
= `brackets[0].crosswindKnots = 35` (below/above-envelope). Минимум
— `brackets[5].crosswindKnots = 10` (exact-T₆ или within последний
bracket). При `maxCap = null` алгоритм возвращает raw output без
clamping, что бит-в-бит соответствует Excel.

**Why `maxCap = null` instead of 37?** На текущих данных оба
поведения наблюдаемо идентичны (output ≤ 35 ≤ 37). Но `null`:
1. **Source-faithful** — Excel-sheet не содержит G8 формулы.
2. **Forward-defensive** — если когда-либо появится bracket с
   `crosswindKnots > 37`, поведение останется правильным
   (cap-free), а не молча обрежется.

Эта тройка (Dry: cap=37, Good: cap=37, MediumToGood: cap=null)
служит примером того, как один strategy-mechanism (post-ROUNDDOWN
clamp) выбирается per-condition через данные, без изменения кода.

---

## VariableSlopeBracketedStrategy (PR 5)

Вторая активная strategy, для условий с **per-bracket slope**.
В отличие от `bracketedLinear`, где один `slope` применяется ко
всем breakpoints, здесь каждый bracket несёт собственный slope —
это позволяет threshold-линиям иметь разный наклон по весу.

### Алгоритм

Шаги 0/1 (валидация, конвертация веса в kilolbs) идентичны
`bracketedLinear`. Различия начинаются с шага 2:

**Шаг 2.** Per-bracket thresholds:
```
D[i] = brackets[i].slope · weightKilolbs + brackets[i].intercept
```
(против общего `D[i] = slope · W + intercept[i]` в bracketedLinear)

**Шаг 3.** XLOOKUP-equivalent поиск нижнего/верхнего bound вокруг
CG — идентично bracketedLinear.

**Шаг 4 (отличается).** Условная интерполяция:

```
E9 = (E8 − E7) / 5

if (E9 ≥ 1):
  G7 = F7 − (CG − E7) / E9      ← истинная линейная интерполяция
else:
  G7 = F7 − (CG − E7) · E9      ← BracketedLinear-equivalent
```

**Геометрический смысл условного branch:**
- При `E9 ≥ 1` (брекеты широко разнесены по CG — типичный кейс
  для variableSlopeBracketed): формула возвращает true linear
  interpolation между F7 (at cg=E7) и F8 (at cg=E8). На границе
  bracket cg=E8 даёт `F7 − (E8−E7)/E9 = F7 − 5 = F8` ровно.
- При `E9 < 1` (брекеты тесно сгруппированы — типичный кейс для
  bracketedLinear): формула совпадает с BracketedLinear's
  Excel-quirk (discontinuity at boundary).

Для Medium при всех in-envelope весах `E9 ∈ [1.7, 2.0]` — всегда
используется ветка `/E9`. Ветка `·E9` сохранена для forward-compat
с potential future VariableSlope datasets с тесно расположенными
брекетами.

**Шаг 5 (cap clamp), Шаг 6 (metadata), Шаг 7 (return)** — идентично
bracketedLinear.

### Сравнение с BracketedLinearStrategy

| Аспект | bracketedLinear | variableSlopeBracketed |
|--------|-----------------|------------------------|
| slope-параметр | Один общий | Один на bracket |
| Threshold формула | `slope · W + intercept[i]` | `slope[i] · W + intercept[i]` |
| Interpolation | `F7 − (cg − E7) · E9` (всегда) | `F7 − (cg − E7) / E9` (when E9 ≥ 1) |
| Behavior at bracket boundary | Discontinuity (Excel-quirk) | Continuous |
| ROUNDDOWN, IFNA fallback, maxCap | Identical |
| Активная для | Dry, Good, MediumToGood | Medium |

### Medium (`byAircraft.b787_8.medium`, RWYCC 3)

Per-bracket params per Excel "Medium 788" sheet:

| Bracket | crosswindKnots | slope | intercept |
|---------|----------------|-------|-----------|
| 0 (макс) | 25 | 0.032 | 5.1 |
| 1 | 20 | 0.0384 | 11.9 |
| 2 | 15 | 0.0388 | 21.8 |
| 3 (мин) | 10 | 0.044 | 29.8 |

| Константа | Значение | Комментарий |
|-----------|----------|-------------|
| Max-cap | `null` | Excel sheet «Medium 788» не содержит G8 clamp |
| Decimals | `1` | **Первое условие с sub-integer precision**; UI отображает 23.9 не 23 |

**Observable output range:** `[10.0, 25.0]` KT (max = brackets[0]
= 25; min = brackets[3] = 10).

**1-decimal precision via UI layer.** `String(value)` in
`CrosswindResult.tsx` корректно отображает дробное число:
`String(23.9) === '23.9'`, `String(20) === '20'`. Никаких изменений
в presentation layer для поддержки decimals=1 не потребовалось — это
свойство JS coercion и осознанное проектное решение PR 5.

### Test set #8 · Medium (RWYCC 3)

Параметры Medium (см. таблицу выше). Все cases фиксируют
`aircraft: 'b787_8'`, `phase: 'takeoff'`, `runwayCondition: 'medium'`.
**`maxCap = null` — no clamp applies**.

Excel-verified anchor: **W=182 t, CG=20 %MAC → 23.9 KT** (sheet G7).
Computation: `W_kilolbs = 401.2408`, T1=17.9397 (25), T2=27.3076 (20);
CG=20 в бракете [T1, T2]; E9 = (T2−T1)/5 = 1.8736 (≥ 1, /E9 branch);
raw = 25 − (20 − 17.9397)/1.8736 = 23.9003; ROUNDDOWN(1) = 23.9.

#### Test set #8.1 · Medium at W=170 t

Thresholds: T1=17.093 (25) · T2=26.292 (20) · T3=36.342 (15) · T4=46.290 (10).

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 8.1.01 | 170 | 8.0 | 25 | below-envelope |
| 8.1.02 | 170 | 15.0 | 25 | below-envelope |
| 8.1.03 | 170 | 17.0931328 | 25 | within-bracket (exact T1) |
| 8.1.04 | 170 | 18.0 | 24.5 | within-bracket |
| 8.1.05 | 170 | 20.0 | 23.4 | within-bracket |
| 8.1.06 | 170 | 22.0 | 22.3 | within-bracket |
| 8.1.07 | 170 | 26.29175936 | 20 | within-bracket (exact T2) |
| 8.1.08 | 170 | 27.0 | 19.6 | within-bracket |
| 8.1.09 | 170 | 30.0 | 18.1 | within-bracket |
| 8.1.10 | 170 | 36.34167352 | 15 | within-bracket (exact T3) |
| 8.1.11 | 170 | 37.0 | 14.6 | within-bracket |
| 8.1.12 | 170 | 40.0 | 13.1 | within-bracket |
| 8.1.13 | 170 | 46.2905576 | 10 | within-bracket (exact T4) |
| 8.1.14 | 170 | 47.0 | 25 | above-envelope |

#### Test set #8.2 · Medium at W=130 t

Thresholds: T1=14.271 · T2=22.905 · T3=32.920 · T4=42.410.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 8.2.01 | 130 | 10.0 | 25 | below-envelope |
| 8.2.02 | 130 | 14.2712192 | 25 | within-bracket (exact T1) |
| 8.2.03 | 130 | 15.0 | 24.5 | within-bracket |
| 8.2.04 | 130 | 20.0 | 21.6 | within-bracket |
| 8.2.05 | 130 | 22.90546304 | 20 | within-bracket (exact T2) |
| 8.2.06 | 130 | 25.0 | 18.9 | within-bracket |
| 8.2.07 | 130 | 30.0 | 16.4 | within-bracket |
| 8.2.08 | 130 | 32.92010328 | 15 | within-bracket (exact T3) |
| 8.2.09 | 130 | 35.0 | 13.9 | within-bracket |
| 8.2.10 | 130 | 42.4104264 | 10 | within-bracket (exact T4) |
| 8.2.11 | 130 | 45.0 | 25 | above-envelope |

#### Test set #8.3 · Medium at W=160 t

Thresholds: T1=16.388 · T2=25.445 · T3=35.486 · T4=45.321.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 8.3.01 | 160 | 15.0 | 25 | below-envelope |
| 8.3.02 | 160 | 16.3876544 | 25 | within-bracket (exact T1) |
| 8.3.03 | 160 | 20.0 | 23.0 | within-bracket |
| 8.3.04 | 160 | 25.44518528 | 20 | within-bracket (exact T2) |
| 8.3.05 | 160 | 30.0 | 17.7 | within-bracket |
| 8.3.06 | 160 | 35.48628096 | 15 | within-bracket (exact T3) |
| 8.3.07 | 160 | 40.0 | 12.7 | within-bracket |
| 8.3.08 | 160 | 45.3205248 | 10 | within-bracket (exact T4) |

#### Test set #8.4 · Medium user-anchor (W=182 t)

Thresholds: T1=17.940 · T2=27.308 · T3=37.368 · T4=47.455.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 8.4.01 | 182 | 10.0 | 25 | below-envelope |
| 8.4.02 | 182 | 20.0 | **23.9** | within-bracket (Excel-verified anchor) |
| 8.4.03 | 182 | 25.0 | 21.2 | within-bracket |
| 8.4.04 | 182 | 30.0 | 18.6 | within-bracket |
| 8.4.05 | 182 | 35.0 | 16.1 | within-bracket |
| 8.4.06 | 182 | 48.0 | 25 | above-envelope |

Total: 14+11+8+6 = **39 case** для Medium; плюс standalone anchor,
1-decimal precision regression, два cap-absence теста, cross-condition
ordering (Dry 37 ≥ Good 33 ≥ MediumToGood 23 ≥ Medium 18.1 at
W=170/CG=30) и metadata sanity. Файл:
`src/features/crosswind/__tests__/medium.test.ts`.

---

## CGOnlyPiecewiseStrategy (PR 6)

Третья активная strategy, **простейшая из всех**: single conditional
formula, без брекетов, без weight dependency, без XLOOKUP, без IFNA.
Только CG влияет на результат.

### Алгоритм

Шаг 0 (валидация data-availability) идентичен другим стратегиям.
Шаг 1 (конвертация веса в kilolbs) **отсутствует** — strategy не
использует вес.

**Шаг 2.** Conditional formula per Excel "Medium to Poor 788" sheet G7:

```
if (cg < cgThreshold):
  raw = plateauValue                                  // плато
else:
  raw = plateauValue − (cg − cgThreshold) / slopeDivisor   // linear decrease
```

**Шаг 3.** ROUNDDOWN(raw, decimals).

**Шаг 4.** Валидация результата через `makeCrosswindKnots`:
- raw ≥ 0 → ok.
- raw < 0 (для очень большого CG, deep beyond envelope) → reject
  через `CrosswindError.Negative` → `Result.error({ kind: 'CalculationFailed' })`.

**Шаг 5/6.** Metadata / return.

### Отличия от прочих стратегий

| Аспект | bracketedLinear | variableSlopeBracketed | cgOnlyPiecewise |
|--------|-----------------|------------------------|------------------|
| Brackets | Sorted array | Sorted array | None — single conditional |
| XLOOKUP / IFNA | Yes | Yes | No (formula total) |
| Weight dependency | `slope · W + intercept` | `slope_i · W + intercept_i` | **None — weight ignored** |
| maxCap | Optional | Optional | None (self-caps at plateau) |
| Декимали | 0 \| 1 | 0 \| 1 | 0 \| 1 |
| Active for | Dry, Good, MediumToGood | Medium | MediumToPoor |

**Weight independence** — defining property. Same CG produces the
same output regardless of weight (`input.weightTons` is accepted
for interface uniformity but unused).

### Out-of-envelope negative output (Recommendation A1)

Для очень больших CG (~58.5 %MAC и выше для MediumToPoor) формула
производит отрицательный raw. Excel-faithful: not floored at zero.

`makeCrosswindKnots` отвергает negative → strategy returns
`CalculationFailed`. UI fail-safe экран показывает "Calculation
unavailable" — корректный сигнал для inputs deep beyond operational
envelope. До того, как формула уходит в отрицательную зону,
`validateCGEnvelope` уже даёт warning chip (CG > 35).

Альтернативы (clamp at 0, return out-of-envelope status) рассмотрены
и отклонены — A1 maintains Excel parity и ясно сигнализирует
непригодность результата.

### MediumToPoor (`byAircraft.b787_8.mediumToPoor`, RWYCC 2)

Params per Excel "Medium to Poor 788" sheet:

| Константа | Значение | Комментарий |
|-----------|----------|-------------|
| plateauValue | `15` KT | Max output (CG ≤ threshold) |
| cgThreshold | `30` %MAC | Начало decreasing-ветки |
| slopeDivisor | `1.9` %MAC / KT | Уклон: 1 KT падения на 1.9 %MAC роста CG |
| decimals | `1` | ROUNDDOWN precision (как у Medium) |
| maxCap | — | Нет (formula self-caps at plateau) |

**Observable output range:** `[0+, 15]` KT (positive). Для CG > ~58.5
strategy returns `CalculationFailed` (negative raw rejected).

`calculationStrategy` enum reuse:
- CG < threshold (плато) → `'below-envelope'` (semantic stretch).
- CG ≥ threshold (decreasing) → `'within-bracket'` (semantic stretch).
- Above-envelope branch недостижим — strategy всегда либо even or
  exceeds, или CalculationFailed.

User direction для PR 6: enum union **не расширяется**; pre-Sprint-5
C4-decision концерн. Если labels окажутся misleading в долгосрочной
перспективе, future cleanup PR может добавить `'piecewise-plateau'`
/ `'piecewise-decreasing'` values.

### Test set #9 · MediumToPoor (RWYCC 2)

Все cases фиксируют `aircraft: 'b787_8'`, `phase: 'takeoff'`,
`runwayCondition: 'mediumToPoor'`.

Excel-verified anchor: **W=182 t, CG=32 %MAC → 13.9 KT** (sheet G7).
Computation: CG=32 ≥ 30 → decreasing branch; raw = 15 − (32 − 30)/1.9
= 13.94737; ROUNDDOWN(1) = 13.9. No cap.

#### Test set #9.1 · Plateau branch (CG ≤ 30) — weight independence

Plateau-зона всегда возвращает `plateauValue=15` независимо от веса.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 9.1.01 | 110 | 8.0 | 15 | below-envelope |
| 9.1.02 | 130 | 15.0 | 15 | below-envelope |
| 9.1.03 | 150 | 20.0 | 15 | below-envelope |
| 9.1.04 | 170 | 25.0 | 15 | below-envelope |
| 9.1.05 | 172 | 29.9 | 15 | below-envelope |
| 9.1.06 | 182 | 30.0 | 15 | within-bracket (boundary) |

#### Test set #9.2 · Decreasing branch (CG > 30)

Линейное уменьшение `1 KT per 1.9 %MAC`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 9.2.01 | 170 | 30.1 | 14.9 | within-bracket |
| 9.2.02 | 170 | 31.0 | 14.4 | within-bracket |
| 9.2.03 | 170 | 32.0 | 13.9 | within-bracket |
| 9.2.04 | 170 | 33.0 | 13.4 | within-bracket |
| 9.2.05 | 170 | 34.0 | 12.8 | within-bracket |
| 9.2.06 | 170 | 35.0 | 12.3 | within-bracket |
| 9.2.07 | 170 | 36.9 | 11.3 | within-bracket |
| 9.2.08 | 170 | 40.0 | 9.7 | within-bracket |
| 9.2.09 | 170 | 50.0 | 4.4 | within-bracket |

#### Test set #9.3 · User-anchor (W=182 t)

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 9.3.01 | 182 | 30.0 | 15 | within-bracket (boundary) |
| 9.3.02 | 182 | 32.0 | **13.9** | within-bracket (Excel-verified anchor) |
| 9.3.03 | 182 | 35.0 | 12.3 | within-bracket |

#### Test set #9.4 · Weight independence regression

Не table-driven — assertion-stack тест: `CG=32 × W ∈ {110, 130, 150,
170, 182}` → все возвращают 13.9. И `CG=25 × W ∈ {110, 150, 200}` →
все возвращают 15. Это load-bearing assertion для defining-property
strategy.

#### Test set #9.5 · Out-of-envelope CG (Recommendation A1)

| # | Weight (t) | CG (%MAC) | Expected | Комментарий |
|---|------------|-----------|----------|-------------|
| 9.5.01 | 170 | 50 | 4.4 KT | Still positive |
| 9.5.02 | 170 | 60 | `CalculationFailed` | raw=-0.789 → A1 reject |

Total: 6+9+3+2+2 = **22 case** в таблице; плюс standalone anchor,
weight-independence regression, full 5-condition cross-condition
ordering (Dry 34 ≥ Good 32 ≥ MediumToGood 21 ≥ Medium 17.1 ≥
MediumToPoor 13.9 at W=170/CG=32) и metadata sanity. Файл:
`src/features/crosswind/__tests__/medium-to-poor.test.ts`.

---

## ConstantStrategy (PR 7)

Четвёртая активная strategy, **simplest of all**: returns a single
constant value regardless of input. No formula, no conditional,
no XLOOKUP, no IFNA, no maxCap. Most data-driven strategy in the
module — `params` consists of a single number.

### Алгоритм

```
calculate(_input): { value: params.value, kind: 'ok' }
```

Шаги 0 (валидация data-availability), 5 (metadata) и 6 (return)
формально присутствуют для interface uniformity, но шаги 1–4
(weight conversion, threshold computation, XLOOKUP, interpolation)
**отсутствуют**. `input.weightTons` и `input.cgPercent` принимаются
для interface symmetry но не читаются.

`makeCrosswindKnots(params.value)` всё-таки применяется как
defence in depth — surfaces out-of-band values (negative,
> demonstrated 40 KT) as `CalculationFailed`.

### Отличия от прочих стратегий

| Аспект | bracketedLinear | variableSlopeBracketed | cgOnlyPiecewise | constant |
|--------|-----------------|------------------------|------------------|----------|
| Brackets | Sorted array | Sorted array | None | None |
| Formula | Excel-quirk | Conditional /E9 \| ·E9 | Plateau-decreasing | None — literal |
| Weight | `slope·W` | `slope_i·W` | Ignored | Ignored |
| CG | XLOOKUP | XLOOKUP | Conditional | Ignored |
| maxCap | Optional | Optional | None (self-cap) | None |
| Decimals | 0 \| 1 | 0 \| 1 | 0 \| 1 | N/A (integer constant) |
| Active for | Dry, Good, MediumToGood | Medium | MediumToPoor | Poor |

### Poor (`byAircraft.b787_8.poor`, RWYCC 1)

Single-param dataset per Excel "Poor 788" sheet G7 (literal value
10) and Q5 user decision:

| Константа | Значение | Комментарий |
|-----------|----------|-------------|
| value | `10` KT | Conservative simplification of FCOM RWYCC 1 row (alternating 15/10 pattern) |

**Observable output:** ровно `10` KT для любого валидного input.

`calculationStrategy` metadata reuses `'within-bracket'` (semantic
stretch matching PR 6 convention — enum union не расширяется per
user direction).

### Test set #10 · Poor (RWYCC 1)

Все cases фиксируют `aircraft: 'b787_8'`, `phase: 'takeoff'`,
`runwayCondition: 'poor'`. **Output is always 10 KT regardless
of inputs**.

#### Test set #10.1 · Anchor + sanity

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy |
|---|------------|-----------|---------------|----------|
| 10.1.01 | 182 | 20.0 | 10 | within-bracket |
| 10.1.02 | 170 | 30.0 | 10 | within-bracket |
| 10.1.03 | 110 | 10.0 | 10 | within-bracket |

#### Test set #10.2 · Full input-independence matrix

**Defining property test.** Single jest case asserts that all
25 combinations `(W ∈ {110, 130, 150, 170, 200}) × (CG ∈
{10, 20, 30, 40, 50})` produce 10 KT. Implementation uses
`expect(outputs).toEqual(Array.from({length:25}, () => 10))`.

#### Cross-condition ordering test

Full 6-condition chain at W=170/CG=30:

| Condition | Expected (KT) |
|-----------|---------------|
| Dry | 37 |
| Good | 33 |
| MediumToGood | 23 |
| Medium | 18.1 |
| MediumToPoor | 15 (plateau boundary — CG=30 exactly) |
| Poor | 10 |

Note: MediumToPoor at CG=30 is **15** (plateau boundary value),
NOT 13.9 (which is the W=182/CG=32 anchor — different case).
Monotonic invariant `Dry ≥ Good ≥ MTG ≥ Med ≥ MTP ≥ Poor`
asserted explicitly across all six.

Total: 3+1+1 = **5 case** в таблице; плюс standalone anchor,
full 6-condition ordering, metadata sanity. Файл:
`src/features/crosswind/__tests__/poor.test.ts`.

After PR 7 ALL 6 RWYCC conditions для B787-8 active. См.
"Open questions" о RWYCC 0.

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
operational envelope — две независимые функции use-case layer
`validateWeightEnvelope` и `validateCGEnvelope` (см.
`module-contracts/crosswind.md` Public API). За пределами envelope UI
показывает warning chip рядом с вычисленным значением + соответствующие
field-level errors (обе оси независимо), но число остаётся на экране
(см. `06-ui-spec.md` Экран 4 ResultPanelState).

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

### Шаг 4b. Применение `maxCap` (Dry: 37 KT)

После ROUNDDOWN и до возврата результата применяется опциональный
максимальный clamp:

```
if (params.maxCap !== null && result > params.maxCap) {
  result = params.maxCap;
}
```

**Boundary semantics:** clamp срабатывает строго при `result > maxCap`.
Значение `result === maxCap` пропускается без изменения (cap inclusive
сверху, exclusive ниже).

**Порядок применения:** ROUNDDOWN происходит **до** cap. Например,
raw = 39.992 → floor 39 → cap 37 (clamp). raw = 37.5 → floor 37 →
cap 37 (no clamp). raw = 37.001 → floor 37 → cap 37 (no clamp).

**Источник для Dry:** FCOM Tab 2.29.2a фиксирует все табулированные
значения B787-8 Dry как ≤ 37 KT. Excel-формула из исходного файла
заказчика реализует это так:

```
G8 = IF(G7 > 37, 37, G7)
```

где `G7` — результат piecewise-linear lookup, `G8` — финальный clamp.
Мы повторяем поведение точно через data-driven `maxCap` без изменения
кода стратегии.

**Strategy-агностичность:** механизм `maxCap` встроен в
`bracketedLinear` стратегию (см. PR 1 — параметр `BracketedLinearParams.maxCap`).
Будущие conditions:

- **Good** (планируется): также `maxCap=37` per FCOM Tab 2.29.2a.
- **MediumToGood**, **Medium**, **MediumToPoor**, **Poor**: `maxCap=null`
  ожидается (значения ≤ 37 уже встроены в их breakpoint-таблицы), но
  окончательное решение — за PR 5/6/7/8 на основании исходных Excel-формул.

**`calculationStrategy` НЕ меняется при срабатывании cap.** Если
ветка была `below-envelope` или `above-envelope` (IFNA-fallback)
или `within-bracket`, эта классификация сохраняется в метаданных;
cap — это post-processing шаг, не изменяющий branch decision.

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

**Test sets ownership.** Sets #1–#3 + #5 — тесты алгоритма (`calculateCrosswindLimit`); #4 — тесты use-case-функций `validateWeightEnvelope` / `validateCGEnvelope` (независимые, см. `04-domain-model.md` § "Independent weight + cg validation"). Это разделение явное: алгоритм НЕ проверяет operational envelope (см. Шаг 0 выше), поэтому test cases типа «CG=40 → InvalidInput» относятся к валидаторам, а не к алгоритму. То же самое CG=40 при тех же threshold-ах остаётся валидным входом для алгоритма и даёт численный результат.

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
| 1.01 | 170 | 8.0 | 37 | below-envelope | IFNA-fallback raw=40; **capped at 37** |
| 1.02 | 170 | 15.0 | 37 | below-envelope | IFNA-fallback raw=40; **capped at 37** |
| 1.03 | 170 | 25.0 | 37 | below-envelope | IFNA-fallback raw=40; **capped at 37** |
| 1.04 | 170 | 27.0 | 37 | below-envelope | CG ниже T₁ (27.6876); IFNA raw=40; **capped at 37** |
| 1.05 | 170 | 27.68763904 | 37 | within-bracket | Ровно на T₁; F7=F8=40; **capped at 37** (exact-breakpoint sub-case) |
| 1.06 | 170 | 27.7 | 37 | within-bracket | Чуть выше T₁; raw ≈ 39.992 → floor 39 → **capped at 37** |
| 1.07 | 170 | 28.0 | 37 | within-bracket | raw ≈ 39.800 → floor 39 → **capped at 37** |
| 1.08 | 170 | 30.0 | 37 | within-bracket | raw ≈ 38.520 → floor 38 → **capped at 37** |
| 1.09 | 170 | 30.886 | 37 | within-bracket | Чуть ниже T₂; разрывность; raw ≈ 37.95 → floor 37 (cap inclusive, no clamp) |
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
| 1.23 | 170 | 42.0 | 37 | above-envelope | CG выше T₅; IFNA-fallback raw=40; **capped at 37** (Excel-quirk + Tab 2.29.2a) |
| 1.24 | 170 | 50.0 | 37 | above-envelope | Same; **capped at 37** |

### Test set #2 · Weight = 130 t (W_kilolbs = 286.6006)

Thresholds для этого веса:
- `T₁ (40 KT) = 0.0576 × 286.6006 + 6.1 = 22.60819456`
- `T₂ (35 KT) = 25.80819456`
- `T₃ (30 KT) = 29.30819456`
- `T₄ (25 KT) = 32.80819456`
- `T₅ (20 KT) = 36.30819456`

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 2.01 | 130 | 10.0 | 37 | below-envelope | IFNA-fallback raw=40; **capped at 37** |
| 2.02 | 130 | 22.6 | 37 | below-envelope | Чуть ниже T₁ (22.608); raw=40; **capped at 37** |
| 2.03 | 130 | 22.60819456 | 37 | within-bracket | Ровно на T₁; raw=40; **capped at 37** (exact-breakpoint sub-case) |
| 2.04 | 130 | 23.0 | 37 | within-bracket | raw ≈ 39.749 → floor 39 → **capped at 37** |
| 2.05 | 130 | 25.0 | 37 | within-bracket | raw ≈ 38.469 → floor 38 → **capped at 37** |
| 2.06 | 130 | 27.0 | 34 | within-bracket | В бракете [T₂, T₃]; result_raw ≈ 34.166; floor → 34 |
| 2.07 | 130 | 30.0 | 29 | within-bracket | В бракете [T₃, T₄]; result_raw ≈ 29.516; floor → 29 |
| 2.08 | 130 | 35.0 | 23 | within-bracket | В бракете [T₄, T₅]; result_raw ≈ 23.466; floor → 23 |
| 2.09 | 130 | 36.30819456 | 20 | within-bracket | Ровно на T₅ (exact-breakpoint sub-case) |
| 2.10 | 130 | 38.0 | 37 | above-envelope | CG выше T₅; IFNA raw=40; **capped at 37** |

### Test set #3 · Weight = 160 t (W_kilolbs = 352.7392)

Thresholds для этого веса:
- `T₁ = 0.0576 × 352.7392 + 6.1 = 26.41777792`
- `T₂ = 29.61777792`
- `T₃ = 33.11777792`
- `T₄ = 36.61777792`
- `T₅ = 40.11777792`

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 3.01 | 160 | 20.0 | 37 | below-envelope | IFNA-fallback raw=40; **capped at 37** |
| 3.02 | 160 | 26.41777792 | 37 | within-bracket | Ровно на T₁; raw=40; **capped at 37** (exact-breakpoint sub-case) |
| 3.03 | 160 | 27.0 | 37 | within-bracket | raw ≈ 39.627 → floor 39 → **capped at 37** |
| 3.04 | 160 | 30.0 | 34 | within-bracket | В бракете [T₂, T₃]; result_raw ≈ 34.732 |
| 3.05 | 160 | 33.0 | 32 | within-bracket | result_raw ≈ 32.633 |
| 3.06 | 160 | 35.0 | 28 | within-bracket | В бракете [T₃, T₄]; result_raw ≈ 28.682 |
| 3.07 | 160 | 40.0 | 22 | within-bracket | В бракете [T₄, T₅]; result_raw ≈ 22.633 |

### Test set #4 · Operational-envelope validator (use-case layer, NOT algorithm)

**Important.** Эти кейсы тестируют функции `validateWeightEnvelope` и
`validateCGEnvelope` из use-case layer (см.
`module-contracts/crosswind.md` Public API), а НЕ сам алгоритм.
Алгоритм (`calculateCrosswindLimit`) для тех же входов вернёт численный
результат — operational envelope проверяется отдельно. Два валидатора
независимы, поэтому "обе оси out of envelope" — это два независимых
fail-кейса, не один (см. `04-domain-model.md` § "Independent weight +
cg validation").
`operationalEnvelope` берётся из bundled JSON. С 2026-05-19 (PR
`fix/envelope-bounds-and-menu-order`) envelope соответствует FCOM /
Type Certificate B787-8: `weight ∈ [104.1, 227.93] tons`, `cg ∈
[6, 39.5] %MAC`. До этого числа `[110, 172]` / `[8, 35]` были
консервативной оценкой MVP; алгоритм outputs остаются неизменными,
сдвинулись только классификации в тест-таблице ниже.

Test cases #4.01–4.04: validator returns `EnvelopeViolation` (не
`InvalidInput`). UI на эти кейсы реагирует warning chip-ом рядом с
численным результатом, рассчитанным алгоритмом.

Test cases #4.05–4.07: NaN / Infinity / negative — отсекаются на уровне
Value Object factories (`makeWeightInTons`, `makeCGPercentMAC`), до
вызова и алгоритма, и validator-а. Соответствующие ошибки — `WeightError`
/ `CGError`.

| # | Layer | Weight (t) | CG (%MAC) | Expected | Reason |
|---|-------|------------|-----------|----------|--------|
| 4.01 | Validator | 100 | 25 | EnvelopeViolation.weight.below | weight < 104.1 |
| 4.02 | Validator | 230 | 25 | EnvelopeViolation.weight.above | weight > 227.93 (was W=200 under prior `[110, 172]` envelope; W=200 is WITHIN under FCOM bounds) |
| 4.03 | Validator | 150 | 5 | EnvelopeViolation.cg.below | cg < 6 |
| 4.04 | Validator | 150 | 40 | EnvelopeViolation.cg.above | cg > 39.5 |
| 4.05 | Value Object | 150 | NaN | CGError.NotANumber | cg не число |
| 4.06 | Value Object | NaN | 25 | WeightError.NotANumber | weight не число |
| 4.07 | Value Object | -5 | 25 | WeightError.Negative | weight отрицательный |

### Test set #5 · Data integrity (повреждённые данные)

Эти тесты не для алгоритма как такового, а для слоя `data` (репозитория). Они проверяют, что некорректный JSON триггерит `CorruptedDataBundle`.

| # | Сценарий | Expected |
|---|----------|----------|
| 5.01 | `byAircraft.b787_8.dry.params.brackets.length < 2` | CorruptedDataBundle (zod `.min(2)` failure; rule relaxed from `.length(5)` in schema 2.2.0 / PR 3) |
| 5.02 | `byAircraft.b787_8.dry.params.slope === 0` | CorruptedDataBundle (zero slope невалиден) |
| 5.03 | `byAircraft` содержит неизвестный ключ (например `b777_300`) | CorruptedDataBundle (zod `.strict()` failure) |
| 5.04 | `byAircraft.b787_8.dry.params.brackets` с не-возрастающими `intercept` | CorruptedDataBundle |
| 5.05 | `operationalEnvelope.weight.minTons > operationalEnvelope.weight.maxTons` | CorruptedDataBundle |

### Test set #6 · Good (RWYCC 5)

Параметры Good (см. секцию «Константы алгоритма / Good»). Все
case-таблицы фиксируют `aircraft: 'b787_8'`, `phase: 'takeoff'`,
`runwayCondition: 'good'`. Cap clamp применён аналогично Dry —
все ветки, где raw > 37, дают expected = 37 с пометкой **«capped
at 37»** в комментарии.

#### Test set #6.1 · Good at W=170 t (heavy)

Thresholds (`slope=0.06`, `W_kilolbs = 374.7854`):
`T₁=24.487 (40)` · `T₂=28.487 (35)` · `T₃=32.487 (30)` ·
`T₄=36.487 (25)` · `T₅=40.487 (20)` · `T₆=44.487 (15)`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 6.1.01 | 170 | 8.0 | 37 | below-envelope | IFNA raw=40; **capped at 37** |
| 6.1.02 | 170 | 20.0 | 37 | below-envelope | IFNA raw=40; **capped at 37** |
| 6.1.03 | 170 | 24.487124 | 37 | within-bracket | Ровно на T₁; raw=40 (exact-breakpoint); **capped at 37** |
| 6.1.04 | 170 | 26.0 | 37 | within-bracket | raw ≈ 38.789 → floor 38 → **capped at 37** |
| 6.1.05 | 170 | 27.0 | 37 | within-bracket | raw ≈ 37.989 → floor 37 (cap inclusive) |
| 6.1.06 | 170 | 28.0 | 37 | within-bracket | raw ≈ 37.189 → floor 37 |
| 6.1.07 | 170 | 28.487124 | 35 | within-bracket | Ровно на T₂; result=35 (exact-breakpoint) |
| 6.1.08 | 170 | 29.0 | 34 | within-bracket | raw ≈ 34.589 → floor 34 |
| 6.1.09 | 170 | 30.0 | 33 | within-bracket | raw ≈ 33.789 → floor 33 |
| 6.1.10 | 170 | 31.0 | 32 | within-bracket | raw ≈ 32.989 → floor 32 |
| 6.1.11 | 170 | 32.0 | 32 | within-bracket | raw ≈ 32.189 → floor 32 |
| 6.1.12 | 170 | 32.487124 | 30 | within-bracket | Ровно на T₃; result=30 (exact-breakpoint) |
| 6.1.13 | 170 | 34.0 | 28 | within-bracket | raw ≈ 28.789 → floor 28 |
| 6.1.14 | 170 | 36.487124 | 25 | within-bracket | Ровно на T₄; result=25 (exact-breakpoint) |
| 6.1.15 | 170 | 40.487124 | 20 | within-bracket | Ровно на T₅; result=20 (exact-breakpoint) |
| 6.1.16 | 170 | 44.487124 | 15 | within-bracket | Ровно на T₆; result=15 (exact-breakpoint; **последний bracket — отличие от Dry**) |
| 6.1.17 | 170 | 45.0 | 37 | above-envelope | CG выше T₆; IFNA raw=40; **capped at 37** |
| 6.1.18 | 170 | 50.0 | 37 | above-envelope | Same; **capped at 37** |

#### Test set #6.2 · Good at W=130 t (medium)

Thresholds (`W_kilolbs = 286.6006`):
`T₁=19.196` · `T₂=23.196` · `T₃=27.196` · `T₄=31.196` · `T₅=35.196` · `T₆=39.196`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 6.2.01 | 130 | 10.0 | 37 | below-envelope | IFNA raw=40; **capped at 37** |
| 6.2.02 | 130 | 19.196036 | 37 | within-bracket | Ровно на T₁; raw=40 (exact-breakpoint); **capped at 37** |
| 6.2.03 | 130 | 20.0 | 37 | within-bracket | raw ≈ 39.357 → floor 39 → **capped at 37** |
| 6.2.04 | 130 | 23.196036 | 35 | within-bracket | Ровно на T₂ (exact-breakpoint) |
| 6.2.05 | 130 | 25.0 | 33 | within-bracket | raw ≈ 33.557 → floor 33 |
| 6.2.06 | 130 | 27.196036 | 30 | within-bracket | Ровно на T₃ (exact-breakpoint) |
| 6.2.07 | 130 | 30.0 | 27 | within-bracket | raw ≈ 27.757 → floor 27 |
| 6.2.08 | 130 | 35.0 | 21 | within-bracket | В бракете [T₄, T₅]; raw ≈ 21.957 → floor 21 |
| 6.2.09 | 130 | 39.196036 | 15 | within-bracket | Ровно на T₆ (exact-breakpoint) |
| 6.2.10 | 130 | 40.0 | 37 | above-envelope | CG выше T₆; IFNA raw=40; **capped at 37** |

#### Test set #6.3 · Good at W=160 t (mid)

Thresholds (`W_kilolbs = 352.7392`):
`T₁=23.164` · `T₂=27.164` · `T₃=31.164` · `T₄=35.164` · `T₅=39.164` · `T₆=43.164`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 6.3.01 | 160 | 20.0 | 37 | below-envelope | IFNA raw=40; **capped at 37** |
| 6.3.02 | 160 | 23.164352 | 37 | within-bracket | Ровно на T₁; raw=40 (exact-breakpoint); **capped at 37** |
| 6.3.03 | 160 | 24.0 | 37 | within-bracket | raw ≈ 39.331 → floor 39 → **capped at 37** |
| 6.3.04 | 160 | 28.0 | 34 | within-bracket | raw ≈ 34.331 → floor 34 |
| 6.3.05 | 160 | 32.0 | 29 | within-bracket | raw ≈ 29.331 → floor 29 |
| 6.3.06 | 160 | 35.164352 | 25 | within-bracket | Ровно на T₄ (exact-breakpoint) |
| 6.3.07 | 160 | 40.0 | 19 | within-bracket | В бракете [T₅, T₆]; raw ≈ 19.331 → floor 19 |
| 6.3.08 | 160 | 44.0 | 37 | above-envelope | CG выше T₆; IFNA raw=40; **capped at 37** |

#### Test set #6.4 · Good — user-anchor (W=150 t)

**Case 6.4.02 — Excel-verified anchor:** `W=150 t, CG=26 %MAC →
34 KT`. Raw ≈ 34.873 в бракете `[T₂=25.842, T₃=29.842]`; floor 34;
34 ≤ cap, no clamp.

Thresholds (`W_kilolbs = 330.693`):
`T₁=21.842` · `T₂=25.842` · `T₃=29.842` · `T₄=33.842` · `T₅=37.842` · `T₆=41.842`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 6.4.01 | 150 | 10.0 | 37 | below-envelope | IFNA raw=40; **capped at 37** |
| 6.4.02 | 150 | 26.0 | 34 | within-bracket | **Excel-verified anchor case**; raw ≈ 34.873 → floor 34 |
| 6.4.03 | 150 | 30.0 | 29 | within-bracket | В бракете [T₃, T₄]; raw ≈ 29.873 → floor 29 |
| 6.4.04 | 150 | 35.0 | 24 | within-bracket | В бракете [T₄, T₅]; raw ≈ 24.073 → floor 24 |
| 6.4.05 | 150 | 42.0 | 37 | above-envelope | CG выше T₆; IFNA raw=40; **capped at 37** |

Total: 18+10+8+5 = **41 case** для Good; плюс отдельные регрессии
для cap (W=170/CG=20 → 37 ниже envelope; W=170/CG=50 → 37 выше) и
метаданных.

### Test set #7 · MediumToGood (RWYCC 4)

Параметры MediumToGood (см. секцию «Константы алгоритма / MediumToGood»).
Все case-таблицы фиксируют `aircraft: 'b787_8'`, `phase: 'takeoff'`,
`runwayCondition: 'mediumToGood'`. **`maxCap = null` — no clamp applies**
ни в одном кейсе; observable output range `[10, 35] KT`.

Так как intercepts step uniformly by 5, `E9 ≡ 1` во всех брекетах
этого условия. Это упрощает интерпретацию: внутри любого бракета
result = F7 − (cg − E7), 1 KT drop per 1 %MAC.

#### Test set #7.1 · MediumToGood at W=170 t (heavy)

Thresholds (`slope=0.0436`, `W_kilolbs = 374.7854`):
`T₁=18.541 (35)` · `T₂=23.541 (30)` · `T₃=28.541 (25)` ·
`T₄=33.541 (20)` · `T₅=38.541 (15)` · `T₆=43.541 (10)`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 7.1.01 | 170 | 8.0 | 35 | below-envelope | IFNA fallback `brackets[0]=35` (no cap) |
| 7.1.02 | 170 | 15.0 | 35 | below-envelope | Same |
| 7.1.03 | 170 | 18.54064344 | 35 | within-bracket | Ровно на T₁; F7=F8=35 (exact-breakpoint) |
| 7.1.04 | 170 | 20.0 | 33 | within-bracket | raw 33.541 → floor 33 |
| 7.1.05 | 170 | 22.0 | 31 | within-bracket | raw 31.541 → floor 31 |
| 7.1.06 | 170 | 23.54064344 | 30 | within-bracket | Ровно на T₂ (exact-breakpoint) |
| 7.1.07 | 170 | 25.0 | 28 | within-bracket | raw 28.541 → floor 28 |
| 7.1.08 | 170 | 28.0 | 25 | within-bracket | raw 25.541 → floor 25 |
| 7.1.09 | 170 | 28.54064344 | 25 | within-bracket | Ровно на T₃ (exact-breakpoint) |
| 7.1.10 | 170 | 30.0 | 23 | within-bracket | raw 23.541 → floor 23 |
| 7.1.11 | 170 | 33.54064344 | 20 | within-bracket | Ровно на T₄ (exact-breakpoint) |
| 7.1.12 | 170 | 35.0 | 18 | within-bracket | raw 18.541 → floor 18 |
| 7.1.13 | 170 | 38.54064344 | 15 | within-bracket | Ровно на T₅ (exact-breakpoint) |
| 7.1.14 | 170 | 40.0 | 13 | within-bracket | raw 13.541 → floor 13 |
| 7.1.15 | 170 | 43.54064344 | 10 | within-bracket | Ровно на T₆ (exact-breakpoint; последний bracket) |
| 7.1.16 | 170 | 45.0 | 35 | above-envelope | IFNA fallback `brackets[0]=35` (no cap) |

#### Test set #7.2 · MediumToGood at W=130 t (medium)

Thresholds (`W_kilolbs = 286.6006`):
`T₁=14.696 (35)` · `T₂=19.696 (30)` · `T₃=24.696 (25)` ·
`T₄=29.696 (20)` · `T₅=34.696 (15)` · `T₆=39.696 (10)`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 7.2.01 | 130 | 8.0 | 35 | below-envelope | IFNA fallback |
| 7.2.02 | 130 | 14.69578616 | 35 | within-bracket | Ровно на T₁ (exact-breakpoint) |
| 7.2.03 | 130 | 15.0 | 34 | within-bracket | raw 34.696 → floor 34 |
| 7.2.04 | 130 | 19.69578616 | 30 | within-bracket | Ровно на T₂ (exact-breakpoint) |
| 7.2.05 | 130 | 22.0 | 27 | within-bracket | raw 27.696 → floor 27 |
| 7.2.06 | 130 | 24.69578616 | 25 | within-bracket | Ровно на T₃ (exact-breakpoint) |
| 7.2.07 | 130 | 27.0 | 22 | within-bracket | raw 22.696 → floor 22 |
| 7.2.08 | 130 | 29.69578616 | 20 | within-bracket | Ровно на T₄ (exact-breakpoint) |
| 7.2.09 | 130 | 34.69578616 | 15 | within-bracket | Ровно на T₅ (exact-breakpoint) |
| 7.2.10 | 130 | 39.69578616 | 10 | within-bracket | Ровно на T₆ (exact-breakpoint) |
| 7.2.11 | 130 | 40.0 | 35 | above-envelope | IFNA fallback |

#### Test set #7.3 · MediumToGood at W=160 t (mid)

Thresholds (`W_kilolbs = 352.7392`):
`T₁=17.579 (35)` · `T₂=22.579 (30)` · `T₃=27.579 (25)` ·
`T₄=32.579 (20)` · `T₅=37.579 (15)` · `T₆=42.579 (10)`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 7.3.01 | 160 | 15.0 | 35 | below-envelope | IFNA fallback |
| 7.3.02 | 160 | 17.57942912 | 35 | within-bracket | Ровно на T₁ (exact-breakpoint) |
| 7.3.03 | 160 | 20.0 | 32 | within-bracket | raw 32.579 → floor 32 |
| 7.3.04 | 160 | 22.57942912 | 30 | within-bracket | Ровно на T₂ (exact-breakpoint) |
| 7.3.05 | 160 | 25.0 | 27 | within-bracket | raw 27.579 → floor 27 |
| 7.3.06 | 160 | 30.0 | 22 | within-bracket | raw 22.579 → floor 22 |
| 7.3.07 | 160 | 37.57942912 | 15 | within-bracket | Ровно на T₅ (exact-breakpoint) |
| 7.3.08 | 160 | 42.57942912 | 10 | within-bracket | Ровно на T₆ (exact-breakpoint) |

#### Test set #7.4 · MediumToGood — user-anchor (W=175 t)

**Case 7.4.02 — Excel-verified anchor (sheet «Medium to Good 788» G7):**
`W=175 t, CG=24 %MAC → 30 KT`. raw ≈ 30.021 в бракете
`[T₁=19.021, T₂=24.021]`; floor 30; no cap.

Thresholds (`W_kilolbs = 385.8085`):
`T₁=19.021` · `T₂=24.021` · `T₃=29.021` · `T₄=34.021` ·
`T₅=39.021` · `T₆=44.021`.

| # | Weight (t) | CG (%MAC) | Expected (KT) | Strategy | Комментарий |
|---|------------|-----------|---------------|----------|-------------|
| 7.4.01 | 175 | 10.0 | 35 | below-envelope | IFNA fallback |
| 7.4.02 | 175 | 24.0 | 30 | within-bracket | **Excel-verified anchor**; raw ≈ 30.021 → floor 30 |
| 7.4.03 | 175 | 30.0 | 24 | within-bracket | В бракете [T₃, T₄]; raw 24.021 → floor 24 |
| 7.4.04 | 175 | 35.0 | 19 | within-bracket | В бракете [T₄, T₅]; raw 19.021 → floor 19 |
| 7.4.05 | 175 | 44.0 | 10 | within-bracket | В бракете [T₅, T₆]; raw 10.021 → floor 10 |
| 7.4.06 | 175 | 45.0 | 35 | above-envelope | IFNA fallback |

Total: 16+11+8+6 = **41 case** для MediumToGood; плюс standalone
anchor, два cap-absence теста (`maxCap=null` явно проверяется при
below/above-envelope IFNA → 35 unchanged), cross-condition ordering
test (Dry ≥ Good ≥ MediumToGood at W=170/CG=30 → 37/33/23) и
metadata sanity. Файл: `src/features/crosswind/__tests__/medium-to-good.test.ts`.

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
  //          see `validateWeightEnvelope` / `validateCGEnvelope` in the
  //          use-case layer.)
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
3. **RWYCC 0 (TAKE OFF NOT ALLOWED) — intentional non-implementation для MVP.** Per user direction (post-PR 7): RWYCC 0 — это **operational prohibition, not a calculation**. Соответствующего runway-condition литерала в union типов **нет** и `byAircraft.<aircraft>.<RWYCC0>` записи в bundled data **не должно быть**. Strategy stub `notAllowed` остаётся в discriminated union на уровне типов (для exhaustiveness), но в schema его params отвергается — то есть данные с этим discriminator-ом не проходят validation. Post-launch evaluation может revisit это решение (например, если UX-исследования покажут что пилоты ожидают увидеть явное "TAKE OFF NOT ALLOWED" сообщение при попытке выбрать RWYCC 0). Текущая позиция: pilot-decision-tree выводит RWYCC 0 → "do not take off" вне приложения, calculator-у не нужно знать об этом состоянии.

---

## Exit-критерии этого документа

- [ ] Разработчик понимает все три «особенности Excel-эквивалентного поведения» и согласен их сохранить в коде.
- [ ] Тест-таблица (Test Sets #1–#5) принята как авторитативный источник истины.
- [ ] Скелет TypeScript-реализации отражает то, что разработчик ожидает увидеть в коде.
- [ ] Стратегия fail-safe (UI никогда не показывает число при ошибке) одобрена.
- [ ] Open questions либо закрыты, либо явно отложены.
