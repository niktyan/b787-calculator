# ADR-0007 · Adopt react-native-svg for crosswind visualization

**Status:** Accepted as forward signal · not consumed in MVP (see Status update below)
**Date:** 2026-05-04 (forward signal — installation deferred indefinitely after takeoff rebrand)
**Related:** `02_Specification/03-tech-stack.md`, `02_Specification/06-ui-spec.md` § Экран 4 (visualization subsection removed in takeoff rebrand)

## Context

Polish-3 заменяет временный `EnvelopePositionBar` (3-зонный bar на
голых RN `<View>`-ах с цветными flex-children) на полноценный
CG / Crosswind график: пять параллельных линий в плоскости (Weight,
CG), каждая для одного дискретного значения crosswind (40, 35, 30, 25,
20 KT), маркер на активной линии, вертикальный operational-envelope
bound, line-draw анимация. Detailed visual spec — `06-ui-spec.md` §
Экран 4 → "Visualization · CG / Crosswind chart".

Без SVG этого нарисовать корректно невозможно: RN `<View>` рисует
только rectangles, а нам нужны произвольные lines, dashed strokes,
анимируемая `stroke-dasharray` (для line-draw effect-а), и точное
позиционирование marker-circles на линиях, не привязанных к flex-grid.
Альтернатив — две: (а) `react-native-svg`, фактически стандартная для
RN-стека SVG-библиотека, входящая в Expo SDK как peer-managed модуль,
устанавливаемая через `npx expo install react-native-svg`; (б)
`react-native-skia` (`@shopify/react-native-skia`) — более мощный и
быстрый GPU-renderer, но крупнее по bundle-size и излишне для нашего
single-screen статичного графика. Свой `<Canvas>` через
`react-native-canvas` отвергнут: устаревший пакет, плохо
поддерживается на iOS 16+.

`react-native-svg` уже de-facto зависит от ряда пакетов в нашем
allowlist через transitive deps (например, `@expo/vector-icons` тянет
его косвенно), но напрямую в `package.json` его сейчас нет. В
project-чатах в open question `03-tech-stack.md` секции «Open
questions» ровно эта библиотека упомянута как «possibly needed in
Phase 3+» — Polish-3 — это и есть тот момент.

## Decision

В Polish-3 в зависимости проекта добавляется `react-native-svg`,
устанавливаемый через `npx expo install react-native-svg` (без
явной фиксации версии — Expo SDK 54 определяет совместимый минор
автоматически). Использование ограничено feature-модулем Crosswind
(`src/features/crosswind/presentation/components/`); design-system
не получает SVG-зависимостей до момента, когда SVG-примитивы
понадобятся ≥ 2 фичам (escalation trigger §5 из
`02_Specification/02-architecture.md`).

Никаких сторонних chart-библиотек (Victory Native, RN Chart Kit,
RN-SVG-Charts) в этом ADR не утверждается — наша визуализация
проста (5 параллельных линий + marker + vertical guide), а chart-
библиотеки тащат с собой свой interpolation engine, axis logic и
animations, которые расходятся с нашим Excel-equivalent
piecewise-linear алгоритмом. Реализуем chart напрямую на SVG-
примитивах (`<Svg>`, `<Line>`, `<Circle>`, `<G>`, `<Text>`) с
анимациями через Reanimated — это сохраняет полный контроль над
correctness и не вводит риск, что chart-библиотека «по-своему»
интерполирует значения и расходится с algorithm-овским numeric
output.

## Consequences

**Позитивные:**

- Возможность нарисовать spec-defined график (`06-ui-spec.md` §
  Экран 4 → Visualization) без compromise-ов.
- `react-native-svg` стабилен (десятки тысяч RN-проектов), регулярно
  обновляется через Expo SDK release cycle, имеет rock-solid iOS-
  поддержку.
- Нет conflict-а с ESLint правилами `react-native/no-color-literals` /
  `no-inline-styles` — SVG-props принимают строковые color values
  через `tokens.colors[theme.resolved].*`.
- `import` ограничен presentation-слоем; domain остаётся
  platform-agnostic (см. `02-architecture.md` § Domain Purity Rules).

**Негативные:**

- Bundle size: +~50 KB minified (примерно). Несущественный для
  iOS-приложения, но не нулевой.
- Тестирование: SVG-компоненты в jest-expo рендерятся, но
  визуальная проверка по-прежнему — на устройстве (Snapshot-тесты
  фиксируют DOM-структуру, не визуальный output).
