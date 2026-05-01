# src/core — Shared layer

**Назначение:** общие сервисы и утилиты, переиспользуемые всеми feature-модулями.

**Подмодули:**

- `i18n/` — i18next config + локали `en.json` / `ru.json`.
- `theming/` — design tokens, dark/light тема.
- `storage/` — обёртка над `AsyncStorage` (и `expo-secure-store` для будущего).
- `disclaimer/` — состояние acceptance-флага disclaimer-а.
- `feature-flags/` — простой in-memory feature-flag сервис.
- `logger/` — логгер, no-op в production-сборке.

**Правила:**

- Не импортирует ничего из `features/*`.
- Может импортировать `react-native` и `expo*`.
- Публичный API экспонируется через `src/core/index.ts` (barrel). Внешние модули должны импортировать из `@core/*` или `@/core` — не из внутренностей.

См. `02_Specification/02-architecture.md` и `02_Specification/module-contracts/core.md`.
