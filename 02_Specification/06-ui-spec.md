# 06 · UI Specification

## Назначение документа

Описывает **поведение каждого экрана** приложения — что, когда и как показывается, какие состояния возможны, как работает навигация, локализация, accessibility, темы и переходы. Визуальные референсы лежат в `03_Mockups/index.html`. Этот документ дополняет мокапы формальной спецификацией поведения — то, что нельзя увидеть на статичных скриншотах.

Любое UI-решение в коде, противоречащее этому документу, является ошибкой.

---

## Принципы UX

**Принцип 1 · Минимум кликов до результата.** На главном экране калькулятора все поля видимы сразу, без скролла. Изменение любого поля ввода → результат пересчитывается и обновляется немедленно (live computation). Никакой кнопки «Calculate».

**Принцип 2 · Большие тач-зоны.** Минимум 44×44 pt согласно Apple HIG. Для критичных интерактивных элементов (кнопки на splash, переключатели в калькуляторе) — 56×56 pt.

**Принцип 3 · Числа крупным monospace-шрифтом.** Числовые результаты, поля ввода и таблицы значений отображаются шрифтом с моноширинной разметкой (SF Mono или системный fallback). Это упрощает считывание точных чисел.

**Принцип 4 · Источник всегда виден.** Пилот всегда может убедиться,
какая ревизия FCOM питает расчёт — но не за счёт визуального шума на
экране результата. Источник раскрывается в **About → Data source**
строкой формата `"<referenceDocument> · <dataVersion>"` (например
«Boeing 787 FCOM · 2026-05-03.001»), и от Crosswind-калькулятора до
About — **одно касание** по NavPill «About». Per-screen чип на
result-панели был удалён по обратной связи пользователя в PR
`feat/crosswind-polish-2`. Это напоминает пилоту, что приложение —
advisory, а истина — в FCOM, без занятия места на основной рабочей
области.

**Принцип 5 · Никаких всплывающих диалогов без действия.** Диалоги (включая дисклеймер и confirmation) появляются только в ответ на явное действие пользователя или в обоснованных случаях (первый запуск, fail-safe).

**Принцип 6 · Тёмная тема — приоритет.** Все экраны разрабатываются «dark first», светлая тема — параллельный вариант. Это связано с использованием в кокпите при пониженном освещении.

---

## Темы и design tokens

**Поддерживаются три режима:** Auto (следует системной настройке iOS), Light, Dark.

Все цвета, размеры, типографические стили централизованы в `src/design-system/tokens.ts`. Никаких хардкоженых цветов или размеров в компонентах. Если в design-system нет нужного токена — он добавляется туда, не пишется inline.

Базовые токены берутся из `03_Mockups/index.html` (раздел «Design System»):
- Brand accent: `#00C2A8` (teal); soft accent: `#003C36`.
- Status colors: `#46A758` (success), `#FFB020` (warning), `#E5484D` (danger).
- Тёмная палитра: `#0A0E14` (page), `#0D1117` (screen), `#11161F` (card).
- Typography: системный SF Pro (Display + Mono).

Точные значения и иерархия токенов финализируются в `src/design-system/tokens.ts` при реализации. Структура tokens:
```typescript
export const tokens = {
  colors: { ... },
  typography: { ... },
  spacing: { ... },
  radii: { ... },
  shadows: { ... },
};
```

---

## Локализация

**Поддерживаемые языки:** русский (`ru`) и английский (`en`).

**Определение языка при первом запуске:**
1. Читается `expo-localization` → системный язык.
2. Если `ru` или `en` — используется он.
3. Иначе — fallback на `en`.

**Переключение языка пользователем:** через Settings → Language. Применяется немедленно ко всем экранам без перезапуска приложения.

**Что НЕ локализуется (остаётся на английском всегда):**
- Авиационные термины: KT, MAC, RWY, RWYCC, FCOM, OM-B, CG, TOW.
- Названия модулей в Main Menu.
- Aircraft-варианты: B787-8, B787-9.
- Названия состояний ВПП (RWYCC scale): Dry, Good, Medium to Good, Medium, Medium to Poor, Poor.
- Дисклеймер (юридический текст). Используется один и тот же английский текст во всех языковых версиях для юридической однозначности.

**Все остальные строки** живут в `src/core/i18n/locales/en.json` и `src/core/i18n/locales/ru.json`. Никаких inline-строк в JSX — всё через `useTranslation()` хук.

---

## Accessibility checklist

Эти требования обязательны для всех экранов и проверяются в `accessibility audit` спринте перед App Store submission.

- **VoiceOver labels** на каждом интерактивном элементе. Иконки без текста сопровождаются `accessibilityLabel`.
- **Динамический шрифт.** Пользовательские настройки Dynamic Type (Larger Accessibility Sizes) поддерживаются для текста интерфейса. Крупные числовые значения (результат расчёта) фиксированы в размере для читабельности.
- **Минимальный контраст текста — WCAG AA (4.5:1).** Проверяется автоматически через `eslint-plugin-jsx-a11y` (где возможно) и вручную для критичных экранов.
- **Цвет — никогда единственный сигнал.** Любая сигнализация (warning, error, success) дублируется иконкой и текстом, не только цветом.
- **Reduce Motion.** При включении системной настройки «Reduce Motion» — анимации заменяются на мгновенные переходы.
- **Reduce Transparency.** Все элементы с прозрачностью имеют непрозрачный fallback.
- **Touchable feedback.** Каждый interactive элемент даёт визуальный отклик на нажатие (изменение opacity / scale).

---

## Навигация — общая схема

```
First Launch
    │
    ▼
[ Splash ] ──(loading complete)──▶ [ Disclaimer ]
                                       │
                                       │ (user accepts)
                                       ▼
                                  [ Main Menu ] ◀───────┐
                                       │                │
                       ┌───────────────┼─────────────┐  │
                       │               │             │  │
                       ▼               ▼             ▼  │
                [ Crosswind ]    [ Settings ]   [ About ]
                       │               │             │
                       └──── back ─────┴──── back ───┘

Subsequent Launches
    │
    ▼
[ Splash ] ──(loading complete)──▶ [ Main Menu ]
            (skip Disclaimer if disclaimerAccepted = true)
```

**Реализуется через `expo-router`** с файловой структурой в `src/app/`
(expo-router auto-detects `src/app/` over root `app/` when present;
choice aligned with `02-architecture.md`):
```
src/app/
├── _layout.tsx              — root layout с провайдерами
├── index.tsx                — splash route (URL `/`, cold-start entry)
├── disclaimer.tsx           — disclaimer (first launch only)
├── (main)/                  — group для главных экранов
│   ├── _layout.tsx          — нав-стек
│   ├── menu.tsx             — Main Menu (URL `/menu`)
│   ├── crosswind.tsx        — Crosswind Calculator
│   ├── settings.tsx
│   └── about.tsx
└── error.tsx                — fail-safe экран
```

