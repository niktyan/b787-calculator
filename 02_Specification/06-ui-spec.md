# 06 · UI Specification

## Назначение документа

Описывает **поведение каждого экрана** приложения — что, когда и как показывается, какие состояния возможны, как работает навигация, локализация, accessibility, темы и переходы. Визуальные референсы лежат в `03_Mockups/index.html`. Этот документ дополняет мокапы формальной спецификацией поведения — то, что нельзя увидеть на статичных скриншотах.

Любое UI-решение в коде, противоречащее этому документу, является ошибкой.

---

## Принципы UX

**Принцип 1 · Минимум кликов до результата.** На главном экране калькулятора все поля видимы сразу, без скролла. Изменение любого поля ввода → результат пересчитывается и обновляется немедленно (live computation). Никакой кнопки «Calculate».

**Принцип 2 · Большие тач-зоны.** Минимум 44×44 pt согласно Apple HIG. Для критичных интерактивных элементов (кнопки на splash, переключатели в калькуляторе) — 56×56 pt.

**Принцип 3 · Числа крупным monospace-шрифтом.** Числовые результаты, поля ввода и таблицы значений отображаются шрифтом с моноширинной разметкой (SF Mono или системный fallback). Это упрощает считывание точных чисел.

**Принцип 4 · Источник всегда виден.** На экране результата всегда показывается метка источника данных (chip «Reference: 787 FCOM»). Это напоминает пилоту, что приложение — advisory, а истина — в FCOM.

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
- Авиационные термины: KT, MAC, RWY, RWYCC, FCOM, OM-B, CG.
- Названия модулей в Main Menu.
- Названия состояний ВПП: Dry, Wet, Contaminated.
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
  - **Crosswind · Takeoff** — Phase 2, неактивная (тизер). Слот #1.
  - **Crosswind · Landing** — активная, открывает Crosswind Calculator. Слот #2.

