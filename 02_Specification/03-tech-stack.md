# 03 · Tech Stack

## Назначение документа

Документ фиксирует **точный технический стек** проекта: язык, фреймворки, библиотеки, версии, и обоснование каждого выбора. Содержит также **явный список запрещённых зависимостей** — библиотек, которые никогда не должны попасть в проект, даже если кажется, что они «решают задачу быстрее».

Любая зависимость, не упомянутая в этом документе, может быть добавлена **только** через явное обновление документа в том же PR. Агент-реализатор обязан отказывать в добавлении неучтённых зависимостей и спрашивать разрешения.

---

## Среда разработки

| Инструмент | Версия | Зачем |
|------------|--------|-------|
| Windows 11 | актуальная | Основная ОС разработчика |
| Node.js | 20.x LTS | Runtime для всего toolchain |
| npm | 10.x (идёт с Node 20) | Менеджер пакетов |
| Git | 2.40+ | Контроль версий |
| GitHub CLI (`gh`) | актуальный | Создание PR из терминала |
| Claude Code | актуальный | Агент-реализатор |
| VS Code или Cursor | актуальный | Просмотр кода (опционально) |
| Expo Go (iOS) | актуальный | Тестирование на физическом iPhone |

**Принципиально не используем:** yarn, pnpm. Только npm как стандарт, идущий с Node. Это убирает зависимость от ещё одного tool-а и упрощает CI.

---

## Целевая платформа

| Платформа | Версия | Обоснование |
|-----------|--------|-------------|
| iOS / iPadOS | 16.0+ | Покрывает ~95% активных iPhone и iPad. iOS 15 не поддерживается осознанно (устаревший API set, малая база) |
| Поддержка устройств | iPhone + iPad | Universal app с адаптивной вёрсткой. Оптимизация под обе формфакторы (см. `06-ui-spec.md`) |

`iOS Deployment Target` в `app.json` устанавливается ровно `16.0`. Любой код, использующий API, недоступный в iOS 16, должен быть в условном блоке с проверкой версии. В `app.json` указывается `supportsTablet: true` и явный `userInterfaceStyle: "automatic"`. App Store Listing указывает iPhone и iPad как supported devices.

---

## Core стек