**Почему splash живёт в `index.tsx`, а не в `splash.tsx`.** В expo-router URL
`/` резолвится первым попавшимся маршрутом — если оставить и `splash.tsx`
(`/splash`), и `(main)/index.tsx` (`/`), то холодный запуск минует splash и
сразу покажет Main Menu (потому что приложение стартует с URL `/`). Опция
`initialRouteName` только формирует back-stack для deep-link сценариев, не
меняет cold-start. Поэтому splash переехал в `index.tsx`, а Main Menu —
в `(main)/menu.tsx`.

---

## Экран 1 · Splash

**Назначение:** показывается при каждом запуске приложения на 1–2 секунды, пока инициализируются все провайдеры (i18n, theme, disclaimer state, JSON-данные).

**Состояния:**
- `loading` — показывается логотип + индикатор загрузки. Это default состояние.
- `data-ready` — переходит на `disclaimer.tsx` (если не принят) или на `(main)/menu.tsx` (если принят).
- `data-error` — переходит на `error.tsx` (fail-safe, если bundled JSON повреждён).

**Поведение:**
- Минимальная длительность отображения — 800 ms (даже если данные загрузились мгновенно). Это для визуального комфорта, чтобы splash не «мигал».
- Максимальная длительность ожидания — 5 секунд. Если за это время данные не загрузились — переход на `error.tsx`.
- При нажатии на splash → ничего не происходит (тач игнорируется до перехода).

**Содержимое:**
- Логотип-плейсхолдер «B7» (см. `03_Mockups/index.html` секция «Splash»).
- Название приложения «B787 Calculator».
- Подпись «Electronic Performance Tools».
- Версия приложения (читается из `expo-application`).

