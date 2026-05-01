# src/design-system — Design System

**Назначение:** переиспользуемые UI-компоненты + design tokens.

**Структура:**

- `tokens.ts` — цвета, типографика, размеры (single source of truth для визуальных констант).
- `components/` — `Card`, `Button`, `Input`, `ResultPanel` и т.д.

**Зависимости:** только React Native примитивы и `core/theming`. **Не знает о features или domain-логике.**

См. `02_Specification/02-architecture.md` и `02_Specification/module-contracts/design-system.md`.
