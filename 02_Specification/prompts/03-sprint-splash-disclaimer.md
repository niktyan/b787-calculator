# Prompt 03 · Sprint: Splash + Disclaimer

> **Когда использовать:** после merge Design System.
>
> **Что произойдёт:** Claude Code реализует Splash-экран и Disclaimer-экран с правильным первозапускным flow.
>
> **Ожидаемое время Claude Code:** 30–45 минут. Ваше активное время: 5–10 минут (включая первый функциональный тест в Expo Go).

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement Splash and Disclaimer screens.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/06-ui-spec.md (sections "Экран 1 · Splash" and "Экран 2 · Disclaimer")
- 02_Specification/07-app-store-compliance.md (section "Тексты дисклеймеров в приложении")
- 02_Specification/module-contracts/core.md (disclaimer hook)

After reading, summarize the navigation flow:
- First launch: Splash → Disclaimer → (after accept) Main Menu
- Subsequent launches: Splash → Main Menu (skip Disclaimer)
- Verify your understanding of timing constraints (Splash min 800ms, max 5000ms).

WAIT for my "go".

# Task: implement Splash and Disclaimer

After my "go":

1. Create feature branch `feat/splash-disclaimer`.

2. Implement src/app/splash.tsx (Splash screen):
   - Use components from src/design-system (Screen, Stack, Text).
   - Show "B7" logo placeholder, app name, version, "Electronic Performance Tools".
   - Logic per `06-ui-spec.md`:
     - Min display 800ms.
     - Max wait 5000ms; if exceeded, navigate to error screen.
     - On data ready (placeholder check; real data loading comes in
       crosswind sprint), navigate based on disclaimer status:
       - If accepted → /(main)
       - If not → /disclaimer
     - On data error → /error

3. Implement src/app/disclaimer.tsx (Disclaimer screen):
   - Use English fixed text from `07-app-store-compliance.md`:
     "Advisory only. Calculations provide conservative reference values for
     Boeing 787 operations. Final operational decisions must always be based
     on official Boeing FCOM/QRH and your operator's procedures. Not for
     primary navigation or operational use."
   - Title "Advisory only" displayed prominently.
   - Button "I understand · Continue" (single action on screen).
   - On press: call core's acceptDisclaimer(), then navigate to /(main).
   - Disable system back gesture on this screen.

4. Implement src/app/error.tsx (fail-safe error screen) per `06-ui-spec.md` "Экран 7":
   - Title: "Reference data unavailable"
   - Description and Retry/Contact support buttons.

5. Update app/_layout.tsx to register all three routes via expo-router.

6. Add appropriate snapshot tests:
   - app/splash.test.tsx
   - app/disclaimer.test.tsx
   - app/error.test.tsx

7. Localize Disclaimer screen UI labels (button text, etc.) via i18n,
   BUT keep the disclaimer body text fixed English (per spec rule).

8. Verify locally and via preview build.

9. Commit, push, create PR with title "feat(app): splash, disclaimer, and error screens".
   Manual testing instructions:
   "Open the preview build in Expo Go. On first launch you should see:
   1. Splash with logo and app name (~1 second).
   2. Disclaimer screen with the English advisory text and 'I understand · Continue' button.
   3. After tapping the button, you should land on a placeholder Main Menu (or
      whatever placeholder index.tsx shows).
   4. Restart the app — Disclaimer should NOT show again, only Splash → Main Menu.
   5. Test in both light and dark themes (toggle iOS system theme)."

# Definition of Done

- [ ] All required spec files read.
- [ ] Splash, Disclaimer, Error screens implemented.
- [ ] First-launch flow works: Splash → Disclaimer (one-time) → Main Menu.
- [ ] Subsequent-launch flow: Splash → Main Menu.
- [ ] disclaimerAccepted flag persisted via core/storage.
- [ ] Disclaimer body text is exactly the English text from 07-app-store-compliance.md.
- [ ] Both light and dark themes look correct.
- [ ] All snapshot tests pass.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR created with clear manual testing instructions.

# Hard constraints

- Disclaimer body text is FIXED ENGLISH. Do not localize it.
- System back gesture must be disabled on Disclaimer screen.
- Splash navigation logic must respect min/max timings.
- No business logic in screen components — use core hooks for all state.

# When done

Report briefly: PR URL + reminder for me to functionally test on iPhone via Expo Go.
```

---

## После завершения

Это первый sprint, где у вас есть **видимый интерфейс**. Обязательно протестируйте:

1. Откройте PR, дождитесь зелёного CI.
2. Откройте preview build на iPhone через Expo Go.
3. Проверьте:
   - Splash появляется на ~1 секунду.
   - Disclaimer показывается с правильным английским текстом.
   - После «I understand · Continue» переход на placeholder Main Menu.
   - Перезапустите приложение — Disclaimer **не** должен появиться снова.
   - Переключите системную тему (iOS Settings → Display & Brightness) — обе темы должны работать.
4. Если всё ОК — Approve + Merge.
5. Следующий промпт: `04-sprint-main-menu.md`.