**Стилизация (см. `module-contracts/design-system.md` для значений токенов):**
- Логотип-квадрат `56 × 56`, `borderRadius: 14`, фон — `accent` (#00C2A8),
  текст «B7» — variant `monoLarge` цвета `textOnAccent`.
- Заголовок «B787 Calculator» — variant `heading3` цвета `textPrimary`.
- Подпись и версия — variant `caption` цвета `textSecondary` / `textTertiary`.
- Фон экрана — `bgPage` (используется через компонент `<Screen>`).

---

## Экран 2 · Disclaimer

**Назначение:** показывается только при первом запуске. Требует явного подтверждения от пользователя перед доступом к функциональности.

**Состояния:**
- `displayed` — видны текст и кнопка «I understand · Continue».
- `accepted` — флаг `disclaimerAccepted = true` записывается в AsyncStorage, переход на Main Menu.

**Текст дисклеймера** (фиксированный, английский, не локализуется):

> Advisory only. Calculations provide conservative reference values for Boeing 787 operations. Final operational decisions must always be based on official Boeing FCOM/QRH and your operator's procedures. Not for primary navigation or operational use.

**Поведение:**
- Кнопка «I understand · Continue» — единственное действие на экране. Размер ≥ 56×56 pt.
- Свайп назад / Back gesture отключён на этом экране.
- При повторном запуске после подтверждения — экран не показывается.

**Стилизация (см. `module-contracts/design-system.md` для значений токенов):**
- Композиция повторяет splash: логотип `56 × 56` (`accent`, radius 14, текст
  «B7» variant `monoLarge` / цвет `textOnAccent`) + заголовок «B787 Calculator»
  variant `heading3` + подпись `caption` цвета `textSecondary`.
- Тело дисклеймера рендерится через DS-компонент `<Disclaimer>` (амбер-карточка):
  фон `warnSoft`, граница `warnBorder`, `borderRadius: 10`,
  `padding: 14×16`, `maxWidth: 380`.
- Заголовок карточки — `⚠ ` + текст «Advisory only», variant `chipLabel`,
  цвет `warn`, `textTransform: uppercase`.
- Тело — variant `bodySmall` цвета `textSecondary`.
- Кнопка «I understand · Continue» — `Button` variant `primary` (фон `accent`,
  текст `textOnAccent`).

**Edge case:** если `disclaimerAccepted` в AsyncStorage недоступен (corrupted storage) — считается, что disclaimer не принят, экран показывается.

---

## Экран 3 · Main Menu

**Назначение:** точка входа для пользователя. Список модулей crosswind-семьи: один тизер + одна активная карточка (см. `01-vision.md` § «Что входит в MVP»).

**Структура:**
- Header: логотип + название приложения + nav-pills (Modules, Settings, About).
- Content: 1×2 сетка карточек, render order соответствует хронологии фазы
  полёта (takeoff предшествует landing):
  - **Crosswind · Landing** — Phase 2, неактивная (тизер). Слот #1.
  - **Crosswind · Takeoff** — активная, открывает Crosswind Calculator. Слот #2.

Активная карточка осознанно во втором слоте, не в первом — это
отражает физический порядок фаз полёта (takeoff → landing) и
помогает пилоту читать меню как roadmap «что будет дальше → что
уже работает» (Landing — следующая фаза, для которой данные пока
не выгружены). Weight & Balance и Performance в MVP не показываются
ни в каком виде (см. подсекцию «Long-term backlog (post-MVP)» в
`01-vision.md`).

**Поведение карточек:**
- **Активная** — `Pressable` с opacity feedback, навигация на `/crosswind` через `expo-router`.
- **Неактивная (coming soon)** — `Pressable` с тем же visual feedback, открывает Coming Soon Modal (см. ниже).

**Состояния модуля:**
- `active` — реализован, доступен для использования.
- `coming-soon` — показан как тизер, тап вызывает modal.

Активные feature-модули импортируются из `src/features/*` и рендерятся
явно в Main Menu. Coming-soon тизеры читаются из bundled JSON-конфига
`src/core/coming-soon-modules/data.json` через хук
`useComingSoonModules()` (см. ADR-0004). JSON содержит только тизеры — у
каждого entry есть `id`, `name`, `description`, `icon`, `phase`:
```json
[
  {
    "id": "crosswind-landing",
    "name": "Crosswind · Landing",
    "description": "Same crosswind logic applied to the landing phase.",
    "icon": "LD",
    "phase": "Phase 2"
  }
]
```

При выходе Phase 2 запись удаляется из JSON, активной карточкой
становится Crosswind · Landing (либо параллельно с Takeoff, либо как
её замена в зависимости от reorganisation), и Main Menu рендерит
её как активную карточку без изменений в остальном коде. До тех
пор тап по Landing-тизеру открывает Coming Soon Modal.

**Visual treatment** (см. `03_Mockups/index.html` секция 2 «Main Menu —
Modules», классы `.app-header`, `.app-logo`, `.app-title`, `.nav-pills`,
`.menu-grid`, `.module-card`, `.module-icon`, `.module-name`,
`.module-desc`, `.coming-badge`):

*Header (app-header):*

- **Раскладка зависит от ширины экрана** (порог — 768 pt, ширина
  iPad-mini portrait):
  - **Wide (`width >= 768`)** — single-row: брендовый блок (логотип +
    название) слева, NavPills справа, `justify: space-between`.
    Применяется на iPad portrait/landscape и iPhone landscape.
  - **Compact (`width < 768`)** — two-row: row 1 содержит лого + название
    (left-aligned), row 2 содержит NavPills full-width с равным
    распределением (каждая pill `flex: 1`, gap 8 pt, `alignSelf:
    stretch`), отступ row 2 от row 1 — 8 pt. Применяется на любом iPhone
    portrait. Это нужно потому, что на узкой ширине длинные
    локализованные лейблы (например русский «О приложении») в одной
    строке с brand-блоком обрезаются у правого края.
- Нижний отступ от content — 16 pt; разделитель — 1 pt линия
  `tokens.colors.border`.
- App-logo: `28×28` pt, `borderRadius: 6 pt`, фон `tokens.colors.accentSoft`,
  глиф «B7» — variant `mono` (или новый `monoSmall` если тонкого
  monospace-варианта недостаточно), цвет `tokens.colors.accent`, weight 700.
- App-title: variant `body` weight 600 (sans 16 pt), цвет `textPrimary`. Gap
  10 pt между логотипом и заголовком.
- NavPills (Modules / Settings / About): pill-кнопки `~12 pt` лейбл, weight 500.
  - Активная pill: фон `accentSoft`, цвет текста `accent`.
  - Неактивная: прозрачный фон, цвет `textSecondary`.
  - Padding `~5 × 10 pt`, `borderRadius: 10 pt`, gap между pill-ами 8 pt.
  - Touch-target ≥ 44×44 pt даже при визуально меньшем чипе (пустой padding
    компенсирует — см. existing «Принцип 2» вверху документа).
  - В compact-режиме (см. выше) NavPills получают prop `grow=true`,
    применяющий `flex: 1` к каждой pill, чтобы они равномерно занимали
    всю ширину строки. Truncate / horizontal scroll **запрещены** —
    длинные локализованные лейблы должны оставаться полностью
    читаемыми (см. § «Длинный текст в локализации» в Edge cases).

*Module grid (menu-grid):*

- Раскладка следует существующей секции «Адаптивность iPad ↔ iPhone»
  (не переопределяем здесь breakpoint-ы): 2 колонки на iPad regular и
  iPhone landscape; 1 колонка с увеличенными карточками на iPhone portrait.
- Gap между карточками: **compact 14 pt / regular 18 pt** (см.
  `tokens.sizing.moduleCard.{compact,regular}.gridGap`).
- Верхний margin от header — 14 pt.

*Адаптивные размеры (compact phone vs iPad regular).* Все ниже
перечисленные блоки берут параметры из
`tokens.sizing.moduleCard.{compact,regular}` и
`tokens.sizing.header.{compact,regular}`. Consumers Main Menu решают
какой набор использовать через `useWindowDimensions().width >=
tokens.breakpoints.regularHeader` (768 pt — порог iPad-mini portrait).
Compact-набор остаётся на iPhone в любой ориентации, regular-набор
включается на iPad portrait/landscape.

*Card surface:*

| | compact | regular |
|---|---|---|
| Padding | 12 pt | 20 pt |
| Border radius | 10 pt | 12 pt |

Фон — `tokens.colors.bgCard`, граница `tokens.colors.border` (1 pt).

*Активная карточка (`active`):*

- Граница переключается на `tokens.colors.accent`.
- Фон — линейный градиент `135°` от `tokens.colors.bgCard` к
  `tokens.colors.accentSoft`, реализованный через `expo-linear-gradient`
  (стандартный SDK-модуль, добавлен в `03-tech-stack.md`). В dark-теме
  это `#11161F → #003C36`; в light — `#FFFFFF → #DEF7F3` — оба варианта
  один-к-одному с mockup-секцией 2.
- LinearGradient рендерится как `StyleSheet.absoluteFillObject` под
  всеми content-нодами карточки; родительский Animated.View имеет
  `overflow: 'hidden'`, чтобы скруглённые углы клиппировали градиент.
- Tap → навигация на `/(main)/crosswind` (поведение уже описано выше).

*Coming-soon карточка (`coming`):*

- Surface — та же, что у базовой карточки (полная opacity сохраняется ради
  читаемости текста). Визуальное «приглушение» создаётся muted-иконкой
  и phase-бейджем — НЕ снижением opacity всей карточки.

*Module icon (module-icon):*

| | compact | regular |
|---|---|---|
| Size | 28×28 pt | 40×40 pt |
| Border radius | 6 pt | 8 pt |
| Glyph (mono) | 11 pt | 14 pt |
| Margin-bottom от name | 8 pt | 12 pt |

- Активная: фон `tokens.colors.accentSoft`, цвет `tokens.colors.accent`,
  глифы «XW» / etc.
- Coming-soon: фон `rgba(textSecondary, 0.15)` (≈ 15 % alpha от
  `tokens.colors.textSecondary`), цвет `tokens.colors.textTertiary`.
  *design-system to add `colors.iconMuted` token (mockup использует
  `rgba(139, 148, 158, 0.15)` в dark, симметрично в light).*

*Module name:*

| | compact | regular |
|---|---|---|
| Font size | 12 pt | 18 pt |
| Line height | 16 pt | 22 pt |
| Weight | 600 (caption) | 600 |
| Color | `textPrimary` | `textPrimary` |

*Module description:*

| | compact | regular |
|---|---|---|
| Font size | 10 pt | 14 pt |
| Line height | 14 pt | 21 pt |
| Weight | 400 | 400 |
| Color | `textSecondary` | `textSecondary` |

Один предложение, без ожидаемой truncation на стандартных размерах.

*Coming badge (coming-badge):*

- Абсолютно позиционирован: `top: 8 pt`, `right: 8 pt` от карточки.
- Uppercase, letter-spacing 0.06em, цвет `tokens.colors.textTertiary`,
  weight 400.

| | compact | regular |
|---|---|---|
| Font size | 8 pt | 11 pt |

Текст вида «Phase 2».

*Header sizing (compact / regular):*

| | compact | regular |
|---|---|---|
| App-logo size | 28×28 pt | 36×36 pt |
| App-logo radius | 6 pt | 8 pt |
| App-title size | 16 pt | 22 pt |
| NavPill label | 12 pt | 16 pt |
| NavPill padding | 5 × 10 pt | 8 × 16 pt |
| NavPill radius | 10 pt | 12 pt |

`Compact` соответствует существующему правилу two-row header (см. выше);
`regular` совпадает с single-row header.

*Tap behavior* — поведение уже описано выше («Поведение карточек»);
press-feedback анимация (scale 1 → 0.97 + opacity 1 → 0.85) применяется
ко всем module cards и NavPills из § «Анимации».

---

## Экран 3.1 · Coming Soon Modal

**Назначение:** показывается при тапе на неактивную карточку. Объясняет, что модуль планируется, и позволяет вернуться.

**Содержимое:**
- Иконка модуля.
- Название модуля.
- Бейдж «Phase X».
- Текст: «This module is planned for an upcoming release. Stay tuned.» (локализуется).
- Кнопка «OK» / «Got it» (локализуется).

**Поведение:**
- Появляется как modal (slide-up animation, 300 ms).
- Закрывается тапом на «OK», тапом по затемнённой области, или системным жестом.
- При закрытии — возврат на Main Menu без перехода куда-либо ещё.

**Visual treatment** (см. `03_Mockups/index.html` секция 2, и UX-описание
выше; конкретного `.modal` класса в мокапе нет — комбинируем визуальные
правила `.module-card` и `.accept-btn`):

- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), `borderRadius: 16 pt`, центрирован по горизонтали с `~24 pt`
  margin от краёв экрана. Internal padding 16–20 pt.
