# Prompt 08 · Sprint: Accessibility Audit

> **Когда использовать:** последний sprint перед App Store submission, после localization audit.
>
> **Что произойдёт:** Claude Code проходит по всем экранам и компонентам, добавляет недостающие accessibility-атрибуты, проверяет touch-targets, контраст, поддержку Reduce Motion и Dynamic Type.
>
> **Ожидаемое время Claude Code:** 30–60 минут. Ваше активное время: 15–20 минут (включая VoiceOver-тест на iPhone).

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Perform a comprehensive accessibility audit.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/06-ui-spec.md (section "Accessibility checklist" +
  section "Анимации" for Reduce Motion semantics)
- 02_Specification/08-quality-gates.md (section "Accessibility checklist")
- 02_Specification/module-contracts/design-system.md (section "Тестирование")

# Task

1. Branch `chore/accessibility-audit`.

2. For every interactive component in src/design-system and every screen in src/app/:
   - Verify `accessibilityLabel` is present (or is meaningful from rendered text).
   - Verify `accessibilityRole` is set on Pressable / Button / Toggle / etc.
   - Verify minimum touch-target 44×44 pt (44pt minimum, 56pt for critical
     surfaces — see 06-ui-spec § Принципы UX «Принцип 2»).
   - Verify `accessibilityHint` is set where action isn't obvious.

   New components added in Sprint 6 + polish rounds to include in the audit:
   - `BottomSheet` + `BottomSheetOption` (Settings → Language / Theme pickers).
   - `ScreenHeader` (shared by Main Menu, Settings, About, Crosswind).
   - `NavigableSettingsRow`, `ToggleSettingsRow`, `InfoSettingsRow`
     (Settings + About rows; the chevron is an Ionicons icon, NOT a
     Unicode glyph — verify `accessibilityLabel` flows through from
     the row's label prop, not from the icon).

3. Verify Dynamic Type support:
   - All Text components in design-system support font scaling EXCEPT the
     large numeric result (which has fixed size for readability).
   - Test with iOS Larger Accessibility Sizes turned on (manually).

4. Verify Reduce Motion support:
   - The design-system already exposes a `useReduceMotion()` hook
     (`src/design-system/hooks/useReduceMotion.ts`) that subscribes to
     `AccessibilityInfo.reduceMotionChanged` and updates live. Two
     consumers already wired:
       - `useScaleOnPress` (press-feedback animations) — collapses to
         identity animatedStyle when reduceMotion is true.
       - `src/app/(main)/_layout.tsx` — sets `animation: 'none'` on every
         Stack.Screen when reduceMotion is true (covers both the
         200ms fade for sibling NavPills and the 300ms slide_from_right
         for Crosswind drilldown).
   - Audit verifies: any NEW animation added during the polish rounds (e.g.,
     CrosswindResult panel transitions) also consults `useReduceMotion`.
     If a new animation skips it — fix.

5. Verify `NumericInput` reserved warning slot does NOT disrupt screen-
   reader experience:
   - When the slot is empty (no error), VoiceOver should skip past it —
     the slot is a layout placeholder, not a focusable target.
   - When the slot contains an error Text, VoiceOver reads it as part of
     the form-field group.
   - Slot was added in Sprint 6 follow-up Polish-Round-2 Block 3b for
     layout stability; the a11y side-effect is positive (no surprise
     re-flow when warning toggles).

6. Verify color contrast:
   - Main text on background ≥ 4.5:1 in both themes.
   - Large text ≥ 3:1.
   - Run a contrast check on each theme's color combinations.
   - If any fails — adjust tokens.ts.

7. Verify color is never the only signal:
   - Errors must have icon + text (not just red).
   - Warnings must have icon + text (not just amber).
   - Success states should not depend solely on green.

8. Add new unit tests where applicable to verify `accessibilityLabel`
   presence on critical interactive components (Button, Toggle,
   NumericInput, NavigableSettingsRow, ToggleSettingsRow,
   BottomSheetOption).

9. Update 02_Specification/08-quality-gates.md → mark accessibility checklist
   items as done.

10. Commit, push, PR.

Title: "chore(a11y): comprehensive accessibility audit"

Manual testing in PR (this is the most important manual test in the project):
"Tasks for the user to perform:

1. **VoiceOver test** (iPhone Settings → Accessibility → VoiceOver → On):
   - Triple-tap home / power button to toggle VoiceOver.
   - Open the app. Swipe right to navigate through every interactive element.
   - Verify: every element has a meaningful spoken description.
   - Verify: navigation order is logical (top-to-bottom, left-to-right).
   - Verify: Settings → Modules section toggles announce as
     'switch, on/off' with the module name.
   - Toggle VoiceOver off when done.

2. **Dynamic Type test** (Settings → Display & Brightness → Text Size):
   - Slide to maximum size.
   - Open the app. Walk through screens.
   - Verify: text scales appropriately. Layout doesn't break.
   - Verify: the large numeric result on Crosswind screen REMAINS readable size.
   - Reset to default.

3. **Reduce Motion test** (Settings → Accessibility → Motion → Reduce Motion):
   - Toggle on.
   - Open app. Navigate between screens.
   - Verify: NavPill tab switches are instant (no fade).
   - Verify: Main Menu → Crosswind drilldown is instant (no slide).
   - Verify: button press-feedback no longer scales.
   - Toggle off — animations return.

4. **Contrast test**:
   - In Settings of the app, switch to Dark theme.
   - Open Crosswind. All text should be clearly readable.
   - Switch to Light theme. Same check.

5. **Color-blind test** (Settings → Accessibility → Display & Text Size →
    Color Filters → Greyscale):
   - Toggle greyscale on.
   - Open the app. Errors and warnings should still be distinguishable
     (because of icons + text, not just color).
   - Toggle off."

# Definition of Done

- [ ] All interactive components have accessibilityLabel and Role.
- [ ] Touch targets ≥ 44×44 pt.
- [ ] Dynamic Type works (except fixed-size result).
- [ ] Reduce Motion works — every animated surface (press-feedback,
      Stack-screen transitions, any new component animations)
      consults `useReduceMotion`.
- [ ] Color contrast WCAG AA in both themes.
- [ ] No color-only signals.
- [ ] Updated tests.
- [ ] All audit checklist items in 08-quality-gates.md marked done.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with detailed manual testing for VoiceOver and Dynamic Type.

# When done

Report briefly. After this PR is merged, the app is READY FOR APP STORE
SUBMISSION. Next steps will be in `09-cicd-and-ops.md` Phase D-E.
```

---

## После завершения

Это последний implementation sprint. После merge:

1. Тщательно проверьте все 5 manual testing задач в Expo Go (особенно VoiceOver — это занимает 10 минут, но важно).
2. Если что-то не работает — оставьте комментарий в PR, попросите Claude Code исправить.
3. После того как вы напишете `merge it` и Claude Code смерджит — приложение **готово к App Store submission**.

**Следующие шаги** (не sprint, а процедура из `09-cicd-and-ops.md`):

1. Запустите `./scripts/release.sh patch` (или `minor` для первого публичного релиза, скорее `1.0.0`).
2. Дождитесь TestFlight-сборки через GitHub Actions.
3. Раздайте TestFlight invitations 5–10 пилотам B787 для бета-теста (1–2 недели).
4. После подтверждения работоспособности — Submit for Review в App Store Connect.
5. Используйте App Review Notes из `07-app-store-compliance.md`.
