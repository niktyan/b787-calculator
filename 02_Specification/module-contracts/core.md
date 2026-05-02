# Module Contract · Core

**Path:** `src/core/`
**Status:** Active in MVP
**Owner module:** none (foundation module)

## Ответственность

Core — это базовый модуль приложения, предоставляющий общие сервисы и утилиты, которые используются и App Shell-ом, и feature-модулями. Core НЕ содержит бизнес-логики конкретных функций приложения (это работа feature-модулей). Он предоставляет инфраструктуру.

## Layer classification submodules

Не все submodules core имеют одинаковую platform-зависимость. Это важно для тестируемости и потенциальной портабельности (см. `02-architecture.md` секция «Domain Purity Rules»).

| Submodule | Purity | Допустимые импорты |
|-----------|--------|---------------------|
| `core/result` | 🟢 **Pure TS** | Только TypeScript встроенные. Никаких RN/React/Expo. |
| `core/logger` | 🟢 **Pure TS** | Только TypeScript. `__DEV__` гейт через global type declaration, не через RN-импорт. |
| `core/i18n/types` | 🟢 **Pure TS** | Только TypeScript. Используется feature-модулями для translation keys. |
| `core/i18n/config` | 🟡 **Library-bound** | i18next, react-i18next (полу-platform-agnostic). |
| `core/theming/types` | 🟢 **Pure TS** | Только TypeScript. ColorTokens, TypographyTokens, Theme. |
| `core/theming/ThemeProvider` | 🔵 **React** | React Context + useColorScheme из RN. |
| `core/storage/keys` | 🟢 **Pure TS** | Список enum-ключей. |
| `core/storage/schemas` | 🟢 **Pure TS** | Только zod. |
| `core/storage/storage` | 🔴 **Platform** | AsyncStorage (требует RN runtime). |
| `core/disclaimer/state` | 🟡 **Library-bound** | Использует storage submodule. |
| `core/disclaimer/useDisclaimerStatus` | 🔵 **React** | React-хук. |
| `core/feature-flags/flags` | 🟢 **Pure TS** | In-memory store без React. |
| `core/feature-flags/useFeatureFlag` | 🔵 **React** | React-хук поверх flags. |
| `core/coming-soon-modules/types` | 🟢 **Pure TS** | Типы. |
| `core/coming-soon-modules/data.json` | 🟢 **Data** | Bundled JSON. |
| `core/coming-soon-modules/useComingSoonModules` | 🔵 **React** | React-хук, читающий JSON. |

**Правило:** при имплементации Sprint 1 — submodules с пометкой 🟢 **Pure TS** не должны иметь импортов из `react`, `react-native`, `expo*`. Если случайно импортировал — это ошибка, ESLint должен поймать (через no-restricted-paths правила).

**Тест на purity:** для каждого 🟢 submodule unit-тесты должны запускаться в чистом Jest без `jest-expo` preset (или с минимальными моками). Если для теста требуется RN-моки — submodule неправильно классифицирован.

## Submodules и их функции

### `core/i18n/`

Internationalization с использованием i18next + react-i18next.

**Ответственность:**
- Инициализация i18next с EN и RU локалями при старте приложения.
- Определение языка устройства через `expo-localization`.
- Применение пользовательского override языка из storage.
- Предоставление хука `useTranslation()` для компонентов.

**Файлы:**
- `i18n/config.ts` — настройка i18next instance.
- `i18n/locales/en.json` — английские строки.
- `i18n/locales/ru.json` — русские строки.
- `i18n/types.ts` — TypeScript-типы для translation keys.

### `core/theming/`

Управление темой (Auto / Light / Dark).

**Ответственность:**
- Хранение текущей темы.
- React Context для предоставления темы компонентам.
- Хук `useTheme()` возвращающий текущие токены.
- Подписка на системное изменение темы (для режима Auto).

**Файлы:**
- `theming/ThemeProvider.tsx` — Context-провайдер.
- `theming/useTheme.ts` — хук.
- `theming/types.ts` — типы для тем.

### `core/storage/`

Type-safe wrapper над AsyncStorage.

**Ответственность:**
- Чтение и запись пользовательских настроек.
- Schema-validation через zod при чтении (защита от corrupted storage).
- Debounced write (300 ms) для частых изменений.
- Известные ключи (`disclaimerAccepted`, `language`, `theme`, `showDataSourceOnResult`).

**Файлы:**
- `storage/storage.ts` — основной API.
- `storage/keys.ts` — список известных ключей.
- `storage/schemas.ts` — zod-схемы для значений.

### `core/disclaimer/`

State и логика advisory-дисклеймера.

**Ответственность:**
- Определение, видел ли пользователь disclaimer (через storage).
- Метод `acceptDisclaimer()` для записи флага.
- React-хук `useDisclaimerStatus()`.

**Файлы:**
- `disclaimer/state.ts` — state-management.
- `disclaimer/useDisclaimerStatus.ts` — хук.

### `core/feature-flags/`

