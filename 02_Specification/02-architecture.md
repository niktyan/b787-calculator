# 02 · Architecture

## Назначение документа

Этот документ описывает архитектурные принципы проекта **B787 Calculator**, правила зависимостей между частями кода, структуру репозитория и стратегию эволюции. Любое решение в коде, противоречащее этому документу, является ошибкой и должно быть отвергнуто на code review (или его автоматических аналогах).

Архитектура спроектирована с двумя приоритетами: **долгосрочная чистота при добавлении новых модулей** и **прагматизм для MVP** (никакого over-engineering ради «правильности»).

---

## Принципы Clean Architecture для этого проекта

Мы применяем Clean Architecture **на уровне границ между модулями**, а не внутри одного модуля. Это сознательный компромисс: классическая Clean Architecture с пятью слоями внутри каждой фичи приводит к избыточному boilerplate-коду, который в нашем масштабе (один модуль в MVP, простые расчёты) вреден.

**Что соблюдается строго:**

- **Чёткое разделение между модулями.** Каждый функциональный модуль (`core`, `design-system`, `features/crosswind`, в будущем `features/weight-balance` и др.) имеет публичный API и приватные внутренности.
- **Правило зависимостей direction inward.** Feature-модули зависят от `core` и `design-system`, но НЕ зависят друг от друга. `core` не знает ничего о features.
- **Слои внутри feature-модуля.** Внутри одной фичи существуют три условных слоя: `presentation` (UI и view-models), `domain` (бизнес-логика, чистые функции) и `data` (источники данных, репозитории). Domain не знает о presentation и data; data знает о domain.
- **Изоляция данных от логики.** Опорные значения (таблицы лимитов) хранятся как версионированные JSON-ресурсы в data-слое. Domain работает только с in-memory моделями.

**Что не делаем намеренно (избегаем over-engineering):**

- Не создаём отдельный «Use Case»-класс для каждой простой операции, если это просто вызов одной функции. Use Case появляется, когда логика реально включает координацию нескольких источников данных или сложные правила.
- Не пишем DTO-маппинг между data и domain слоями, если структура совпадает. JSON парсится и валидируется один раз, дальше работаем с domain-моделями.
- Не делаем DI-контейнер с поддержкой жизненных циклов. Используем простой composition root в `App.tsx` и React Context там, где нужно прокинуть зависимость.
- Не добавляем абстракции «на всякий случай». Каждая абстракция оправдывается тем, что она УЖЕ нужна (а не «может пригодиться когда-нибудь»).

---

## Иерархия модулей и правила зависимостей

Модули организованы в три уровня, и зависимости разрешены только сверху вниз.

```
┌──────────────────────────────────────────────────────────┐
│  App Shell  (src/app/)                                   │
│  Composition root, навигация, провайдеры контекстов      │
└──────────────┬───────────────────────────────────────────┘
               │
       ┌───────┴───────────────────────────────────┐
       │                                           │
       ▼                                           ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  Features                   │    │  Future Features            │
│  src/features/crosswind/    │    │  (Phase 2+, не в MVP)       │
│                             │    │                             │
│  ┌───────────────────────┐  │    │                             │
│  │ presentation          │  │    │                             │
│  │ (screens, view-models)│  │    │                             │
│  ├───────────────────────┤  │    │                             │
│  │ domain                │  │    │                             │
│  │ (business logic)      │  │    │                             │
│  ├───────────────────────┤  │    │                             │
│  │ data                  │  │    │                             │
│  │ (repos, JSON loading) │  │    │                             │
│  └───────────────────────┘  │    │                             │
└──────────────┬──────────────┘    └─────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  Shared layer                                            │
│  src/core/         — DI, theming, i18n, disclaimer state │
│  src/design-system/ — UI components, tokens              │
└──────────────────────────────────────────────────────────┘
```

**Жёсткие правила зависимостей:**

1. `app/` зависит от `features/*`, `core/`, `design-system/`. Никто не зависит от `app/`.
2. `features/X/` зависит от `core/` и `design-system/`.
3. `features/X/` **никогда** не импортирует из `features/Y/`. Если двум фичам нужен общий код — он выносится в `core/` или становится отдельным utility-модулем.
4. `core/` не зависит ни от чего из `src/`, кроме вспомогательных утилит того же `core/`. `core/` НЕ знает о features.
5. `design-system/` зависит только от React Native примитивов и `core/theming`. НЕ знает о features или domain-логике.

