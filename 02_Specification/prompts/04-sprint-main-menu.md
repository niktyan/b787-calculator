# Prompt 04 · Sprint: Main Menu + Coming Soon

> **Когда использовать:** после merge Splash + Disclaimer.
>
> **Что произойдёт:** Claude Code реализует Main Menu с активной карточкой Crosswind и тремя «Coming Soon» карточками. Тап на coming-soon открывает modal.
>
> **Ожидаемое время Claude Code:** 30–45 минут. Ваше активное время: 5 минут.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement Main Menu and Coming Soon Modal.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/01-vision.md (section "Что входит в MVP")
- 02_Specification/06-ui-spec.md (section "Экран 3 · Main Menu" and "3.1 Coming Soon Modal")
- 02_Specification/ADR/0004-coming-soon-modules-as-config-not-modules.md
- 02_Specification/module-contracts/core.md (`core/modules/` submodule — renamed from `coming-soon-modules` in Sprint 6 follow-up Block 4)

After reading, confirm your understanding of:
- The 4 module cards (1 active, 3 coming soon).
- Module data (active + coming-soon) is read from `core/modules` via the `useModules()` hook; Main Menu filters by the discriminator `active`-field.
- Tap on active card → navigate to Crosswind screen (placeholder for now).
- Tap on coming-soon card → modal with "This module is planned... Stay tuned."

WAIT for "go".

# Task

After my "go":

1. Branch `feat/main-menu`.

2. Update src/core/modules/data.json with the canonical roadmap:
   - crosswind-takeoff (active, route `/crosswind`)
   - crosswind-landing (Phase 2, coming-soon)
   - weight-balance (Phase 3, coming-soon)
   - performance (Phase 4, coming-soon)
   Each entry conforms to the discriminated-union schema in
   `core/modules/types.ts`: active modules carry `route`,
   coming-soon entries carry `description` + `phase`.

3. Implement src/app/(main)/index.tsx as Main Menu:
   - Header with logo, app title, NavPills (Modules / Settings / About).
   - Grid of cards (responsive: 2x2 on iPad regular, single column on phone compact).
   - First card: "Crosswind · Landing" (active) → navigate to /(main)/crosswind.
   - Following cards: read from useComingSoonModules() hook.
   - Coming-soon cards visually muted (opacity, "Coming soon" badge).

4. Implement Coming Soon Modal:
   - Component in src/app/(main)/_components/ComingSoonModal.tsx.
   - Triggered by tapping inactive card.
   - Slide-up animation (300 ms).
   - Title: module name. Body: "This module is planned for an upcoming
     release. Stay tuned." Button: "OK".
   - Closes on OK / backdrop tap / system gesture.

5. Add placeholder src/app/(main)/crosswind.tsx that says "Crosswind module —
   implementation in next sprint" (will be replaced).

6. Add placeholder src/app/(main)/settings.tsx and src/app/(main)/about.tsx
   (will be implemented in sprint 06).

7. Wire navigation in src/app/(main)/_layout.tsx (expo-router stack).

8. Snapshot tests for Main Menu, Coming Soon Modal, placeholder screens.

9. Localize all strings via i18n (RU + EN).

10. Verify locally, then push, PR.

Manual testing instructions in PR:
"Open preview build in Expo Go. On launch reach Main Menu (skip disclaimer if
already accepted). Verify:
1. 4 cards visible. First (Crosswind · Landing) is active. Other three are visually muted.
2. Tap active card → navigate to placeholder Crosswind screen.
3. Tap a Coming-Soon card → modal appears with the planned-module text.
4. Modal closes on OK / backdrop tap.
5. NavPills work: tapping 'Settings' or 'About' navigates to placeholder screens.
6. Layout adapts on portrait/landscape and on iPhone vs iPad."

# Definition of Done

- [ ] core/modules data populated.
- [ ] Main Menu shows 1 active + 3 coming-soon cards.
- [ ] Active card navigates to placeholder Crosswind.
- [ ] Coming-soon modal works correctly.
- [ ] NavPills navigate to placeholder Settings and About.
- [ ] Responsive layout (2x2 → 1 col).
- [ ] All strings localized (RU + EN).
- [ ] Snapshot tests pass.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR created with clear manual testing.

# Hard constraints

- Coming-soon cards MUST NOT navigate anywhere except modal.
- Module list comes from JSON, not hardcoded.
- Use design-system components only — no inline styles.

# When done

Report briefly + PR URL.
```

---

## После завершения

1. PR review через Expo Go: проверьте все 6 пунктов из "Manual testing instructions".
2. Особенно убедитесь, что layout адаптивно ведёт себя при повороте экрана.
3. Напишите `merge it` в чат Claude Code.
4. Следующий промпт: **`05-sprint-crosswind.md`** — самый объёмный sprint, реализация главного модуля.