- Backdrop: однотонная плашка `rgba(0, 0, 0, 0.55)` поверх остального UI.
  Tap по backdrop закрывает modal (поведение уже описано выше).
- Иконка модуля + название: те же токены и размеры, что на module-card в
  Main Menu (см. выше «Module icon» / «Module name»).
- Phase-бейдж: тот же стиль, что `.coming-badge` в Main Menu (см.
  «Coming badge» выше) — но размещён inline (не absolute) внутри
  modal, рядом с названием.
- Body text: variant `body` (sans 16 / 22, 400), цвет `textSecondary`,
  margin-top 8 pt от заголовка.
- Primary button (OK / Got it): full-width внутри modal, `minHeight: 44 pt`,
  фон `tokens.colors.accent`, цвет foreground — *design-system to add
  `colors.accentOnAccent` token (mockup использует `#001A17`,
  одинаково в обеих темах для контраста на teal-фоне).* Weight 600,
  variant `caption` или `body` weight 600.
- Анимация: slide-up 300 ms (см. existing «Анимации»). При включённой
  системной опции «Reduce Motion» — мгновенный fade (cross-ref
  «Accessibility checklist» вверху документа).

---

## Экран 4 · Crosswind Calculator

**Назначение:** ввод параметров и отображение рассчитанного crosswind limit.

**Layout:** 2-колоночный на iPad landscape (input слева, result справа). На portrait — стек сверху вниз.

### Input-секция (левая колонка / верхняя на portrait)

**Поля (top-to-bottom):**
1. **Aircraft** — segmented control с двумя вариантами: B787-8 / B787-9.
   - В MVP активен только B787-8. B787-9 отображается как **disabled** (textTertiary, opacity 0.5). Тап по B787-9 не меняет состояние (selection остаётся на B787-8).
2. **TOW actual (t)** — числовое поле, integer. «Takeoff Weight Actual» — стандартная авиационная аббревиатура. Единица — **метрические тонны** (домен использует tons throughout — см. `04-domain-model.md` Принцип «вес всегда в тоннах внутри domain»). Range и валидация — см. ниже.
3. **Center of gravity (% MAC)** — числовое поле, decimal с 1 знаком после запятой.
4. **Runway condition** — segmented control с шестью значениями RWYCC scale: Dry / Good / Medium to Good / Medium / Medium to Poor / Poor.
   - В MVP активен только Dry. Остальные 5 значений отображаются как **disabled** с подписью disabled. Тап показывает короткий toast «Available in upcoming release».
   - На compact-ширине 6 сегментов wrap-ятся в 2 строки по 3 (см. § Segmented control wrap rules ниже). На regular-ширине — single-row из 6 сегментов.

> **Mockup note (kg → t).** В `03_Mockups/index.html` секция 3 поле
> подписано как «Landing weight (kg)»; это артефакт ранней версии
> мокапа и **superseded** этой спекой. Реализация использует
> tonnes (`t`) — с unit-суффиксом «t», placeholder «e.g. 170»,
> сообщениями об ошибке в тоннах. Единицы языка интерфейса
> синхронизированы с доменом и `b787-takeoff.json`. Лейбл поля
> также сменился: «Landing weight» → «TOW actual» (Takeoff Weight
> Actual) — авиационный термин, не локализуется.

**Поведение полей:**
- При первом открытии экрана **все числовые поля пустые**, отображаются placeholder-ы:
  - TOW actual: «e.g. 170» (тонны)
  - CG: «e.g. 25.5»
- Aircraft по умолчанию = `B787-8`.
- Runway condition по умолчанию = `Dry` (т.к. это единственный активный вариант в MVP).
- Live update: после того как **оба** обязательных поля (TOW, CG) заполнены валидными числами, результат пересчитывается немедленно при любом изменении aircraft / weight / CG / runway condition.
- Пока хотя бы одно поле пусто → result-секция в состоянии `empty` (см. ниже), расчёт не производится.
- Валидация формата: ввод не-числовых символов → клавиатура `numeric-pad` не позволяет; для дробных значений — `decimals-pad`.
- **Operational envelope валидация — мягкая.** Когда ввод за пределами `operationalEnvelope` (см. `04-domain-model.md` «Two distinct envelope concepts»), поле подсвечивается тёплым (warn-цветом, не danger), под ним появляется короткое описание («Below minimum 110 t», «Above maximum 35 %MAC»), но **расчёт всё равно выполняется** и result-секция переходит в состояние `idle` с warning chip-ом рядом с числом. Так пилот видит advisory-результат, плюс явное напоминание, что вход — за пределами регуляторных лимитов.
- **DataNotAvailable.** Когда выбран не-имплементированный aircraft (B787-9) или non-dry condition, алгоритм возвращает `DataNotAvailable` с соответствующим `reason`. Result-секция переходит в состояние `data-not-available` (icon + caption «No data available for the selected aircraft.» / «… runway condition.»). Защита: B787-9 / 5 non-dry условий в MVP помечены disabled в UI и тапы не меняют state, поэтому это состояние реально достижимо только через программную инициализацию.
- **NoLookupData — жёсткая ошибка.** Когда алгоритм не может произвести расчёт в принципе (NaN / Infinity в Value Object factories, или повреждённые данные) — result-секция переходит в `out-of-envelope` без числа.
- **Кнопка Reset** в header экрана: очищает оба числовых поля (возвращает в состояние «пусто»), aircraft возвращает к `B787-8`, runway condition — к `Dry`. Без диалога подтверждения.

