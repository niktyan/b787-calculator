# Prompt 06 · Sprint: Settings + About

> **Когда использовать:** после merge Crosswind module.
>
> **Что произойдёт:** Claude Code реализует Settings и About экраны.
>
> **Ожидаемое время Claude Code:** 30–45 минут. Ваше активное время: 5 минут.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement Settings and About screens.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/06-ui-spec.md (sections "Экран 5 · Settings" and "Экран 6 · About")
- 02_Specification/07-app-store-compliance.md (section "About screen — раздел Disclaimer")
- 02_Specification/module-contracts/core.md (storage, i18n, theming hooks)

After reading, summarize the list of settings and About fields. WAIT for "go".

# Task

After my "go":

1. Branch `feat/settings-about`.

2. Implement src/app/(main)/settings.tsx:
   - Language: clickable row → bottom sheet with English / Русский.
   - Theme: bottom sheet with Auto / Light / Dark.
   - Weight units: kg only (Pounds disabled with "Available in upcoming release" hint).
   - Wind units: KT only (m/s disabled).
   - Show data source on result: toggle, default ON.
   All settings persist via core/storage and apply immediately (no Save button).

3. Implement src/app/(main)/about.tsx:
   - Version: from expo-application (X.Y.Z + build N).
   - Aircraft: "Boeing 787-8".
   - Validation: "Active line pilots".
   - Data source: dataVersion from crosswind JSON.
   - Distribution: "Public App Store".
   - Privacy policy: opens via expo-web-browser to GitHub Pages URL.
   - Terms of use: same.
   - Support: email link (mailto:).
   - Below: short disclaimer text from `07-app-store-compliance.md` section
     "About screen — раздел Disclaimer".

4. The Privacy Policy and Terms of Use URLs come from constants in
   src/core/constants.ts (created in this sprint if not exists).
   Use placeholder URLs for now: https://<github-username>.github.io/b787-calculator/privacy-policy.html
   I'll provide the real <github-username> when asked.

5. Snapshot tests for Settings and About.

6. All strings localized (RU + EN).

7. Verify, push, PR.

PR title: "feat(app): settings and about screens"

Manual testing:
"Navigate via NavPills to Settings and About:
1. Settings: Try changing Language (RU↔EN). UI updates immediately.
2. Try changing Theme (Auto/Light/Dark). UI updates.
3. Toggle 'Show data source on result'. Verify it persists by closing app and reopening.
4. About: Version field shows current version + build.
5. Tap Privacy Policy → opens in-app browser with the policy.
6. Tap Terms of Use → similar.
7. Tap Support email → opens iOS mail app.
8. Disclaimer text at bottom of About is the short version (not the splash one)."

# Definition of Done

- [ ] All required spec files read.
- [ ] Settings screen with all 5 settings, persistence works.
- [ ] About screen with all fields filled.
- [ ] Privacy Policy and Terms of Use open via in-app browser.
- [ ] Email support link opens mail app.
- [ ] Both themes look good.
- [ ] Snapshot tests pass.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with detailed testing.

# Hard constraints

- Disabled settings (Weight units, Wind units alternatives) must be visually
  greyed out and tap shows toast "Available in upcoming release".
- Privacy Policy URL is in constants, not hardcoded in component.

# When done

Report briefly + PR URL.
```

---

## После завершения

1. Откройте PR, проверьте CI.
2. Тщательно протестируйте все настройки в Expo Go:
   - Переключение языка обновляет интерфейс мгновенно.
   - Переключение темы тоже.
   - Настройки сохраняются между запусками.
3. Approve + Merge.
4. Следующий промпт: `07-sprint-localization-audit.md`.
