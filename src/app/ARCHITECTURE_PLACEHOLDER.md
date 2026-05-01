# src/app — App Shell + expo-router routes

**Назначение:** composition root приложения **И** корневая директория expo-router (file-based routing). Expo SDK 54 предпочитает `src/app/` корневому `app/`, поэтому всё держим здесь.

**Что сюда кладётся:**

- `_layout.tsx` — root layout expo-router (Stack / Tabs / Drawer).
- `index.tsx`, `splash.tsx`, `crosswind.tsx`, ... — экраны как route-файлы (file-based routing).
- `providers.tsx` (будет в Phase C) — иерархия Provider-компонентов (Theme, i18n, Disclaimer, Feature-flags, ErrorBoundary). Подключается из `_layout.tsx`.

**Что НЕ сюда:**

- Бизнес-логика. Только композиция и навигация.
- Feature-specific код — в `src/features/<feature>/`.

**Зависимости:** `src/core`, `src/design-system`, `src/features/*`. Никто не зависит от `src/app/`.

См. `02_Specification/02-architecture.md` → раздел «Композиция: как модули соединяются в App», `03-tech-stack.md` → expo-router.