Эти правила обеспечиваются **технически**, не «обещаниями»:

- `eslint-plugin-import` с правилом `no-restricted-paths` запрещает запретные импорты. PR с нарушением правил не пройдёт CI.
- В каждом feature-модуле есть `index.ts` (barrel-файл), экспортирующий **только** публичный API. Импорт из внутренних путей фичи извне запрещён правилом lint.

---

## Структура папок репозитория

```
b787-calculator/
├── .github/
│   └── workflows/             — GitHub Actions CI/CD
├── 02_Specification/          — спека (этот документ и соседи)
├── 03_Mockups/                — HTML-мокапы UI
├── ADR/                       — Architecture Decision Records (внутри 02_Specification/)
├── assets/                    — иконки, splash, шрифты
│   ├── icons/
│   ├── splash/
│   └── fonts/
├── src/
│   ├── app/                   — composition root + expo-router routes
│   │   ├── _layout.tsx        — root layout с провайдерами (theme, i18n, disclaimer)
│   │   ├── splash.tsx
│   │   ├── disclaimer.tsx
│   │   ├── (main)/            — группа главных экранов
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx      — Main Menu
│   │   │   ├── crosswind.tsx
│   │   │   ├── settings.tsx
│   │   │   └── about.tsx
│   │   └── error.tsx          — fail-safe экран
│   ├── core/                  — общие утилиты и сервисы
│   │   ├── i18n/              — i18next config + locale files
│   │   ├── theming/           — design tokens, тема, dark/light
│   │   ├── storage/           — AsyncStorage / expo-secure-store wrapper
│   │   ├── disclaimer/        — disclaimer state и логика
│   │   ├── feature-flags/     — простой feature-flag сервис
│   │   ├── logger/            — логирование (no-op в production)
│   │   └── index.ts           — barrel: публичный API core
│   ├── design-system/         — переиспользуемые UI-компоненты
│   │   ├── components/        — Card, Button, Input, ResultPanel и т.д.
│   │   ├── tokens.ts          — цвета, типографика, размеры
│   │   └── index.ts
│   ├── features/
│   │   └── crosswind/
│   │       ├── presentation/  — screens, view-models
│   │       ├── domain/        — entities, calculation logic, validators
│   │       ├── data/          — repository, JSON loading, schemas
│   │       ├── __tests__/     — unit и acceptance тесты
│   │       └── index.ts       — публичный API модуля
│   └── data/
│       └── crosswind/         — bundled JSON-файлы с опорными значениями
│           └── b787-8-dry.json
├── __tests__/                 — высокоуровневые тесты (smoke, integration)
├── app.json                   — Expo config
├── app.config.ts              — Expo dynamic config (для env-vars)
├── babel.config.js
├── eas.json                   — EAS Build/Submit профили
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js              — flat config (см. ADR-0005)
├── .prettierrc.js
├── .prettierignore
├── .gitattributes                — LF для shell-скриптов на Windows
├── .npmrc                        — legacy-peer-deps=true, save-exact=true
├── CLAUDE.md                  — инструкции для агента-реализатора
├── AGENTS.md                  — расширенные правила для AI-агентов
├── PRIVACY_POLICY.md          — Privacy Policy (хостится на GitHub Pages)
├── TERMS_OF_USE.md
└── README.md                  — обзор репозитория
```

---

## Внутренняя структура модуля feature

Каждый feature-модуль использует одинаковую структуру. Это даёт предсказуемость и упрощает добавление новых модулей.

