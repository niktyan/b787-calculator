# Prompt 02 · Sprint: Design System

> **Когда использовать:** после merge `feat/core-module`.
>
> **Что произойдёт:** Claude Code реализует все переиспользуемые UI-компоненты из `module-contracts/design-system.md` с design tokens, snapshot-тестами, поддержкой светлой/тёмной тем.
>
> **Ожидаемое время Claude Code:** 60–90 минут. Ваше активное время: 5 минут.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement the Design System module.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/02-architecture.md
- 02_Specification/06-ui-spec.md (full)
- 02_Specification/08-quality-gates.md (sections on lint rules for styles)
- 02_Specification/module-contracts/design-system.md
- 03_Mockups/index.html (visual reference for component look-and-feel)

After reading, summarize the list of components to build and the token structure.
WAIT for my "go".

# Task: implement Design System at src/design-system/

After my "go":

1. Create feature branch `feat/design-system`.

2. Implement design tokens (src/design-system/tokens.ts):
   - colors (light/dark variants)
   - typography (display, heading1, heading2, body, caption, label, mono)
   - spacing (4, 8, 12, 16, 24, 32, 48)
   - radii (4, 8, 12, 16)
   - shadows (minimal/flat)
   - breakpoints (compact, regular)
   Reference visual values from 03_Mockups/index.html design system section.

3. Implement components per module-contracts/design-system.md, each in its own folder:

   Layout:
   - Screen
   - Stack
   - Row
   - Card

   Text:
   - Text (with variants)
   - MonoText

   Inputs:
   - NumericInput (numeric-pad / decimal-pad keyboards, validation, error state)
   - SegmentedControl
   - Toggle
   - Button (primary, secondary, ghost variants)

   Feedback:
   - Disclaimer
   - ResultPanel (states: empty, idle, error, out-of-envelope)
   - EmptyState
   - ErrorState

   Navigation:
   - BackButton
   - NavPills

4. For each component:
   - File: ComponentName.tsx
   - Snapshot test: ComponentName.test.tsx
   - Folder index.ts barrel

5. Main barrel: src/design-system/index.ts exports everything per the contract.

6. All components MUST:
   - Use useTheme() from src/core for tokens.
   - Support light AND dark themes.
   - Have accessibilityLabel where applicable.
   - Have minimum touch targets 44x44 pt for interactive elements.
   - Use only StyleSheet.create() for styles. No inline styles.
   - Reference colors via tokens, no literals.

7. Verify locally:
   - `npm run lint` — 0 errors (no-inline-styles, no-color-literals must pass).
   - `npm run typecheck` — 0 errors.
   - `npm run test` — all snapshot tests pass.

8. Commit, push, create PR:
   - Title: "feat(design-system): initial component library"
   - Manual testing instructions: "Functional check — open Expo Go on the
     preview build, verify components don't crash. The components are not yet
     wired into screens; visual verification via Storybook is out of scope for MVP."

# Definition of Done

- [ ] All required spec files read.
- [ ] All components from design-system.md implemented.
- [ ] tokens.ts contains complete tokens for light + dark themes.
- [ ] Each component has a snapshot test.
- [ ] No inline styles, no color literals (CI ESLint passes).
- [ ] `npm run lint` / `typecheck` / `test` all green.
- [ ] Coverage ≥ 70%.
- [ ] PR created with template, manual testing instructions clear.

# Hard constraints

- design-system MUST NOT import from src/features/*. It's foundation.
- design-system MUST NOT contain business logic. Only presentation primitives.
- All components MUST work in both themes (dark default, light fallback).

# When done

Report briefly: list of components, total LOC, coverage %, PR URL.
```

---

## После завершения

1. Открыть PR, проверить зелёный CI.
2. Напишите в чат Claude Code: `merge it` — он сделает merge сам.
3. Следующий промпт: `03-sprint-splash-disclaimer.md`.
