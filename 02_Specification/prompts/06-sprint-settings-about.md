# Prompt 06 · Sprint: Settings + About

> **Когда использовать:** после merge Crosswind takeoff-rebrand PR
> (`feat/crosswind-takeoff-rebrand`, squash commit `09ac1d6`).
>
> **Что произойдёт:** Claude Code достраивает уже частично
> реализованный About до полного 8-rows-набора и заменяет Settings
> placeholder на реальный экран.
>
> **Ожидаемое время Claude Code:** 30–45 минут. Ваше активное время: 5 минут.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement Settings and append the missing
About rows.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md (R3 quality gates, R5 spec sync,
  R9 i18n, R10 named constants)
- 02_Specification/06-ui-spec.md
    § Экран 5 · Settings (full)
    § Экран 6 · About (full)
- 02_Specification/07-app-store-compliance.md
    § "About screen — раздел Disclaimer"
    § "Outstanding placeholders for Phase D" (Support mailto target)
- 02_Specification/module-contracts/core.md
    (storage, i18n, theming hooks)
- src/app/(main)/about.tsx (current 3-row implementation —
  see "Pre-existing state" below)
- src/app/(main)/settings.tsx (current placeholder)

After reading, summarize the list of settings + the FIVE About
rows you will ADD (not the three already in place). WAIT for "go".

# Pre-existing state — DO NOT recreate

`src/app/(main)/about.tsx` was implemented partially in PR #31
(`feat/crosswind-polish-2`) to host the data-source attribution
that was previously a chip on the Crosswind result panel. Three
rows are already wired:

  1. ✅ Version       — `expo-application` nativeApplicationVersion
  2. ✅ Aircraft      — i18n `about.aircraftValue`
  3. ✅ Data source   — `referenceDocument · dataVersion` from
                        `crosswindRepository.load()`

The header (B7 logo, NavPills, divider) and the AboutRow
sub-component are also already in place. Sprint 6 must:

- KEEP the existing 3 rows. Do NOT rewrite them.
- KEEP the AboutHeader component and the AboutRow primitive.
- APPEND the 5 missing rows in correct order to the same `<Stack
  gap="sm">` container.
- Optionally update the Aircraft row's i18n value to disclose
  Phase 2 — see the row spec below.

`src/app/(main)/settings.tsx` is still a placeholder showing the
title + a localised body string. It must be replaced wholesale.

# Task

After my "go":

1. Branch `feat/settings-about`.

2. Implement src/app/(main)/settings.tsx (replace placeholder)
   per `06-ui-spec.md` § Экран 5:
   - Language: clickable row → bottom sheet with English / Русский.
   - Theme: bottom sheet with Auto / Light / Dark.
   - Weight units: **Tons (t)** active / **Pounds (lbs)** disabled
     with the "Available in upcoming release" caption (per spec —
     the earlier "kg" wording was superseded; domain is in tons).
   - Wind units: KT only (m/s disabled with the same caption).
   - Show data source on result: toggle, default ON.
   All settings persist via core/storage and apply immediately
   (no Save button).

3. Append rows 4–8 to src/app/(main)/about.tsx per
   `06-ui-spec.md` § Экран 6:
   - **Validation**     — i18n `about.validationValue`
                          ("Active line pilots").
   - **Distribution**   — i18n `about.distributionValue`
                          ("Public App Store").
   - **Privacy policy** — tappable accent-coloured row, opens
                          via `expo-web-browser`
                          `WebBrowser.openBrowserAsync(...)`.
                          URL from `src/core/constants.ts`.
                          Affordance label "View →" + chevron.
   - **Terms of use**   — same pattern, separate URL.
   - **Support**        — mailto: link via `Linking.openURL`.
                          Email from `src/core/constants.ts`,
                          using the same placeholder as
                          `src/app/error.tsx` per the
                          07-app-store-compliance.md
                          "Outstanding placeholders for Phase D"
                          rule (replaced everywhere at once).

   Update the Aircraft row's i18n value to disclose Phase 2:
   `about.aircraftValue` → "Boeing 787-8 (B787-9 — Phase 2)".
   Both en and ru use the same English aviation-term wording.

   Add a short disclaimer paragraph below the row stack,
   sourced from `07-app-store-compliance.md` § "About screen —
   раздел Disclaimer".