### Expo SDK

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `expo` | актуальная стабильная (на момент Phase B) | Платформа сборки и runtime. Содержит набор обвязок для нативных API |
| `expo-status-bar` | соответствующая SDK | Управление status bar в кросс-платформенном виде |
| `expo-splash-screen` | соответствующая SDK | Управление splash-экраном через native splash |
| `expo-localization` | соответствующая SDK | Получение языка и региона устройства |
| `expo-application` | соответствующая SDK | Доступ к версии приложения и build-номеру |
| `expo-updates` | соответствующая SDK | OTA-обновления через EAS Update (Phase 2+) |
| `expo-build-properties` | соответствующая SDK | Установка iOS deployment target и других native build-properties через Expo plugin (вместо невалидного `ios.deploymentTarget` поля в `app.json`). Auto-installable via `npx expo install`. |
| `expo-linear-gradient` | соответствующая SDK | Standard Expo SDK module for native gradient rendering; required by `06-ui-spec.md` § Экран 3 active-card visual treatment. Auto-installable via `npx expo install`. |
| `expo-web-browser` | соответствующая SDK | Standard Expo SDK module for in-app web links via `WebBrowser.openBrowserAsync`. Required by `06-ui-spec.md` § Экран 6 Privacy Policy / Terms of Use rows (consistent in-app UX, не уводит пользователя из приложения — закрыто как Open question #2 в той же спеке). Auto-installable via `npx expo install`. |
| `react-native-svg` | соответствующая Expo SDK (allowlisted via ADR-0007) | SVG primitives. Изначально предполагался для CG / Crosswind chart, но в `feat/crosswind-takeoff-rebrand` MVP-визуализация снята (single-card centred number). На момент MVP пакет **не установлен и не consumed** — ADR-0007 остаётся активным как зафиксированное решение «используем именно эту библиотеку, если потребуется визуализация в Phase 2+». Auto-installable via `npx expo install react-native-svg`. |

#### Auto-managed transitive dependencies

Эти пакеты не используются напрямую нашим кодом, но обязаны присутствовать в `package.json`, потому что от них зависят другие пакеты из спеки:

| Пакет | Кем требуется | Зачем оставлен |
|-------|---------------|----------------|
| `expo-font` | `@expo/vector-icons` | Загрузка иконочных шрифтов; auto-included в bundle |
| `expo-linking` | `expo-router` | Deep linking infrastructure для file-based routing |

Удалять их нельзя — `npm install` упадёт с peer-dep ошибкой. Версии управляются через `npx expo install` так же, как остальные SDK-managed пакеты.

#### Removed from default template

Дефолтный `create-expo-app` шаблон (`--template default`) тянет несколько пакетов, которые были **удалены при инициализации Phase B** как не входящие в наш scope:

- `react-dom`, `react-native-web` — нет web-таргета.
- `expo-haptics`, `expo-image`, `expo-symbols` — не нужны для MVP функциональности.
  (~~`expo-web-browser`~~ — изначально удалили, восстановили в Sprint 6 / PR
  `feat/settings-about` для Privacy Policy / Terms of Use rows в About-экране.)
- `@react-navigation/bottom-tabs`, `@react-navigation/elements` — мы используем минимальный expo-router stack без tabs UI; `@react-navigation/native` остаётся как peer-dep expo-router.

Если в будущем какой-то из этих пакетов понадобится — добавление через ADR с обоснованием и явным включением в этот документ.

**Почему Expo, а не голый React Native CLI:** EAS Build (облачная сборка iOS) работает только с Expo. Это критично, потому что мы на Windows и не имеем Mac. Чистый RN CLI требует macOS.

### React Native

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `react-native` | соответствующая Expo SDK | UI-фреймворк |
| `react` | соответствующая Expo SDK | Базовая библиотека |
| `react-dom` | НЕ ставится | Не используем web-таргет |

Версия React Native жёстко привязана к версии Expo SDK. Не пытаемся обновлять её отдельно.

### TypeScript

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `typescript` | 5.4.x или новее (последняя на момент Phase B) | Строгая типизация |
| `@types/react` | соответствующая React | Типы для React |
| `@types/jest` | актуальная | Типы для тестов |

`tsconfig.json` настройки (фиксируются в `08-quality-gates.md`):
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

---

## Навигация

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `expo-router` | соответствующая SDK | Файлово-системная навигация, рекомендуемая Expo |
| `react-native-screens` | соответствующая Expo SDK | Нативные навигационные screens |
| `react-native-safe-area-context` | соответствующая Expo SDK | Безопасные области экрана (notch, home indicator) |

**Решение по навигации (закрывает open question из 02-architecture.md):** используем **`expo-router`**. Причины:
- Современный стандарт Expo (с SDK 49+).
- Файлово-системная маршрутизация привычна по Next.js, легче для агента-реализатора.
- Глубокая интеграция с Expo (deep linking, type-safe routes).
- Меньше boilerplate, чем у классического `@react-navigation/native`.

Для нашего небольшого набора экранов (Splash → MainMenu → Crosswind / Settings / About) `expo-router` более чем достаточен.

---

## UI и стили

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `react-native` (built-in) | — | View, Text, Pressable, ScrollView и т.д. |
| `expo-system-ui` | соответствующая SDK | Управление цветом фона приложения |

**Стили:** только `StyleSheet.create()` из React Native. Никаких styled-components, Tamagui, NativeWind, Restyle и других библиотек стилей. Причины:
- Меньше зависимостей и потенциальных уязвимостей.
- Меньше runtime overhead.
- Стандарт RN, агент пишет уверенно без новых API.
- Design tokens из `design-system/tokens.ts` обеспечивают единообразие без stylesheet-фреймворка.

**Иконки:** используем `@expo/vector-icons` (идёт с Expo). Никаких отдельных icon-paks.

---

## Анимации

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `react-native-reanimated` | соответствующая Expo SDK | Производительные анимации (для Splash, transitions) |
| `react-native-gesture-handler` | соответствующая Expo SDK | Жесты (если понадобятся) |

В MVP анимации минимальны: появление splash, fade-переходы между экранами. Reanimated входит в Expo SDK как стандарт, не требует отдельной установки.

---

## Локализация

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `i18next` | 23.x или новее | Менеджер переводов |
| `react-i18next` | 14.x или новее | React-интеграция |

Файлы переводов лежат в `src/core/i18n/locales/{en,ru}.json`. Никаких других плагинов i18next (детектор, backend) не используем — язык определяется через `expo-localization` напрямую.

---

## State management

**Для MVP:** только нативные React-инструменты — `useState`, `useReducer`, `useContext`, custom hooks.

Никаких Redux, Zustand, Jotai, Valtio, MobX, Recoil. Обоснование: приложение не имеет глобального состояния сложнее, чем «текущая тема» и «принят ли disclaimer». Эти случаи отлично покрываются Context-ом.

**Триггер для пересмотра (см. 02-architecture.md):** если в Phase 2+ появится cross-feature состояние с реактивными подписками — рассмотреть `zustand` (минималистичный, без boilerplate). Решение фиксируется ADR-ом перед добавлением.

---

## Хранение данных

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `@react-native-async-storage/async-storage` | соответствующая Expo SDK | Несекретные настройки (язык, тема, флаг disclaimer) |
| `expo-secure-store` | соответствующая SDK | Любые потенциально чувствительные данные (резерв на будущее, в MVP пока не используется) |

В MVP реально используется только AsyncStorage для персистентных настроек. expo-secure-store добавляется в зависимости заранее, чтобы при появлении необходимости (например, OTA-config с подписью) не нужно было перестраивать пайплайн.

---

## Validation схем данных

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `zod` | 3.22.x или новее | Runtime-валидация JSON-схем bundled-данных и пользовательского ввода |

Все JSON-файлы (`src/data/crosswind/*.json`) парсятся через zod-схему при первом обращении. Если схема не сходится — приложение переходит в fail-safe режим (см. 05-crosswind-algorithm.md).

---

## Сборка и распространение

| Инструмент | Зачем |
|------------|-------|
| **EAS Build** | Облачная сборка iOS .ipa на Mac-серверах Expo |
| **EAS Submit** | Автоматическая отправка готового .ipa в App Store Connect |
| **EAS Update** | OTA-обновления (только в Phase 2+) |

Конфигурация в `eas.json` с тремя профилями:
- `development` — development build с поддержкой Expo Go.
- `preview` — internal distribution через TestFlight.
- `production` — финальный билд для App Store.

Платный план EAS — на старте бесплатный тариф (30 build/мес), при превышении переходим на $19/мес. Никакого vendor lock-in: при необходимости миграции — стандартный CI на cloud-Mac.

---

## Мониторинг и crash reporting

**Решение: только Apple-нативный crash reporting. Никаких сторонних SDK для мониторинга.**

Crash-репорты собираются напрямую iOS-системой и доступны в Apple App Store Connect → Analytics → Crashes. Никаких сторонних SDK не подключается. Это даёт максимально чистый профиль для App Store Review:

- Privacy Manifest содержит **только** обязательные required-reason API без сторонних SDK-деклараций.
- App Store Privacy Label остаётся **«No data collected»** — это абсолютная правда, никаких компромиссов.
- App Reviewer не имеет вопросов о сторонних SDK, потому что их нет.
- Соответствие принципу проекта «zero data collection by design» — буквальное.

**Что мы теряем:** менее подробные crash-репорты, отсутствие breadcrumbs, отсутствие automatic stacktrace symbolication через сторонний сервис. Это приемлемая цена за чистоту прохождения App Store Review и за полную правдивость Privacy Label.

**Чем компенсируется отсутствие Sentry:**
- В development-сборках логирование через `console` остаётся включённым — отлавливаем баги до релиза.
- Беттестирование с пилотами через TestFlight собирает crash-репорты для нас (TestFlight Crashes section).
- Apple предоставляет crash-репорты с символикацией через App Store Connect — они менее богатые, чем у Sentry, но достаточные для нахождения проблемы.
- Внутренний `core/logger` пишет в production-сборках в `os_log` (через native bridge) — не покидает устройство, но доступен через Mac Console при подключении iPad для диагностики.

Если в Phase 3+ возникнет реальная необходимость в более детальном мониторинге (например, при росте пользовательской базы), решение пересматривается через ADR с явным переоформлением Privacy Manifest и Privacy Label.

---

## Тестирование

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `jest` | 29.x или новее | Test runner |
| `jest-expo` | соответствующая Expo SDK | Конфигурация Jest для Expo |
| `@testing-library/react-native` | 12.x или новее | UI-тесты (рендер, взаимодействие) |
| `@testing-library/jest-native` | 5.x | Дополнительные matchers |
| `@types/jest` | актуальная | Типы |

Snapshot-тесты допускаются для статичных design-system компонентов и базовых layout-ов. Запрещены для экранов с динамическим состоянием — там пишутся явные assertion-тесты.

---

## Качество кода

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `eslint` | 8.x или новее | Линтер |
| `eslint-config-expo` | соответствующая Expo SDK | Базовый Expo preset |
| `@typescript-eslint/eslint-plugin` | актуальная | TypeScript-правила |
| `@typescript-eslint/parser` | актуальная | TypeScript parser для ESLint |
| `eslint-plugin-import` | актуальная | Импорты, `no-restricted-paths` |
| `eslint-plugin-react` | актуальная | React-правила |
| `eslint-plugin-react-native` | актуальная | RN-специфичные правила |
| `eslint-plugin-jsx-a11y` | актуальная | Accessibility-правила |
| `prettier` | 3.x или новее | Форматирование |
| `husky` | 9.x или новее | Git hooks |
| `lint-staged` | 15.x или новее | Lint только на изменённых файлах |

Подробные правила и конфигурации — в `08-quality-gates.md`.

---

## Утилиты

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `date-fns` | 3.x или новее | Форматирование дат (для версии данных в About-экране) |

**Принципиально не ставим:** `lodash`, `ramda`, `moment.js`, `axios`, и любые другие «универсальные библиотеки». Современные ES2022+ возможности (Array.at, Object.entries, structuredClone и т.д.) и Intl API закрывают потребности без них.

---

## Запрещённые зависимости

Эти библиотеки **никогда** не должны попадать в проект. Список явно зафиксирован, чтобы агент-реализатор отказывался их добавлять, а PR с ними блокировался на code review.

**Аналитика и трекеры:**
- `@react-native-firebase/analytics` и любой Firebase SDK
- `mixpanel-react-native`
- `@amplitude/react-native`
- `@segment/analytics-react-native`
- `react-native-mixpanel`
- `posthog-react-native`
- Любая библиотека, описание которой содержит слова: analytics, tracking, telemetry, attribution, event tracking.

**Реклама:**
- `react-native-google-mobile-ads` (AdMob)
- `react-native-fbads`
- `react-native-unity-ads`
- Любая библиотека, описание которой содержит слова: ads, advertising, monetization SDK.

**Push-нотификации (не нужны MVP):**
- `expo-notifications`
- `@react-native-firebase/messaging`
- `react-native-push-notification`

**Социальный логин (не нужен — нет аккаунтов):**
- `expo-auth-session`
- `react-native-google-signin`
- `expo-apple-authentication`
- `react-native-fbsdk-next`

**Тяжёлые универсальные библиотеки:**
- `lodash` — закрывается нативным JS.
- `moment` — устарела, использует много памяти. Заменяется date-fns.
- `axios` — нет сетевых запросов в приложении вообще.
- `redux`, `@reduxjs/toolkit`, `mobx`, `mobx-react` — overkill для MVP.

**Стилевые фреймворки:**
- `styled-components`
- `nativewind`
- `tamagui`
- `@shopify/restyle`

**Платежи (нет монетизации в MVP):**
- `react-native-iap`
- `expo-in-app-purchases`

**Webview / встроенный браузер (нет внешнего контента):**
- `react-native-webview`

Если в будущем какая-то из этих категорий станет нужна — добавление сопровождается отдельным ADR с обоснованием и переоценкой Privacy Manifest.

---

## Версионирование зависимостей

**Стратегия:** жёсткая фиксация версий + контролируемые обновления.

- В `package.json` все зависимости указываются **точными версиями**, без `^` и `~`. Это предотвращает «тихие» обновления при `npm install`.
- `package-lock.json` коммитится в репозиторий.
- На CI выполняется `npm ci` (а не `npm install`) — устанавливает точные версии из lock-файла.
- Обновления зависимостей происходят через GitHub Dependabot или ручной PR с описанием: что меняется, почему, какие тесты прогнаны.
- Major-обновления Expo SDK — отдельный PR с прохождением полной матрицы тестов.

Это правило фиксируется в `08-quality-gates.md` и поддерживается CI.

---

## `.npmrc` settings

В корне репозитория лежит файл `.npmrc`, который применяется ко всем `npm install` командам — локально и в CI:

```ini
legacy-peer-deps=true
save-exact=true
```

**`legacy-peer-deps=true`** — необходим, потому что `expo-router` имеет peer-dep на `react-dom@19` (для web-таргета), но мы **не устанавливаем `react-dom`** (см. секцию «React Native» выше). Без этого флага `npm install` падает с peer-conflict. Не влияет на корректность установленных пакетов — только подавляет строгую проверку peer-deps, которая в нашем случае ложно-позитивна.

**`save-exact=true`** — enforce-ит правило «точные версии без `^` и `~`» (см. секцию «Версионирование зависимостей»). Любой `npm install <pkg>` автоматически записывает exact-версию в `package.json`, даже без явного флага `--save-exact`.

Файл коммитится в репозиторий и применяется к каждому `npm ci` на CI.

---

## Конкретные версии (snapshot на момент Phase B)

Точные версии будут указаны в `package.json` при инициализации проекта (Phase B). На момент написания спеки актуальные значения:

- Node.js: 20 LTS (последний минор)
- Expo SDK: 51 или новее (на момент инициализации)
- React Native: версия, идущая с выбранной Expo SDK
- TypeScript: 5.4 или новее
- Jest: 29.x

Финальные версии фиксируются и закрепляются в первом коммите Phase B. После фиксации обновления — только через explicit PR.

---

## Open questions

(currently empty — `react-native-svg` decision moved to Closed questions)

## Closed questions

- ~~Какую конкретную версию Expo SDK взять на момент Phase B?~~ → **Resolved (Phase B):** Expo SDK 54 (последняя стабильная на момент инициализации). Все версии SDK-managed пакетов закреплены в `package.json` точными значениями через `npx expo install`.
- ~~Нужен ли `react-native-svg` для будущих визуализаций (графики crosswind)?~~ → **Resolved (pre-Polish-3, 2026-05-04):** да, через ADR-0007. Pakage устанавливается в Polish-3 при имплементации CG / Crosswind chart. Allowlist обновлён.

---

## Exit-критерии этого документа

- [x] Разработчик согласен с выбором Expo SDK и `expo-router` как навигации.
- [x] Список запрещённых зависимостей не содержит ничего, что разработчик считает приемлемым.
- [x] Решение по мониторингу — только Apple-нативный crash reporting, без сторонних SDK.
- [x] Push-уведомления и любые notifications-SDK исключены из MVP.
- [x] Стратегия фиксации версий (точные версии без `^`) одобрена.
- [x] Open questions либо закрыты, либо явно отложены на Phase B.