- Lifecycle: при mount/unmount Reanimated-shared-values на
  SVG-attribute-ах требует чуть больше внимания, чем на View-style
  (но это решаемо через стандартный
  `useAnimatedProps` API из `react-native-reanimated`).

**Нейтральные:**

- Доступность: SVG-элементы по умолчанию неактивны для VoiceOver.
  Wrapping-`<View>` с `accessibilityRole="image"` +
  `accessibilityLabel` (как у текущего envelope-bar) обязательно.
- Privacy Manifest: библиотека не обращается к network / sensors /
  storage, на Privacy Label не влияет.

## Alternatives considered

**`@shopify/react-native-skia`** — отвергнут как избыточный для
single-screen static chart. Skia-renderer оправдан для real-time
animations / heavy graphics; наш chart обновляется со скоростью
keystroke (200 ms transitions) и не требует GPU-acceleration. Bundle
size — в 3–4 раза больше react-native-svg.

**`victory-native` / `react-native-svg-charts` / `react-native-chart-kit`** —
отвергнуты как black-box chart libraries. Каждая тянет свой axis /
interpolation / animation engine, и невозможно гарантировать, что
эти engines в edge-cases (на границах брекетов, при IFNA-fallback) не
разойдутся с нашим Excel-equivalent algorithm-ом. Cleaner — рисовать
chart самим из числового output алгоритма на низкоуровневых
SVG-примитивах.

**Pure RN `<View>`-based fake-lines** (диагональные `<View>` с
`transform: rotate`) — отвергнут как fragile. Работает для одного-
двух линий, ломается при overlapping, animation-инструмент, axis
labels требуют бесчисленных hand-positioned `<Text>`. Не масштабируется.

**Custom WebView with HTML5 Canvas** — отвергнут как нарушающий
запрет `react-native-webview` из `03-tech-stack.md` секция
«Запрещённые зависимости».

## How to install (Polish-3 implementation note)

```bash
npx expo install react-native-svg
```

Это обновит `package.json` exact-version, syncнётся с Expo SDK 54
compatible release, и зарегистрирует pod через autolinking. Никаких
правок `app.json` или native-config не требуется.

После install — `package-lock.json` коммитится; `package.json` поле
ссылается на конкретную версию (через `save-exact=true` из `.npmrc`).

---

## Status update (post-takeoff-rebrand, 2026-05-06)

This ADR was written as a **forward signal** in PR #32 ahead of
Polish-3 (PR #33), which intended to install `react-native-svg`
and replace the temporary `EnvelopePositionBar` with a full CG /
Crosswind chart. None of that code shipped:

- **PR #33 (Polish-3, chart implementation) was closed without
  merge** (decision: scrap chart and Range-row work, restart
  with the takeoff direction).
- The **takeoff rebrand** (PR #44, merge commit `09ac1d6` on
  2026-05-06) explicitly removed the chart from MVP scope —
  the result panel is a single full-height card with a centred
  number, no visualization (см. `06-ui-spec.md` § Экран 4 →
  "Result-секция (правая колонка / нижняя на portrait) — Block 5
  single Card").
- `react-native-svg` was **never added** to `package.json`. The
  `npx expo install` step from the section above was scheduled
  for Polish-3 but never executed; transitive references through
  `@expo/vector-icons` are unrelated to direct consumption.

**Current disposition (MVP):**

- The library is **not installed and not consumed** by any
  feature. Bundle size impact is currently zero.
- The library remains on the **allowlist** in
  `02_Specification/03-tech-stack.md` so that re-adoption (if
  Phase 2 reintroduces visualization — e.g., a Crosswind
  Landing chart, or a different presentation) does not require
  another full ADR cycle: this ADR is the standing decision on
  *which* library to use when visualization returns.
- The Decision and Consequences sections above remain as
  written; they describe the rationale for choosing
  `react-native-svg` *over* alternatives (Skia, victory-native,
  view-based fakes, WebView), and that rationale still holds
  whenever visualization is needed.

**Reconsider this status when:**

- Phase 2 design finalises the Crosswind Landing module's
  result-panel shape — if it includes a chart, run `npx expo
  install react-native-svg` per the section above and update
  this ADR's status to `Accepted · consumed`.
- Or, after Phase 2, if the project consistently ships without
  visualization in any module — flip allowlist + this ADR to
  `Reverted` (separate ADR cycle, since reversal touches both
  the tech-stack policy and any code that may have been added).