```
features/crosswind/
├── presentation/
│   ├── CrosswindScreen.tsx         — главный экран модуля
│   ├── components/
│   │   ├── InputForm.tsx
│   │   └── ResultPanel.tsx
│   └── useCrosswindCalculator.ts   — view-model хук
├── domain/
│   ├── types.ts                    — типы и интерфейсы (Aircraft, WeightInTons, CGPercentMAC, RunwayCondition RWYCC scale, etc)
│   ├── calculator.ts               — чистая функция расчёта
│   ├── validators.ts               — валидация входов
│   └── breakpoints.ts              — типы для опорных значений
├── data/
│   ├── crosswindRepository.ts      — обёртка над JSON-ресурсом
│   └── schema.ts                   — zod-схема для валидации JSON
├── __tests__/
│   ├── calculator.test.ts          — unit тесты алгоритма
│   ├── validators.test.ts
│   └── acceptance.test.ts          — 30+ тест-кейсов из спеки
└── index.ts                        — публичный API модуля
```

**Правила внутри feature-модуля:**

- `presentation` импортирует из `domain` и через `domain` — из `data`. Напрямую из `data` — не импортирует.
- `domain` — это чистый TypeScript без зависимостей от React Native или Expo. Это позволяет писать unit-тесты без UI-фреймворка.
- `data` импортирует из `domain` (для возврата domain-моделей). Зависит от bundled-ресурсов через `require('./schema.json')`.
- `index.ts` экспортирует только то, что нужно `app/` и другим внешним потребителям. Обычно это: главный screen-компонент, типы публичного API, и (опционально) фабрики/провайдеры.

---

## Публичные API модулей

Каждый модуль документирует свой публичный API в файле `02_Specification/module-contracts/<module>.md`. Это **контракт**, не подлежащий незаметному изменению. Любое изменение публичного API модуля требует обновления соответствующего контракт-документа в том же PR.

Что описывает контракт-документ:
- Имя модуля и его ответственность.
- Что экспортируется наружу (имена и сигнатуры).
- От чего зависит модуль (какие модули импортирует).
- Какие side-effects возможны (storage, navigation и т.д.).
- Как тестировать (примеры).

Модули, для которых пишется контракт в Phase A:
- `core.md`
- `design-system.md`
- `crosswind.md`

Для каждого нового feature-модуля в будущем (Phase 2+) аналогичный контракт-документ создаётся **до** написания кода.

---

## Композиция: как модули соединяются в App (expo-router)

Точкой композиции является **`src/app/_layout.tsx`** — root layout файл expo-router, единственное место, где регистрируются все провайдеры. Сам routing-список экранов получается автоматически из файловой структуры `src/app/` (см. `06-ui-spec.md` секция «Навигация — общая схема»).

**Принципы композиции:**

- **Provider-stack в `_layout.tsx`.** Все Context-провайдеры (Theme, i18n, disclaimer state, feature-flags, error boundary) собраны в одном месте, иерархически вложены. Внутри них — `<Stack />` (или `<Slot />`) от expo-router, который рендерит дочерние routes.
- **File-system routing.** Каждый `.tsx`-файл в `src/app/` (кроме `_layout.tsx`) — отдельный route. Никакого ручного списка экранов; routing вытекает из структуры папок.
- **Никакой бизнес-логики в `_layout.tsx`.** Только композиция и навигация.
- **Feature screens — re-exports из feature-модулей.** Например, `src/app/(main)/crosswind.tsx` это файл из 1-2 строк, который делает `export { CrosswindScreen as default } from '@features/crosswind';`. Реальная реализация — в feature-модуле, а route-файл это «тонкая прослойка», подключающая модуль к URL.
- **Provider-инициализация может быть асинхронной.** I18n загружается, theme определяется по системе, disclaimer-флаг читается из storage. Splash-screen остаётся видимым, пока все провайдеры готовы (через expo-splash-screen API).

**Псевдокод `_layout.tsx`** (для понимания, не финальный код):