### Keyboard behavior

iOS softkeyboard на `numeric-pad` / `decimal-pad` **не имеет встроенной кнопки скрытия**, поэтому экран обеспечивает дисмисс двумя путями:

- **Tap outside-to-dismiss.** Экран обёрнут в `KeyboardDismissView`
  (DS-компонент, см. `module-contracts/design-system.md`). Любой тап
  по фону или нечитаемой области (за пределами полей и сегментов)
  закрывает клавиатуру через `Keyboard.dismiss()`. Тапы по самим
  TextInput-ам или сегментам не интерпретируются как «вне input» — они
  обрабатываются adressuemyм компонентом, обёртка не перехватывает.
- **Done key on keyboard.** Каждый `NumericInput` сконфигурирован с
  `returnKeyType="done"`; нажатие Done на iOS-клавиатуре триггерит
  `onSubmitEditing`, который также вызывает `Keyboard.dismiss()`. Это
  даёт пилоту явную клавишу скрытия без необходимости тапать по
  свободной области.

Скролл-жесты не перехватываются — `KeyboardDismissView` это
`Pressable` с `flex: 1`, а не TouchableWithoutFeedback с capturing
overlay. VoiceOver не объявляет обёртку как тапаемую (`accessible:
false`), поэтому пилот с VO навигирует напрямую по полям.

### Result-секция (правая колонка / нижняя на portrait) — Block 5 single Card

**Структурно:** одна Card-плашка, заполняющая колонку целиком на iPad
landscape (`flex: 1`), и фиксированной min-height на compact /
portrait. Содержимое центрировано по горизонтали и вертикали. Никакого
chart-визуала, никакой meta-grid, никакого envelope-position bar — всё
лишнее снято в Block 5 этого PR (`feat/crosswind-takeoff-rebrand`).

**Состояния (`CrosswindUIState` view-model):**
- `empty` — пустые поля ввода. Centered `info-outline` 32 pt + caption «Enter weight and CG to see result».
- `idle` — результат расчёта: status label «Max crosswind · Takeoff» (microUppercase accent) + крупное число + KT-суффикс. Может **сосуществовать** с warning chip-ом (когда вход внутри lookup envelope, но за пределами operational envelope) — см. ниже.
- `out-of-envelope` — `info-outline` 32 pt + caption «Inputs cannot be evaluated by the lookup table. Adjust inputs.». Зарезервировано для `NoLookupData` от алгоритма (NaN/Infinity на входе).
- `data-not-available` — `info-outline` 32 pt + caption, описывающий причину: «No data available for the selected aircraft.» / «No data available for the selected runway condition.» Покрывает `DataNotAvailable.reason ∈ {aircraft-not-implemented, condition-not-implemented}`.
- `error` — danger-headline + опциональная description (рядом с capability disclosure для phase mismatch / `CalculationFailed`).

**Composition: idle + operational-envelope warning.** Когда `validateOperationalEnvelope` возвращает `EnvelopeViolation`, но алгоритм успешно посчитал, result-панель остаётся в `idle` и **под значением** появляется warning chip:
- Текст chip-а: «Outside operational envelope — advisory only» (локализуется).
- Цвет: `tokens.colors.warn` foreground.
- Позиция: marginTop `sm` под value-row.
- Tap-detail на chip — не реализован в MVP (минималистичный one-shot read).

**Содержимое (idle):**
- Status label «Max crosswind · Takeoff» — variant `microUppercase`, accent color, letter-spacing 0.08em (uppercase).
- Value-row (baseline-aligned, centered):
  - Number — variant `display` (mono 48 pt) на compact / `displayLarge` (mono 72 pt) на iPad-regular landscape. Цвет `accent`.
  - Unit «KT» — variant `monoMedium` (mono 24 pt) на compact / `monoXL` (mono 36 pt) на iPad-regular. Цвет `textSecondary`. marginLeft 8 pt.
- Опциональный warning chip — см. выше.
- **Никаких метаданных, никакого footnote, никакого source-chip-а на result-панели.** Source attribution живёт в About → Data source (см. Принцип 4 + § Экран 6).

**Содержимое (error / data-not-available / out-of-envelope):**
- `info-outline` icon 32 pt (textTertiary).
- Caption maxWidth 280 pt, variant `caption`, центрирован.

**Card surface (общее для всех состояний):**
- Фон `tokens.colors.bgCard`, граница `tokens.colors.border` (1 pt), `borderRadius: tokens.radii.lg`, padding `tokens.spacing.lg`.
- Compact: `minHeight: 200 pt`. Regular (iPad landscape `width >= 1024`): `flex: 1` + `minHeight: 320 pt` — карточка растягивается на полную высоту правой колонки.
- alignItems / justifyContent: center (контент по центру card-а).
- Empty↔idle переход: `Animated.View` с `LinearTransition.duration(200ms).easing(Easing.out)`. Reduce Motion bypass через `useReduceMotion` — статичный wrapper без `layout`-prop.

**Visual treatment** (см. `03_Mockups/index.html` секция 3 «Crosswind
Calculator — Input + Result», классы `.calc-layout`, `.input-group`,
`.input-label`, `.input-field`, `.segmented`, `.segment`,
`.result-panel`, `.result-status`, `.result-value`):

*Layout (calc-layout):*

- 2-колонная сетка на iPad landscape (`width >= 1024`); вертикальный
  стек на iPad portrait и iPhone (любая ориентация). Конкретные
  breakpoint-ы — см. секция «Адаптивность iPad ↔ iPhone» внизу
  документа, здесь не дублируем.
- Gap между input-колонкой и result-колонкой: `tokens.spacing.lg`
  (16 pt).
- Top margin от header: `tokens.spacing.md`.

*Header reset / back actions:*

