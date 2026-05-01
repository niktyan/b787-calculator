# src/app — App Shell

**Назначение:** composition root приложения. Здесь живут провайдеры контекстов, навигационная конфигурация (если нужно дополнить expo-router), и точка сборки модулей.

**Что сюда кладётся:**

- `providers.tsx` — иерархия Provider-компонентов (Theme, i18n, Disclaimer, Feature-flags, ErrorBoundary).
- Дополнительные навигационные обёртки, если потребуются.

**Что НЕ сюда:**

- Бизнес-логика. Только композиция.
- Feature-specific код — в `src/features/<feature>/`.

**Зависимости:** `src/core`, `src/design-system`, `src/features/*`. Никто не зависит от `src/app/`.

См. `02_Specification/02-architecture.md` → раздел «Композиция: как модули соединяются в App».