4. Privacy Policy / Terms of Use / Support placeholders live in
   `src/core/constants.ts` (create if it doesn't exist).
   Use the GitHub-Pages placeholders from the spec:
     PRIVACY_POLICY_URL = "https://<github-username>.github.io/b787-calculator/privacy-policy.html"
     TERMS_OF_USE_URL   = "https://<github-username>.github.io/b787-calculator/terms-of-use.html"
     SUPPORT_EMAIL      = "support@example.com"   ← Phase D placeholder
   I'll provide the real <github-username> when asked.

5. Snapshot tests for Settings (full screen) and About (with all
   8 rows). Behavior tests for Language switch, Theme switch,
   show-data-source toggle persistence.

6. All new strings localized in both `en.json` and `ru.json`.
   Aviation labels (KT, t, lbs, m/s, B787-8, B787-9) stay in
   English in both locales per the localisation rule in
   `06-ui-spec.md`.

7. Verify quality gates (lint 0/0, typecheck 0, tests green),
   push, create PR.

PR title: "feat(app): settings screen + completed about screen"

Manual testing:
"Navigate via NavPills to Settings and About:
1. Settings: change Language (RU↔EN). UI updates immediately.
2. Change Theme (Auto/Light/Dark). UI updates immediately.
3. Toggle 'Show data source on result'. Close app, reopen,
   verify it persisted.
4. Tap Weight units / Wind units → segments stay disabled, no
   crash; the disabled-state caption is visible.
5. About: Version field shows current version + build.
6. Aircraft row says 'Boeing 787-8 (B787-9 — Phase 2)'.
7. Validation, Distribution rows show their static values.
8. Tap Privacy Policy → opens in-app browser with the URL.
9. Tap Terms of Use → similar.
10. Tap Support email → opens iOS mail app.
11. Disclaimer text at bottom of About reads as the short
    advisory paragraph (not the splash one)."

# Definition of Done

- [ ] All required spec files read.
- [ ] About: 3 pre-existing rows untouched; 5 new rows appended
      in correct order; disclaimer paragraph added.
- [ ] Aircraft row i18n value updated to disclose Phase 2.
- [ ] Settings: 5 settings, persistence works.
- [ ] Privacy Policy / Terms of Use open via in-app browser.
- [ ] Email support link opens mail app.
- [ ] Both themes render without contrast issues.
- [ ] Snapshot tests pass.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with detailed manual-testing instructions.

# Hard constraints

- Disabled settings (Weight units → Pounds, Wind units → m/s)
  must be visually greyed out; tap shows the
  "Available in upcoming release" caption (no toast component
  required — caption beneath the row label is sufficient per
  06-ui-spec.md Toggle visual treatment).
- Privacy Policy / Terms of Use URLs and Support email live in
  `src/core/constants.ts`, not hardcoded inline.
- Do NOT touch `crosswindRepository.load()` or any feature
  module — Settings + About are app-shell screens.
- Do NOT introduce new design-system tokens (reuse existing
  body / caption / monoSmall / accent / textSecondary).
- Aircraft, runway-condition, and unit labels (KT, t, lbs, m/s,
  B787-8, B787-9, MAC) — NOT translated to Russian
  (06-ui-spec.md localisation rule).

# When done

Report briefly + PR URL.
```

---

## После завершения

1. Откройте PR, проверьте CI.
2. Тщательно протестируйте все настройки и About-экран в Expo Go:
   - Переключение языка обновляет интерфейс мгновенно.
   - Переключение темы тоже.
   - Настройки сохраняются между запусками.
   - Все 8 рядов About видимы и кликабельные где должны быть.
3. Напишите `merge it` в чат Claude Code.
4. Следующий промпт: `07-sprint-localization-audit.md`.
