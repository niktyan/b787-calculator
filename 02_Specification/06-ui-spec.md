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

**Реализуется через `expo-router`** с файловой структурой:
```
app/
├── _layout.tsx              — root layout с провайдерами
├── splash.tsx               — splash route
├── disclaimer.tsx           — disclaimer (first launch only)
├── (main)/                  — group для главных экранов
│   ├── _layout.tsx          — нав-стек
│   ├── index.tsx            — Main Menu
│   ├── crosswind.tsx        — Crosswind Calculator
│   ├── settings.tsx
│   └── about.tsx
└── error.tsx                — fail-safe экран
```

---

## Экран 1 · Splash

**Назначение:** показывается при каждом запуске приложения на 1–2 секунды, пока инициализируются все провайдеры (i18n, theme, disclaimer state, JSON-данные).

**Состояния:**
- `loading` — показывается логотип + индикатор загрузки. Это default состояние.
- `data-ready` — переходит на `disclaimer.tsx` (если не принят) или на `(main)/index.tsx` (если принят).
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

**Edge case:** если `disclaimerAccepted` в AsyncStorage недоступен (corrupted storage) — считается, что disclaimer не принят, экран показывается.

---

## Экран 3 · Main Menu

**Назначение:** точка входа для пользователя. Список модулей с одним активным и тремя «coming soon» (см. `01-vision.md`).

**Структура:**
- Header: логотип + название приложения + nav-pills (Modules, Settings, About).
- Content: 2×2 (или 1×4 на узких экранах) сетка карточек:
  - **Crosswind · Landing** — активная, открывает Crosswind Calculator.
  - **Crosswind · Takeoff** — Phase 2, неактивная.
  - **Weight & Balance** — Phase 3, неактивная.
  - **Performance** — Phase 4, неактивная.

**Поведение карточек:**
- **Активная** — `Pressable` с opacity feedback, навигация на `/crosswind` через `expo-router`.
- **Неактивная (coming soon)** — `Pressable` с тем же visual feedback, открывает Coming Soon Modal (см. ниже).

**Состояния модуля:**
- `active` — реализован, доступен для использования.
- `coming-soon` — показан как тизер, тап вызывает modal.

Состояния модулей читаются из `src/core/coming-soon-modules.json`:
```json
[
  { "id": "crosswind-landing", "active": true, "phase": null },
  { "id": "crosswind-takeoff", "active": false, "phase": "Phase 2" },
  { "id": "weight-balance", "active": false, "phase": "Phase 3" },
  { "id": "performance", "active": false, "phase": "Phase 4" }
]
```

При выходе Phase 2 этот JSON обновляется, перевыпускается приложение через App Store update — никаких изменений в коде Main Menu.

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