- «Reset» — NavPill в правой части header-а, тот же визуал, что у
  Modules/Settings/About pills, но в неактивном состоянии (прозрачный
  фон, цвет текста `tokens.colors.textSecondary`).
- «Back» — leftmost pill, лейбл `← Back` или chevron-иконка.
  Touch-target ≥ 44×44 pt даже если визуальный chip меньше.

*Input field (input-field) — compact (iPhone, iPad portrait):*

- Surface: фон `tokens.colors.bgCard`, граница
  `tokens.colors.border` (1 pt), `borderRadius: tokens.radii.md`.
- Padding: vertical `sm` (8), horizontal `md` (12). `minHeight ≥ 44 pt`.
- Значение: variant `mono` (mono 16 pt), цвет
  `tokens.colors.textPrimary`.
- Unit-суффикс: variant `monoSmall`, цвет
  `tokens.colors.textTertiary`.
- Label (НАД полем): variant `microUppercase`, цвет
  `tokens.colors.textSecondary`, `textTransform: uppercase`.
- Focus state: граница `1 pt accent` + внешнее `accentRing` свечение
  (2 pt) — реализуется через wrapping-View ring в DS-компоненте
  `NumericInput`.

*Input field — regular (iPad landscape):*

- Размеры выставляются через DS-проп `<NumericInput size="regular">`:
  - `minHeight: 64 pt`.
  - Padding `14 × 20 pt` (vertical × horizontal).
  - Значение: variant `monoMedium` (mono 24 pt).
  - Label: variant `label` (sans 12 pt, weight 600), letter-spacing
    из variant.
  - Unit-суффикс: variant `body` (sans 16 pt).
- Focus / error state — без изменений (тот же ring + danger border).

*Aircraft selector + Runway condition — segmented (compact):*

- Surface: фон `tokens.colors.bgCard`, граница
  `tokens.colors.border` (1 pt), внешний `borderRadius:
  tokens.radii.md`, internal padding 3 pt; row gap 4 pt при wrap.
- Inactive segment: прозрачный фон, цвет
  `tokens.colors.textSecondary`, лейбл variant `segmentLabel` (10 pt).
- Active segment: фон `tokens.colors.accent`, foreground
  `tokens.colors.accentOnAccent`, внутренний `borderRadius:
  tokens.radii.sm`.
- Disabled segment: цвет `tokens.colors.textTertiary` + opacity 0.5.
  Тап → no-op (selection остаётся на текущем значении). Опциональный
  toast «Available in upcoming release» оставлен на усмотрение
  реализации; в текущем коде disabled-сегмент просто игнорирует тапы.

*Aircraft selector + Runway condition — segmented (regular):*

- DS-проп `<SegmentedControl size="regular">`:
  - Track height 56 pt (segment minHeight 50 pt + 3 pt padding × 2).
  - Segment label variant `caption` (sans 12 pt, weight 400).
- Aircraft selector — single-row (2 опции).
- Runway condition — single-row из 6 RWYCC сегментов на regular
  ширине (iPad landscape).

*Segmented wrap rules (RWYCC, compact):*

- DS-проп `<SegmentedControl wrap>`. Когда `options.length >= 5`,
  компонент делит сегменты на 2 равные строки **внутри одной
  bordered surface**: row gap 4 pt (`TRACK_GAP * 2`), segment gap
  внутри строки 2 pt.
- Aircraft selector — `wrap=false` (всего 2 опции, всегда single-row).
- Runway condition — `wrap={!isRegular}`. На compact ширине → 2 ряда
  по 3 сегмента; на regular — single-row.

*Form vertical sizing:*

- Compact: Stack gap `lg` (16 pt) между секциями (Aircraft / TOW /
  CG / Runway).
- Regular: Stack gap `xl` (24 pt) + `justifyContent: space-between` +
  `flex: 1` — input column растягивается на всю высоту left-half и
  распределяет 4 секции с равными промежутками. Это даёт визуальный
  баланс с full-height result-card-ом справа.

*Result panel:*

- Single Card (см. § Result-секция выше). Никаких подэлементов
  «meta-grid», «source chip», «footnote», «envelope-position bar» —
  всё это снято в Block 5. Reference visual style:
  - status label `microUppercase` accent;
  - value `display` (48) / `displayLarge` (72) accent;
  - unit `monoMedium` (24) / `monoXL` (36) textSecondary;
  - optional warning chip `caption` warn ниже value-row.

*Disabled-state toast (Aircraft B787-9 / non-dry runway):*

- Anchored к низу экрана, отступ `24 pt` от safe-area-inset; центрирован
  горизонтально, `maxWidth: 280 pt`.
- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.borderStrong`
  (1 pt), `borderRadius: 8 pt`, padding `12 × 16 pt`.
- Лейбл: variant `caption` (sans 12 / 16, 400), цвет
  `tokens.colors.textPrimary`.
- Auto-dismiss через 2 s, fade-out 200 ms. При системной «Reduce Motion» —
  instant appear / disappear (cross-ref «Accessibility checklist»).

---

## Экран 5 · Settings

**Назначение:** управление настройками приложения.

**Список настроек** (вертикальный список строк):

1. **Language** — кликабельная строка → bottom sheet с выбором (English / Русский). Применяется немедленно.
2. **Theme** — bottom sheet с выбором (Auto / Light / Dark).
3. **Weight units** — Tons (t) / Pounds (lbs). MVP — только tons, переключатель disabled с подсказкой «Available in upcoming release». Mockup-era ярлык «Kilograms (kg)» отменён — domain работает в тоннах, и единица пользовательского ввода в Calculator — тонны (см. § Экран 4 поле «TOW actual (t)»).
4. **Wind units** — Knots (KT) / m/s. MVP — только KT, disabled.
5. **Show data source on result** — toggle, по умолчанию ON.

**Сохранение:** все изменения сохраняются в AsyncStorage немедленно через debounced write (300 ms).

**Visual treatment** (см. `03_Mockups/index.html` секция 4 (левая половина),
классы `.settings-list`, `.settings-row`, `.settings-name`,
`.settings-val`, `.toggle`):

*Settings-list контейнер:*

- Вертикальная колонка, gap 8 pt между строками, `marginTop: 12 pt` от
  header.

*Settings-row (один пункт):*

- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), `borderRadius: 8 pt`, padding `10 × 12 pt`.
- Раскладка: name слева, value/control справа (`justifyContent:
  space-between`, `alignItems: center`).
- Name (settings-name): variant `caption` weight 500 (sans 12), цвет
  `tokens.colors.textPrimary`.
- Value (settings-val) для не-toggle строк: variant `bodySmall` mono
  (mono 11 / 16, 400) — см. `monoSmall` форвард-сигнал из Crosswind
  выше; цвет `tokens.colors.textSecondary`.
- Для строк-«navigate to bottom-sheet» (Language, Theme): после value
  добавляется `›` chevron — sans 12 pt, цвет `tokens.colors.textTertiary`,
  margin-left 8 pt. Опционально иконка `chevron-right` из
  `@expo/vector-icons` вместо текстового глифа.

*Toggle (DS-компонент Toggle):*

- Track: `32 × 18 pt`, `borderRadius: 9 pt`.
- ON state: фон track-а `tokens.colors.accent`; knob — `14 × 14 pt`
  белый круг (фон `#FFFFFF` — design-system to alias as
  `colors.toggleKnob` если в светлой теме потребуется иной оттенок),
  `borderRadius: 7 pt`, inset 2 pt от правого края track-а.