Простой in-memory feature-flag сервис для MVP.

**Ответственность:**
- Хранение текущих флагов.
- Хук `useFeatureFlag(key)` возвращающий boolean.
- Инициализация флагов при старте из bundled JSON-config.

**Файлы:**
- `feature-flags/flags.ts` — flag store.
- `feature-flags/useFeatureFlag.ts` — хук.
- `feature-flags/defaults.json` — default-значения флагов.

#### MVP feature-flag keys

The following keys are defined in `src/core/feature-flags/defaults.json` and exposed via the `FeatureFlagKey` type:

| Key | Default | Purpose |
|-----|---------|---------|
| `enableDataVersionBanner` | `false` | Show a banner on launch when bundled JSON `dataVersion` is newer than the version last seen by the user. Will be activated in Phase 2 when OTA-update strategy is finalized. |
| `showCalcTimeOnResult` | `false` | Show calculation duration in the result panel metadata for debugging. Useful in development; stays `false` in production. |

**Adding new feature flags:** append to `defaults.json` with sensible defaults (almost always `false`), update the `FeatureFlagKey` union, document here in this contract.

### `core/logger/`

Логирование с уровнями.

**Ответственность:**
- В development: логи в `console`.
- В production: no-op (никаких логов в console).
- Уровни: `debug`, `info`, `warn`, `error`.

**Файлы:**
- `logger/logger.ts` — реализация.

### `core/result/`

Result-pattern для функций, которые могут вернуть ошибку.

**Ответственность:**
- Тип `Result<T, E>` с конструкторами `ok()` и `err()`.
- Утилиты для работы с Result (`map`, `flatMap`, `unwrap`, etc).

**Файлы:**
- `result/Result.ts` — реализация.

### `core/coming-soon-modules/`

Загрузка и предоставление списка «coming soon» модулей для Main Menu.

**Ответственность:**
- Парсинг bundled JSON-конфига (`comingSoonModules.json`).
- Хук `useComingSoonModules()`.

**Файлы:**
- `coming-soon-modules/data.json` — список модулей-тизеров.
- `coming-soon-modules/types.ts`.
- `coming-soon-modules/useComingSoonModules.ts`.

## Public API

Корневой `index.ts` модуля Core экспортирует:

```typescript
// i18n
export { useTranslation } from './i18n';
export type { TranslationKey, SupportedLanguage } from './i18n';
export { initI18n, setLanguage, getCurrentLanguage } from './i18n';

// theming
export { ThemeProvider, useTheme } from './theming';
export type { Theme, ThemeMode, ColorTokens, TypographyTokens } from './theming';

// storage
export { storage } from './storage';
export type { StorageKey } from './storage';

// disclaimer
export { useDisclaimerStatus, acceptDisclaimer } from './disclaimer';

// feature-flags
export { useFeatureFlag } from './feature-flags';
export type { FeatureFlagKey } from './feature-flags';

// logger
export { logger } from './logger';

// result
export { ok, err, Result } from './result';
export type { Result as ResultType } from './result';

// coming-soon-modules
export { useComingSoonModules } from './coming-soon-modules';
export type { ComingSoonModule } from './coming-soon-modules';
```

Что НЕ экспортируется: внутренние реализации, любые приватные утилиты, конфигурационные функции, не предназначенные для внешнего использования.

## Dependencies

**От других модулей:** ничего. Core — foundation, не зависит ни от чего внутри `src/`.

**От библиотек:**
- `i18next`, `react-i18next` (для i18n).
- `expo-localization` (для определения языка устройства).
- `@react-native-async-storage/async-storage` (для storage).
- `zod` (для валидации schemas в storage).
- `react`, `react-native` (для контекстов и хуков).

## Side-effects

- При старте приложения `initI18n()` загружает локали и определяет язык — это side-effect, выполняется один раз.
- `storage.set()` пишет в AsyncStorage асинхронно — side-effect.
- `acceptDisclaimer()` пишет в storage — side-effect.
- `setLanguage()` обновляет i18next instance и пишет в storage — side-effect.

Все side-effects явно документированы и не происходят неявно.

## Тестирование

**Unit-тесты:**
- `result/__tests__/Result.test.ts` — все операции Result.
- `disclaimer/__tests__/state.test.ts` — логика accept/check.
- `feature-flags/__tests__/flags.test.ts` — store-операции.
- `logger/__tests__/logger.test.ts` — в development логирует, в production — нет.

**Integration-тесты:**
- `i18n/__tests__/integration.test.ts` — переключение языков работает корректно.
- `storage/__tests__/integration.test.ts` — round-trip read-write работает.

**Coverage threshold:** ≥ 80% по всем 4 метрикам (см. `08-quality-gates.md`).

## Открытые вопросы

1. Стоит ли использовать MMKV вместо AsyncStorage для performance? Решение по умолчанию: AsyncStorage достаточен для MVP. MMKV рассмотрим в Phase 2+ если будет узкое место производительности.