```typescript
export default function RootLayout(): JSX.Element {
  // Loaders (await before rendering Stack)
  const i18nReady = useI18nInitialization();
  const fontsLoaded = useFonts({...});
  const disclaimerStatus = useDisclaimerStatus();

  if (!i18nReady || !fontsLoaded) return null; // splash остаётся

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <SafeAreaProvider>
            <StatusBar />
            <Stack screenOptions={{ headerShown: false }}>
              {/* Routes автоматически из src/app/ */}
            </Stack>
          </SafeAreaProvider>
        </FeatureFlagsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

---

## Domain Purity Rules

Domain-слой каждого feature-модуля (`src/features/<feature>/domain/`) должен оставаться **полностью platform-agnostic**. Это позволяет тестировать его в Node-окружении без mock-ов RN/Expo, а также потенциально портировать на web/Android/CLI без переписывания.

**Что РАЗРЕШЕНО импортировать в domain:**
- Стандартные TypeScript / ECMAScript встроенные (`Map`, `Set`, `Date`, `JSON`, `Math`, `Intl`).
- `zod` (только типы и схемы, без I/O).
- Другие domain-файлы того же модуля (через relative imports).
- `@core/result`, `@core/types`, `@core/logger` — только тех частей `core`, которые сами platform-agnostic (см. матрицу ниже).

**Что ЗАПРЕЩЕНО импортировать в domain:**
- `react`, `react-native`, любой `react-native/*`.
- `expo`, `expo-*` (любые Expo пакеты).
- `@react-navigation/*`, `expo-router`.
- React-хуки или React Context напрямую.
- `AsyncStorage`, `expo-secure-store` (это работа data-слоя через Repository абстракцию).
- Любой код, требующий runtime browser/RN environment.

**Технически:** ESLint правило `import/no-restricted-paths` блокирует импорты из `react-native` и `expo*` в файлах под путём `src/features/*/domain/`. Любой PR с нарушением падает в CI.

**Тест на «domain-pure»:** если ты можешь импортировать domain-файл в чистом Node-скрипте без полифиллов и моков и вызвать его функции, domain-purity соблюдена. Если требуется `jest-expo` preset для запуска domain-теста — это нарушение.

---

## Error Propagation Rules

Когда и как ошибки переходят между слоями — однозначные правила. Это исключает класс багов «один слой бросает, другой ожидает Result, что-то теряется».

**Правило 1 · Domain operations возвращают `Result<T, E>`, не выбрасывают.**

Любая publicly-exported domain функция, которая может «не получиться», возвращает `Result.ok(value)` или `Result.err(error)`. Никаких `throw` для ожидаемых ошибок. Исключение: невозможные ситуации (programming errors) могут использовать `throw new Error('unreachable')` — это не часть бизнес-логики.

**Правило 2 · Data layer тоже возвращает `Result`, не выбрасывает.**

Repository.load() возвращает `Result<Data, RepositoryError>`. Не бросает ошибку парсинга zod, не бросает «file not found» — оборачивает в Result.

**Правило 3 · Presentation layer обрабатывает Result через явное pattern matching.**

В `useCrosswindCalculator` хуке, при получении `Result.err`, view-model переводит UI в error-state. Никогда не делает `result.unwrap()` без проверки `result.ok`.

**Правило 4 · Promise rejection allowed только в I/O coatings.**

`async` функции в data-слое (например, `AsyncStorage.getItem` обёртки) могут возвращать rejected Promise. Repository ловит promise rejection и преобразует в `Result.err`. Domain никогда не работает с raw Promises напрямую — только с Result.

**Правило 5 · ErrorBoundary в `_layout.tsx` ловит unexpected throws.**

Если что-то всё-таки throws в presentation/data (баг), глобальный ErrorBoundary показывает fail-safe-экран вместо краша приложения. Это последняя линия обороны, не рутинный путь обработки.

**Шпаргалка по слоям:**

| Слой | Возвращает при ошибке | Throws? |
|------|------------------------|---------|
| Domain | `Result.err(error)` | Никогда (кроме unreachable) |
| Data | `Result.err(error)` | Никогда |
| Presentation | UI-состояние error | Никогда (кроме unreachable) |
| App Shell (`_layout.tsx`) | ErrorBoundary fallback | — (ловит чужие throws) |

---

## Layer Responsibility Matrix

Матрица того, что может делать каждый слой. При сомнениях «куда положить эту функцию» — смотри сюда.

| Что делать | App Shell | Presentation | Domain | Data | Core | Design System |
|------------|-----------|--------------|--------|------|------|---------------|
| Регистрировать routes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Composition Provider-stack | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Импорт `react`, `react-native` | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ✅ |
| Использовать Hooks | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Бизнес-расчёт (чистые функции) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Валидация input через Value Objects | ❌ | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| Чтение/запись JSON/AsyncStorage | ❌ | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| Локализация строк | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Стилизация / темы | ❌ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Внутрисессионный state (useState) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Persistent state (через storage) | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Public API через barrel | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

Легенда: ✅ да · ❌ нет (запрещено) · ⚠️ только в специфичных случаях с обоснованием.

«⚠️» для Data импорта `react-native` — только в Repository, который реально использует AsyncStorage (RN-специфичный). Сама модель данных Repository остаётся pure.

«⚠️» для Core импорта `react-native` — только submodules core, которые exposes hook-ы (theming, disclaimer, feature-flags). Submodules вроде `core/result`, `core/logger` — pure TS.

«⚠️» для Presentation валидации — только UI-валидация (например, число ли это вообще). Domain-валидация (envelope, бизнес-правила) делается в domain.

---

## Module Communication Patterns

Какие способы коммуникации между модулями разрешены, какие нет.

**Разрешённые паттерны:**

1. **Через barrel-export типов и функций.** Module A экспортирует функцию, Module B импортирует через `@core/...` или `@features/.../`. Стандартный путь.

2. **Через React Context, провайдер которого живёт в App Shell.** `ThemeProvider` в `_layout.tsx` → `useTheme()` хук в любом модуле, который зависит от core.

3. **Через bundled JSON-конфиг.** App Shell читает coming-soon-modules.json, передаёт через Context или prop в Main Menu screen. Никакой direct cross-module call.

4. **Через прямой вызов экспортированной функции.** `calculateCrosswindLimit(input, data)` — pure function, может быть вызвана из любого места, разрешённого правилами зависимостей.

**Запрещённые паттерны:**

1. **Module A импортирует приватные внутренности Module B.** Например, `import calculateInternal from '@features/crosswind/domain/calculator'` минуя barrel. ESLint блокирует.

2. **Глобальные mutable singletons.** Не делаем `globalState`, `eventBus`, `appStore` без явного ADR. Состояние управляется через Context или local hook state.

3. **Cross-feature direct import.** `features/crosswind` НЕ может импортировать `features/weight-balance`. Если общий код нужен — выносится в `core/`.

4. **Пересылка событий через DOM-events / RN-event emitters.** Запрещено как механизм coupling между модулями. Используется только через явные API.

---

## Стратегия эволюции

### Добавление нового feature-модуля (recipe)

Этот рецепт повторяется для каждого нового модуля в Phase 2+ и далее. Шаги обязательны и в указанном порядке.

1. **Создать contract-документ** `02_Specification/module-contracts/<new-module>.md` со структурой по образцу `crosswind.md`: ответственность, submodules, public API, dependencies, side-effects, тестирование, открытые вопросы. Этот документ пишется **до** написания кода — он становится target для имплементации.

2. **Создать ADR при необходимости.** Если новый модуль требует архитектурных решений, выходящих за рамки 02-architecture.md (например, новый паттерн интеграции, новая категория зависимостей), — оформить через ADR в `02_Specification/ADR/`.

3. **Скаффолд папок** под `src/features/<new-module>/` по тому же шаблону:
   ```
   src/features/<new-module>/
   ├── presentation/
   ├── domain/
   ├── data/
   ├── __tests__/
   └── index.ts            ← barrel-экспорт публичного API
   ```

4. **Реализовать слои в порядке domain → data → presentation** (TDD-friendly):
   - Domain первым: types, validators, calculator/strategies — pure TS с тестами.
   - Data вторым: schemas, repository, JSON-ресурсы — с тестами на корректность парсинга и fail-safe.
   - Presentation последним: screens, view-models, components — UI поверх готового domain.

5. **Зарегистрировать route в expo-router**, создав соответствующий файл в `src/app/`. Например, для `weight-balance` модуля:
   ```typescript
   // src/app/(main)/weight-balance.tsx
   export { WeightBalanceScreen as default } from '@features/weight-balance';
   ```
   Никакой ручной регистрации в `navigation.tsx` — expo-router автоматически подхватывает файл.

6. **Обновить `src/core/coming-soon-modules/data.json`** — удалить запись о новом модуле из coming-soon (он теперь активен) или, если был placeholder в Main Menu, обновить грид активных карточек.

7. **Обновить `comingSoonModules` placeholder** в Main Menu (`src/app/(main)/index.tsx`) — добавить активную карточку, которая рендерит link на новый route.

8. **Расширить тесты:** unit-тесты модуля + интеграционный snapshot Main Menu с новой картой + acceptance-test критичной функциональности.

9. **Обновить `jest.config.js`** при необходимости (если новый модуль требует нестандартного coverage threshold или transform pattern).

10. **Создать PR** через `gh pr create`, в описании указать: ссылку на module-contract, все ADR-ы (если создавались), Manual testing instructions.

Этот recipe гарантирует, что добавление модуля не нарушает архитектурные правила и спека всегда отражает реальное состояние проекта.

### Обновление bundled JSON-данных

Опорные значения (например, таблица crosswind для `b787-8-dry.json`) версионируются полем `dataVersion`. Любое изменение значений → инкремент версии → новый PR с обновлённым JSON. Код не трогается. Если приложение видит, что `dataVersion` в bundled-данных новее, чем последняя «принятая пользователем» версия — показывает короткое уведомление «Reference data updated to FCOM rev X». Это даёт прозрачность.

### Распространение обновлений данных

Два механизма:
- **App Store update** — стандартный путь, при увеличении кода или major-данных. Пользователь обновляется через App Store автоматически.
- **EAS Update (OTA)** — для мелких правок данных без изменений кода. Не используется в MVP, активируется в Phase 2.

### Версионирование самого приложения

Semantic versioning: `MAJOR.MINOR.PATCH`.
- MAJOR — breaking changes для пользователя (редко).
- MINOR — новый модуль или существенная фича.
- PATCH — баг-фиксы, обновления опорных данных.

`expo-updates` отвечает за runtime-версионирование, App Store Connect отслеживает публичные релизы.

---

## Когда эскалировать архитектуру

Текущая архитектура осознанно прагматична: чистые границы между модулями, простая структура внутри. Это работает для приложения нашего масштаба, но при росте сложности часть упрощений может стать узким местом. Поэтому мы заранее фиксируем **триггеры эскалации** — конкретные сигналы, при появлении которых архитектурная сложность увеличивается. Эти триггеры частично обеспечиваются автоматически (ESLint, TypeScript), частично являются правилами для human review.

**Триггер 1 · Файл domain-логики превышает 200 строк.**
Действие: разбить на несколько файлов по принципу единственной ответственности. Если разбивка приводит к появлению координирующего кода — этот код обязан стать Use Case-классом с явным интерфейсом и тестами.

**Триггер 2 · Feature-модуль координирует ≥2 источников данных.**
Действие: ввести явный Use Case-класс, инжектируемый в presentation через интерфейс. Repository-абстракция в domain становится обязательной. Каждый источник — отдельная реализация Repository-интерфейса.

**Триггер 3 · В presentation-слое обнаруживается бизнес-логика.**
Признаки: условные ветвления по domain-правилам в `useEffect`, расчёты в JSX, валидация прямо в onChange-хендлере. Действие: вынести в domain как чистую функцию, в presentation оставить только вызов и отображение результата. Это правило без исключений.

**Триггер 4 · Cyclomatic complexity функции превышает 10.**
Проверяется автоматически через ESLint правило `complexity`. Действие: рефакторинг обязателен, merge заблокирован до его выполнения.

**Триггер 5 · Один и тот же data-источник или утилита нужны в двух фичах.**
Действие: вынести в `core/`. Под запретом передавать общую логику через копирование или через features-to-features импорт (последнее технически невозможно благодаря `no-restricted-paths`).

**Триггер 6 · Структура data и domain расходятся.**
Например, JSON-схема bundled-файла начинает отличаться от внутренней domain-модели (новые поля, другие имена, вложенность). Действие: появляется явный mapper между DTO и domain-моделью в data-слое. До расхождения структур мы работаем напрямую с одной типизированной моделью — это не «грязно», это намеренная экономия.

**Триггер 7 · Один screen рендерит логику из двух разных feature-модулей.**
Это сигнал, что появилась composition-логика выше уровня одной фичи. Действие: новый «orchestration»-модуль в `app/` уровня, который импортирует из обеих фич и комбинирует. Прямые feature → feature импорты остаются запрещены.

**Триггер 8 · Новый требование к persistance (например, синхронизация настроек через iCloud).**
Действие: появляется отдельный пакет `core/sync` с Repository-интерфейсами для каждого синхронизируемого ресурса. AsyncStorage становится одной из реализаций.

**Триггер 9 · Тесты domain-логики начинают зависеть от моков React Native.**
Это нарушение принципа «domain — чистый TypeScript». Действие: domain-код, импортирующий что-то из RN, должен быть либо переработан, либо вынесен в presentation/data.

**Триггер 10 · Появляется потребность в feature-flags на уровне runtime, а не сборки.**
Например, A/B-тесты или EAS Update с включением фичей по сегменту пользователей. Действие: расширение `core/feature-flags` от простого in-memory store до настоящей системы с источником конфигурации (на этом этапе допустимо завести отдельный конфиг-файл с версионированием).

Эти триггеры **не нужно держать в голове**. Большинство из них либо ловятся ESLint-ом и TypeScript-ом, либо проверяются на code review (PR-template содержит чек-лист, в котором эти пункты есть). Триггеры существуют для того, чтобы архитектура естественно усложнялась только тогда, когда сложность реально возникла, а не «на всякий случай».

---

## Архитектурные ограничения

Эти ограничения автоматически проверяются в CI и не позволяют им быть нарушенными незаметно.

- **`no-restricted-paths`** в ESLint запрещает feature → feature импорты, presentation → data напрямую, и доступ во внутренние пути модуля извне.
- **`tsconfig` paths** настроены так, что внутри feature-модуля используются короткие алиасы (`@/domain`, `@/data`), а извне модуля — только через barrel `@features/crosswind`.
- **Type coverage** проверяется в CI: `noUncheckedIndexedAccess`, `strictNullChecks`, no-implicit-any. Любая «дыра» в типизации блокирует merge.
- **JSON schema validation** через zod при загрузке bundled-данных. Если JSON структурно неверен — приложение падает в fail-safe режим, а не показывает мусор.
- **Запрет на прямой импорт из `react-native`** в domain-слое (тоже через ESLint). Domain должен быть чистым TS.

---

## Anti-patterns: чего нельзя делать

**Архитектурные anti-patterns, которые код не должен содержать никогда:**

- **God-объекты** или «утилитные» классы с десятками функций. Каждая функция — отдельный файл или маленькая когезивная группа.
- **Циклические зависимости** между модулями или внутри модуля.
- **Мутация props** внутри React-компонентов.
- **`any` без явного `// eslint-disable-next-line`** с обоснованием в комментарии.
- **`useEffect` со сложной логикой**, которая должна быть в domain. UI-слой не должен содержать бизнес-логики.
- **Хардкод строк** в UI — все строки через i18n.
- **Хардкод цветов или размеров** — всё через design-tokens.
- **Глобальные mutable singletons** для состояния. Состояние — через React Context или локальный hook.
- **`console.log` в production-сборке** — должен быть выпилен препроцессором или попадать в подавляющий logger.
- **TODO без ссылки на Issue**. Если TODO не привязан к открытому Issue в репо — он будет удалён на CI.

---

## Open questions

1. Использовать ли zustand / valtio / просто React Context для state management? Для MVP в `03-tech-stack.md` зафиксирован Context. Если в Phase 2+ появится сложное cross-feature состояние — пересматривается через ADR.
2. Стратегия для testing screens на разных размерах iPad. Использовать ли `@testing-library/react-native` для viewport-тестов или ограничиться snapshot-тестами на одном размере? Решение в `08-quality-gates.md` — используем @testing-library/react-native + snapshot tests на baseline-размерах.

**Закрытые вопросы:**
- Навигация: `expo-router` (см. `03-tech-stack.md`).

---

## Exit-критерии этого документа

Документ считается «принятым», когда:

- [ ] Разработчик прочитал и согласен со всеми правилами зависимостей.
- [ ] Структура папок одобрена (или обсуждена и доработана).
- [ ] Список Anti-patterns не содержит ничего, что разработчик считает приемлемым.
- [ ] Стратегия эволюции (добавление модулей, обновление данных) понятна и согласована.
- [ ] Все open questions либо закрыты прямо здесь, либо явно делегированы в другие документы (с указанием в какие).