Активная карточка осознанно во втором слоте, не в первом — это
отражает физический порядок фаз полёта и помогает пилоту читать меню как
roadmap «что будет дальше → что уже работает». Weight & Balance и
Performance в MVP не показываются ни в каком виде (см. подсекцию
«Long-term backlog (post-MVP)» в `01-vision.md`).

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
    "id": "crosswind-takeoff",
    "name": "Crosswind · Takeoff",
    "description": "Same crosswind logic applied to the takeoff phase.",
    "icon": "TO",
    "phase": "Phase 2"
  }
]
```

При выходе Phase 2 запись удаляется из JSON, добавляется
`src/features/crosswind-takeoff/`, и Main Menu рендерит её как активную
карточку без изменений в остальном коде.

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
- Gap между карточками — 10–14 pt; верхний margin от header — 14 pt.
- Card surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), `borderRadius: 10 pt`, internal padding 12 pt.

*Активная карточка (`active`):*

- Граница переключается на `tokens.colors.accent`.
- Фон — линейный градиент `135°` от `bgCard` к `accentSoft`. Реализация в
  RN: `expo-linear-gradient` (если он уже на allow-list в `03-tech-stack.md`)
  или однотонная заливка `accentSoft`-tint в качестве визуально
  эквивалентной деградации — implementation note, не блокер.
- Tap → навигация на `/(main)/crosswind` (поведение уже описано выше).

*Coming-soon карточка (`coming`):*

- Surface — та же, что у базовой карточки (полная opacity сохраняется ради
  читаемости текста). Визуальное «приглушение» создаётся muted-иконкой
  и phase-бейджем — НЕ снижением opacity всей карточки.

*Module icon (module-icon):*

- `28×28` pt, `borderRadius: 6 pt`, mono-глиф 11 pt weight 700 (variant
  `mono` или новый `monoSmall`).
- Активная: фон `tokens.colors.accentSoft`, цвет `tokens.colors.accent`,
  глифы «XW» / etc.
- Coming-soon: фон `rgba(textSecondary, 0.15)` (≈ 15 % alpha от
  `tokens.colors.textSecondary`), цвет `tokens.colors.textTertiary`.
  *design-system to add `colors.iconMuted` token (mockup использует
  `rgba(139, 148, 158, 0.15)` в dark, симметрично в light).*

*Module name + description:*

- Name: variant `caption` weight 600 (sans 12 pt), цвет `textPrimary`,
  margin-bottom 2 pt.
- Description: 10 pt sans 400, line-height 1.4, цвет `textSecondary`. Один
  предложение, без ожидаемой truncation на стандартных размерах.
  *design-system to add typography variant `microBody` (sans 10 / 14, 400)
  если 11 pt `bodySmall` визуально тяжело смотрится в карточке.*

*Coming badge (coming-badge):*

- Абсолютно позиционирован: `top: 8 pt`, `right: 8 pt` от карточки.
- 8 pt uppercase, letter-spacing 0.06em, цвет `tokens.colors.textTertiary`,
  weight 400. Текст вида «Phase 2».
  *design-system to add typography variant `microChip` (sans 8 / 12, 400,
  letterSpacing 0.06em → ≈0.48 pt) — новый вариант для микро-бейджей.*

*Tap behavior* — поведение уже описано выше («Поведение карточек»); здесь
визуал не дублируется.

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

**Поля:**
1. **Landing weight (kg)** — числовое поле, integer. Range см. в `04-domain-model.md` envelope.
2. **Center of gravity (% MAC)** — числовое поле, decimal с 1 знаком после запятой.
3. **Runway condition** — segmented control с тремя вариантами: Dry / Wet / Contaminated.
   - В MVP активен только Dry. Wet и Contaminated отображаются как **disabled** с подписью «Coming soon» (тап показывает короткий toast «Available in upcoming release»).
4. **RWYCC** — segmented control 1–6, видим только при `runway condition === 'contaminated'`. В MVP скрыт (т.к. contaminated не активен).

**Поведение полей:**
- При первом открытии экрана **все числовые поля пустые**, отображаются placeholder-ы:
  - Weight: «e.g. 170»
  - CG: «e.g. 25.5»
- Runway condition по умолчанию = `Dry` (т.к. это единственный активный вариант в MVP).
- Live update: после того как **оба** обязательных поля (weight, CG) заполнены валидными числами, результат пересчитывается немедленно при любом изменении.
- Пока хотя бы одно поле пусто → result-секция в состоянии `empty` (см. ниже), расчёт не производится.
- Валидация формата: ввод не-числовых символов → клавиатура `numeric-pad` не позволяет; для дробных значений — `decimals-pad`.
- Валидация диапазона: число вне envelope → поле подсвечивается красной обводкой, под ним появляется короткое описание ошибки («Below minimum 110 t», «Above maximum 35 %MAC»), result-секция переходит в состояние `out-of-envelope`.
- **Кнопка Reset** в header экрана: очищает оба поля (возвращает в состояние «пусто»), runway condition возвращает к `Dry`. Без диалога подтверждения — действие моментальное и немного откатывается через возврат фокуса в первое поле.

### Result-секция (правая колонка / нижняя на portrait)

**Состояния:**
- `empty` — отображается при пустых полях ввода. Содержит крупный placeholder-текст «Enter weight and CG to see result» и иконку (нейтральная, например `info-outline`). Никаких чисел.
- `idle` — отображается результат расчёта (число + метаданные).
- `error` — показывается explanatory message (не число!).
- `out-of-envelope` — отдельное сообщение, например «Weight 95 t is below minimum 110 t. Adjust input.».
- `data-corrupted` — переход на fail-safe error screen.

**Содержимое (idle):**
- Метка «Max crosswind · Landing» сверху.
- Крупное число (48–64 pt) + единица «KT».
- Подпись «Computed for current inputs».
- Метаданные:
  - Weight band (диапазон веса в брекете)
  - CG band (диапазон CG в брекете)
  - RWY (Dry · CC 6)
  - Calc time (для debug)
- Source chip «Reference: 787 FCOM» в правом верхнем углу панели.

**Содержимое (error):**
- Метка «Calculation unavailable».
- Текст с описанием причины (например «Weight 95 t is below minimum 110 t»).
- Кнопка «Retry» (если применимо) или подсказка «Adjust inputs».

**Visual treatment** (см. `03_Mockups/index.html` секция 3 «Crosswind
Calculator — Input + Result», классы `.calc-layout`, `.input-group`,
`.input-label`, `.input-field`, `.segmented`, `.segment`, `.result-panel`,
`.result-status`, `.result-value`, `.result-label`, `.result-meta`,
`.meta-item`, `.source-chip`):

*Layout (calc-layout):*

- 2-колонная сетка на iPad landscape и iPhone landscape; вертикальный
  стек на iPad portrait и iPhone portrait. Конкретные breakpoint-ы — см.
  существующая секция «Адаптивность iPad ↔ iPhone» внизу документа,
  здесь не дублируем.
- Gap между input-колонкой и result-колонкой: 14 pt.
- Top margin от header: 12 pt.

*Header reset / back actions:*

- «Reset» — NavPill в правой части header-а, тот же визуал, что у
  Modules/Settings/About pills, но в неактивном состоянии (прозрачный фон,
  цвет текста `tokens.colors.textSecondary`). Опционально перед
  лейблом — иконка `rotate-ccw` из `@expo/vector-icons` для лучшей
  считываемости.
- «Back» — leftmost pill, лейбл `← Back` или chevron-иконка. Touch-target
  ≥ 44×44 pt даже если визуальный chip меньше (padding компенсирует, см.
  «Принцип 2»).

*Input field (input-field):*

- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), `borderRadius: 8 pt`.
- Padding `10 × 12 pt`, `minHeight ≥ 44 pt`.
- Значение: variant `mono` (mono 16 pt), цвет `tokens.colors.textPrimary`.
- Unit-суффикс (например «kg», «% MAC»): variant `bodySmall` (sans 11 pt),
  цвет `tokens.colors.textTertiary`, выровнен по правому краю.
- Focus state: граница переключается на `tokens.colors.accent`, плюс
  внешнее свечение `2 pt` цвета `rgba(accent, 0.2)`. Это поведение
  должно быть отражено в DS-компоненте `NumericInput` —
  *design-system to add focus-state pattern в NumericInput
  (`borderColor: accent` + outer ring `rgba(0, 194, 168, 0.2)`).*

*Input label (input-label):*

- 9 pt sans, weight 600, uppercase, letter-spacing 0.06em (≈0.54 pt),
  цвет `tokens.colors.textSecondary`. Расположен НАД полем, отступ
  снизу 4–6 pt.
  *design-system to add typography variant `microUppercase` (sans 9 / 12,
  600, letterSpacing 0.54 pt) или расширить существующий `chipLabel`
  поддержкой 9 pt варианта.*

*Segmented control (segmented):*

- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), внешний `borderRadius: 8 pt`, internal padding 3 pt
  (создаёт «track»-эффект); gap между сегментами 2 pt.
- Inactive segment: прозрачный фон, цвет `tokens.colors.textSecondary`,
  лейбл 10 pt sans weight 500.
- Active segment: фон `tokens.colors.accent`, цвет foreground — токен
  `accentOnAccent` (см. форвард-сигнал в Coming Soon Modal выше).
  Внутренний `borderRadius: 6 pt`.
- Disabled segment (Wet, Contaminated в MVP): цвет текста
  `tokens.colors.textTertiary` с reduced-opacity (≈50%) в сочетании с
  tap-handler-ом, который показывает короткий toast «Available in
  upcoming release» (визуал тоста — ниже).

*RWYCC segmented control:*

- Те же визуальные правила, что у runway-condition сегментированного
  контрола, но с 6 сегментами (1–6). В MVP скрыт (см. поведение выше);
  визуальные правила применяются, когда Phase 2 раскроет управление.

*Result panel (result-panel):*

- Surface: фон `tokens.colors.bgCard`, граница `tokens.colors.border`
  (1 pt), `borderRadius: 12 pt`, internal padding 14 pt.
- Контент центрирован: status label, value, sub-label, разделитель,
  meta-grid.
- Source chip (source-chip): абсолютно позиционирован `top: 8 pt`,
  `right: 8 pt`. Surface `tokens.colors.bgScreen` (контрастирует с
  `bgCard` панели), граница `tokens.colors.border` (1 pt),
  `borderRadius: 4 pt`, padding `2 × 6 pt`. Лейбл — 8 pt mono,
  цвет `tokens.colors.textSecondary`. Дефолтный текст «Reference: 787 FCOM»
  (см. существующий «Принцип 4» и «Содержимое (idle)»).
- Status label (result-status): 9 pt sans weight 600, uppercase,
  letter-spacing 0.08em (≈0.72 pt), цвет `tokens.colors.accent`.
  Например: «Max crosswind · Landing». Margin-bottom 8 pt.
  *design-system: вписывается в тот же `microUppercase` variant что и
  input-label (выше); letter-spacing — параметр, переопределяемый
  через style.*
- Value (result-value): variant `display` (mono 48 pt, weight 700,
  letterSpacing -0.5 pt ≈ -0.01em, line-height 56 / 1) — на iPad
  landscape; на узких ширинах автоматически масштабируется по
  существующему container query из мокапа. Цвет
  `tokens.colors.accent`.
- Суффикс «KT»: 24 pt mono weight 700, цвет `tokens.colors.textSecondary`,
  `marginLeft: 6 pt`. *design-system to add typography variant
  `monoMedium` (mono 24 / 28, 700) — текущий `monoLarge` 22 pt и
  `display` 48 pt оставляют пробел.*
- Sub-label (result-label): variant `caption` (sans 12 / 16, 400) или
  10 pt-вариант, цвет `tokens.colors.textSecondary`, margin-bottom 12 pt.
  Например: «Computed for current inputs».
- Divider над meta-grid: `borderTopWidth: 1 pt`, `borderTopColor:
  tokens.colors.border`, `paddingTop: 10 pt`.
- Meta-grid (result-meta): 2 колонки, gap 6 pt, выровнен по левому краю.
- Meta-item label: 9 pt sans uppercase, letter-spacing 0.04em (≈0.36 pt),
  цвет `tokens.colors.textTertiary`. Тот же `microUppercase` variant с
  переопределённым letter-spacing.
- Meta-item value: variant `bodySmall` mono (mono 11 / 16, 400) — тот же
  размер, что и `bodySmall` sans, но monospace; *design-system to add
  variant `monoSmall` (mono 11 / 16, 500) если для метрик нужен
  больший weight, чтобы числа читались на фоне лейблов.*
  Margin-top 2 pt.

*Result panel state mapping* (cross-ref `ResultPanelState` discriminated union
в `module-contracts/design-system.md`):

- `kind: 'empty'` — value/meta заменены центрированным placeholder-текстом
  «Enter weight and CG to see result», цвет `tokens.colors.textSecondary`,
  variant `body` (sans 16 / 22, 400) или `body` weight 500 для лучшей
  заметности; нейтральная иконка `info-outline` сверху. Source chip скрыт.
- `kind: 'idle'` — полная раскладка выше.
- `kind: 'error'` — value-блок заменён 14 pt headline-ом цвета
  `tokens.colors.danger`; description body — variant `caption` (sans 12)
  цвета `textSecondary`; опциональная кнопка «Retry» — DS-компонент
  `Button` variant `secondary`.
- `kind: 'out-of-envelope'` — та же surface, что у `idle`, но headline
  цвета `tokens.colors.warn`, body объясняет нарушенную границу
  (например «Weight 95 t is below minimum 110 t. Adjust input.»).

*Disabled-state toast (Wet/Contaminated tap):*

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
3. **Weight units** — Kilograms (kg) / Pounds (lbs). MVP — только kg, переключатель disabled с подсказкой «Available in upcoming release».
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

**Содержимое:**
1. **Version** — версия + build номер (через `expo-application`).
2. **Aircraft** — «Boeing 787-8» (только -8 в MVP).
3. **Validation** — «Active line pilots».
4. **Data source** — `dataVersion` из bundled JSON. Например: «787 FCOM · 2026-04-29.001».
5. **Distribution** — «Public App Store».
6. **Privacy policy** — кликабельная строка, открывает `PRIVACY_POLICY.md` через WebBrowser API (не WebView!).
7. **Terms of use** — аналогично.
8. **Support** — email-ссылка, открывает почтовый клиент.

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
- Touch feedback: opacity → 0.6 при нажатии, 100 ms.
- Result panel update: fade-in нового значения 150 ms.

При включённой системной опции **Reduce Motion** — все анимации заменяются на мгновенные переходы (длительность 0 ms).

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