- OFF state: фон track-а `tokens.colors.textTertiary`; knob inset
  2 pt от левого края.
- Disabled toggle (Weight units / Wind units в MVP): track при
  opacity 40 %; под title строки добавляется caption «Available in
  upcoming release» — variant `bodySmall` (sans 11), цвет
  `tokens.colors.textTertiary`.

*Bottom-sheet для Language / Theme:*

- Surface: фон `tokens.colors.bgCard`, верхние углы `borderRadius: 16 pt`,
  нижние углы — 0 (липнет к нижнему safe-area).
- Drag-handle: bar `36 × 4 pt`, `borderRadius: 2 pt`, цвет
  `tokens.colors.textTertiary` при 30 % opacity, `marginTop: 12 pt`,
  центрирован по горизонтали.
- Option-row: тот же визуальный язык, что у обычного `settings-row`
  (фон `bgCard`, `borderRadius: 8 pt`, padding `10 × 12 pt`); на
  выбранном option — иконка `check` (из `@expo/vector-icons`) цвета
  `tokens.colors.accent` справа.
- Tap по option = немедленное применение (поведение уже описано выше) +
  закрытие bottom-sheet с slide-down 250 ms (cross-ref «Анимации»).
- При «Reduce Motion» — instant appear / disappear (cross-ref
  «Accessibility checklist»).

---

## Экран 6 · About

**Назначение:** информация о приложении, ссылки на юридические документы.

**Содержимое (3 ряда реализованы в PR `feat/crosswind-polish-2`,
5 деферрированы на Sprint 6 — отмечены ниже):**
1. ✅ **Version** — версия + build номер (через `expo-application`).
2. ✅ **Aircraft** — «Boeing 787-8» (только -8 в MVP).
3. ⏳ **Validation** — «Active line pilots». (Sprint 6)
4. ✅ **Data source** — формат `"<referenceDocument> · <dataVersion>"`,
   например «Boeing 787 FCOM · 2026-05-03.001». Значение читается из
   `crosswindRepository.load()`. Это — единственная visible точка
   source-attribution в приложении (см. Принцип 4).
5. ⏳ **Distribution** — «Public App Store». (Sprint 6)
6. ⏳ **Privacy policy** — кликабельная строка, открывает
   `PRIVACY_POLICY.md` через WebBrowser API (не WebView!). (Sprint 6)
7. ⏳ **Terms of use** — аналогично. (Sprint 6)
8. ⏳ **Support** — email-ссылка, открывает почтовый клиент. (Sprint 6)

**Visual treatment** (см. `03_Mockups/index.html` секция 4 (правая половина);
переиспользуем классы `.settings-row`, `.settings-name`, `.settings-val`):

- Та же row-сетка, что у Settings: surface `tokens.colors.bgCard`,
  граница `tokens.colors.border` (1 pt), `borderRadius: 8 pt`, padding
  `10 × 12 pt`, gap 8 pt по вертикали между строками,
  `marginTop: 12 pt` от header.
- Row name: variant `caption` weight 500 (sans 12), цвет
  `tokens.colors.textPrimary`.
- Row value (read-only данные — Version, Aircraft, Validation,
  Distribution, Data source): variant `bodySmall` mono (mono 11 / 16,
  400; см. `monoSmall` форвард-сигнал из Crosswind), цвет
  `tokens.colors.textSecondary`.
- Tappable rows (Privacy policy, Terms of use, Support): значение —
  affordance-лейбл («View →» / «Open →» / email-адрес или
  локализованный «Open mail»). Mono 11 pt, цвет `tokens.colors.accent`
  (а не `textSecondary` — accent сигнализирует интерактивность).
  Дополнительно справа — chevron-иконка `chevron-right` из
  `@expo/vector-icons`, цвет `accent`.
- Data source — пример отрисовки: «787 ACAP · public» (актуальная
  строка определяется `dataVersion` из bundled JSON, см. существующее
  «Содержимое» выше).
- Mailto row (Support): использует placeholder из
  `07-app-store-compliance.md` § «Outstanding placeholders for Phase D»
  → «Support mailto target». В Sprint 6 при имплементации этого экрана
  ОБЯЗАТЕЛЬНО оставить этот плейсхолдер закомментированным или
  лифтнуть в общую константу — ровно тот же placeholder, что в
  `src/app/error.tsx`. Заменяется на реальный адрес одновременно по
  всем точкам в Phase D.

---

## Экран 7 · Fail-safe Error Screen

**Назначение:** показывается при критических ошибках (corrupted JSON, провал инициализации). Альтернатива крашу.

**Содержимое:**
- Иконка предупреждения.
- Заголовок: «Reference data unavailable».
- Описание: «The application could not load reference data. Please contact support and reinstall the app.»
- Кнопка «Retry» — пробует заново загрузить.
- Кнопка «Contact support» — email-ссылка.
- Версия приложения (мелким шрифтом внизу).

**Поведение:**
- При успешной retry → переход на Main Menu или Disclaimer (по обычному flow).
- Этот экран не содержит навигации в другие экраны — пользователь либо retry, либо выходит из приложения.

---

## Анимации

Анимации **минимальны и функциональны**, никакого декора:

- Переход между экранами: стандартный slide-from-right (`expo-router` default), 300 ms.
- Splash → следующий экран: fade-out 200 ms.
- Modal (Coming Soon, error dialogs): slide-up 300 ms.
- Press-feedback на интерактивных surface-ах (см. ниже).
- Result panel update: fade-in нового значения 150 ms.

**Press-feedback (scale + opacity).** На всех интерактивных surface-ах
дизайн-системы (`Button` всех вариантов, `NavPills` каждый pill в
отдельности, активная и coming-soon карточки модулей в Main Menu) при
нажатии применяется парная анимация:

