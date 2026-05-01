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
- 02_Specification/06-ui-spec.md (section "Accessibility checklist")
- 02_Specification/08-quality-gates.md (section "Accessibility checklist")
- 02_Specification/module-contracts/design-system.md (section "Тестирование")

# Task

1. Branch `chore/accessibility-audit`.

2. For every interactive component in src/design-system and every screen in app/:
   - Verify accessibilityLabel is present (or is meaningful from rendered text).
   - Verify accessibilityRole is set on Pressable / Button / Toggle / etc.
   - Verify minimum touch-target 44x44 pt (44pt minimum, 56pt for critical).
   - Verify accessibilityHint is set where action isn't obvious.

3. Verify Dynamic Type support:
   - All Text components in design-system support font scaling EXCEPT the
     large numeric result (which has fixed size for readability).
   - Test with iOS Larger Accessibility Sizes turned on (manually).

4. Verify Reduce Motion support:
   - Wrap all react-native-reanimated animations with reduce-motion check.
   - When AccessibilityInfo.isReduceMotionEnabled() is true → use immediate transitions.
   - Reanimated has built-in support; verify it's enabled.

5. Verify color contrast:
   - Main text on background ≥ 4.5:1 in both themes.
   - Large text ≥ 3:1.
   - Run a contrast check on each theme's color combinations.
   - If any fails — adjust tokens.ts.

6. Verify color is never the only signal:
   - Errors must have icon + text (not just red).
   - Warnings must have icon + text (not just amber).
   - Success states should not depend solely on green.

7. Add new unit tests where applicable to verify accessibilityLabel presence
   on critical interactive components (Button, Toggle, NumericInput).

8. Update 02_Specification/08-quality-gates.md → mark accessibility checklist
   items as done.

9. Commit, push, PR.

Title: "chore(a11y): comprehensive accessibility audit"

Manual testing in PR (this is the most important manual test in the project):
"Tasks for the user to perform:

1. **VoiceOver test** (iPhone Settings → Accessibility → VoiceOver → On):
   - Triple-tap home / power button to toggle VoiceOver.
   - Open the app. Swipe right to navigate through every interactive element.
   - Verify: every element has a meaningful spoken description.
   - Verify: navigation order is logical (top-to-bottom, left-to-right).
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
   - Verify: transitions are instant or very subtle, no slide animations.
   - Toggle off.

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
- [ ] Touch targets ≥ 44x44 pt.
- [ ] Dynamic Type works (except fixed-size result).
- [ ] Reduce Motion works.
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
3. После Approve + Merge — приложение **готово к App Store submission**.

**Следующие шаги** (не sprint, а процедура из `09-cicd-and-ops.md`):

1. Запустите `./scripts/release.sh patch` (или `minor` для первого публичного релиза, скорее `1.0.0`).
2. Дождитесь TestFlight-сборки через GitHub Actions.
3. Раздайте TestFlight invitations 5–10 пилотам B787 для бета-теста (1–2 недели).
4. После подтверждения работоспособности — Submit for Review в App Store Connect.
5. Используйте App Review Notes из `07-app-store-compliance.md`.