- Press-in: `scale 1 → 0.97`, `opacity 1 → 0.85`, длительность 100 ms,
  easing `Easing.out(Easing.ease)`.
- Press-out: `scale 0.97 → 1`, `opacity 0.85 → 1`, длительность 150 ms,
  тот же easing.

Реализация — хук `useScaleOnPress` из `src/design-system/hooks/`, который
держит per-call-site `useSharedValue`-пары и возвращает `animatedStyle`
+ `onPressIn` / `onPressOut`. Каждый consumer оборачивает свой visible
surface в `<Animated.View style={[..., animatedStyle]}>` и проксирует
два press-handler-а в `<Pressable>`. Параметры — токены
`tokens.motion.press.{scaleFrom,scaleTo,opacityFrom,opacityTo,
durationInMs,durationOutMs}`; никаких inline-чисел.

При включённой системной опции **Reduce Motion** — press-feedback и
любые экранные/модальные переходы заменяются на мгновенные (длительность
0 ms). Хук подписан на `AccessibilityInfo.addEventListener
('reduceMotionChanged', ...)` и возвращает identity-`animatedStyle`,
press-handler-ы становятся no-op-ами (никаких `withTiming`-вызовов).
Подписка живёт live — флаг отрабатывает без перезапуска приложения.

Для всех анимаций используется `react-native-reanimated`.

**Stack container background.** На каждом `<Stack>` в `expo-router`
(включая root `app/_layout.tsx` и `app/(main)/_layout.tsx`)
`screenOptions.contentStyle.backgroundColor` ОБЯЗАН быть равен
`tokens.colors[theme.resolved].bgScreen` — иначе во время slide-from-right
из-под движущейся карточки экрана просвечивает дефолтный системный белый
фон контейнера, и в тёмной теме это видно как кратковременная белая
полоса. Цвет читается через `useTheme()` хук, hardcoded значение
запрещено: иначе перестанет работать переключение темы.

---

## Edge cases в UI

**Offline-режим:** приложение полностью работает офлайн (нет сетевых запросов). Никаких сетевых индикаторов, никаких сообщений «Check your connection» — они здесь неуместны.

**Адаптивность iPad ↔ iPhone:** приложение оптимизировано под оба класса устройств. Реализуется через систему breakpoint-ов в design-system:

- **iPad landscape** (regular width, ≥ 1024 pt): полная 2-колоночная компоновка калькулятора (input | result), Main Menu в 2×2 grid, плотные карточки.
- **iPad portrait** (regular width, < 1024 pt): калькулятор стек-вертикально (input сверху, result снизу), Main Menu в 2×2 grid.
- **iPhone landscape** (compact height): калькулятор 2-колоночный, но с уменьшенными отступами; Main Menu в 2-колонную сетку.
- **iPhone portrait** (compact width): калькулятор стек-вертикально; Main Menu в 1 колонку с увеличенными карточками.

Реализация через `useWindowDimensions()` хук + media-предикаты в design-system. Все компоненты разрабатываются как «адаптивные» с одной кодовой базой, без отдельных iPhone/iPad-версий.

**Layout matrix · Crosswind input + result.** Гейтинг крупного
input/result варианта **жёстко привязан к 2-колоночной раскладке**, а
не к breakpoint-у `regularHeader` (768 pt). Это нужно потому, что
regular-вариант полагается на flex-fill height chain, и только в iPad
landscape (`width >= 1024`) Crosswind-screen переходит в
`<Row>`-раскладку, где column-View поставляет растягиваемый контейнер.

| Viewport | Layout | Input form sizing | Result-panel typography |
|----------|--------|-------------------|-------------------------|
| iPhone any orientation (`< 1024`) | stacked vertical | compact (44 pt fields, segmented wrap 2×3 для RWYCC) | compact (`display` 48 / `monoMedium` 24) |
| iPad portrait (regular width, `< 1024`) | stacked vertical | compact | compact |
| iPad landscape (regular width, `≥ 1024`) | 2-column (input \| result) | regular (64 pt fields, monoMedium value, single-row 6-segment runway) + form `flex: 1` + `justify: space-between` | regular (`displayLarge` 72 / `monoXL` 36 + `flex: 1` fill) |
| iPhone landscape (compact height) | 2-column compact-spaced (через media-щаблон) | compact | compact |

Поэтому булева переменная `isRegular` в `CrosswindScreen` вычисляется
как `isTwoColumn = width >= 1024` и пробрасывается одним и тем же
сигналом в `<CrosswindInputForm isRegular>` и
`<CrosswindResult isRegular>`. Пере-сцепка с другим breakpoint-ом без
сопутствующего рефакторинга layout-chain схлопнет full-height layout
на iPad portrait. Кейс описан в коммите PR #31
(`fix(crosswind): correct iPad portrait layout`).

В App Store Listing указываются supported devices: iPhone и iPad. Скриншоты готовятся под оба класса (минимум 6.7" iPhone и 12.9" iPad — обязательные по требованиям App Store Connect).

**Большой шрифт пользователя (Dynamic Type):** интерфейсный текст увеличивается, крупное число результата — нет (фиксированный размер для читабельности).

**Поворот экрана:** все экраны поддерживают и portrait, и landscape. Calculator на landscape iPad выглядит наиболее эффективно (2 колонки).

**Длинный текст в локализации:** UI-компоненты должны выдерживать удлинение строк до 50% (для немецкого, на случай Phase 2). Тексты не truncate-ятся неожиданно — они переносятся.

---

## Open questions

1. Нужны ли haptic feedback (vibrations) на результат расчёта? Решение: пока нет, добавим в Phase 2 если будет запрос.
2. Открытие Privacy Policy и Terms of Use — через `expo-web-browser` (in-app browser) или открывать в Safari. Решение: используем `WebBrowser.openBrowserAsync()` — это даёт consistent UX и не уводит пользователя из приложения; в случае проблем переключаемся на стандартное открытие Safari через `Linking.openURL()`.

---

## Exit-критерии этого документа

- [ ] Поведение каждого экрана описано однозначно: что показывается, когда, какие переходы, какие edge-cases.
- [ ] Решение про live computation (без кнопки Calculate) одобрено.
- [ ] Дисклеймер показывается **только при первом запуске** — подтверждено.
- [ ] Coming Soon модуль через JSON-конфиг, не отдельные модули — подтверждено.
- [ ] Fail-safe экран существует и подменяет любой crash.
- [ ] Accessibility checklist согласован.
- [ ] Open questions либо закрыты, либо явно отложены.
