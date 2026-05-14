# Prompt 07 · Sprint: Localization Audit

> **Когда использовать:** после merge Settings + About.
>
> **Что произойдёт:** Claude Code проходит по всему приложению, находит все непокрытые строки, локализует их, проверяет EN+RU полное покрытие.
>
> **Ожидаемое время Claude Code:** 20–40 минут. Ваше активное время: 5 минут.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Perform a comprehensive localization audit.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/06-ui-spec.md (section "Локализация")

# Task

1. Branch `chore/localization-audit`.

2. Search the entire src/ and app/ directories for hardcoded user-facing strings:
   - Run a grep for raw <Text> tags.
   - Run a grep for string literals in JSX.
   - Identify any string that should be localized but is hardcoded.

3. For each hardcoded string:
   - Add appropriate key to src/core/i18n/locales/en.json.
   - Add Russian translation to src/core/i18n/locales/ru.json.
   - Replace hardcoded string in JSX with `t('key')` call.

4. Verify completeness:
   - All keys in en.json have corresponding keys in ru.json (no missing translations).
   - All keys in ru.json have corresponding keys in en.json (parity in both
     directions — neither file is the source-of-truth alone).
   - No leftover hardcoded user-facing strings (after audit).
   - The ESLint rule `react-native/no-raw-text` is treated as the validation
     gate for this sprint — it must pass with no exceptions; any disable
     comments need an explicit justification in the PR description.

5. Validate translations:
   - Check Russian translations make sense (not literal machine translation).
   - Disclaimer body text in src/app/disclaimer.tsx remains FIXED ENGLISH
     in both locales — same string in en.json and ru.json (juридическая
     однозначность per spec § Локализация).
   - `about.disclaimer` (the short advisory paragraph at the bottom of the
     About screen) — same English-only treatment. Both keys ship the same
     English string in en.json and ru.json.

6. **DO NOT localise the following — these stay English in both locales:**

   - **Aviation terms:** `KT`, `MAC`, `RWY`, `RWYCC`, `FCOM`, `OM-B`, `CG`,
     `TOW`. Used as labels and identifiers throughout the app.
   - **Aircraft variants:** `Boeing 787-8`, `Boeing 787-9`, `B787-8`,
     `B787-9`.
   - **Runway condition labels (RWYCC scale):** `Dry`, `Good`,
     `Medium to Good`, `Medium`, `Medium to Poor`, `Poor`.
   - **Unit labels:** `Tons (t)`, `Knots (KT)`. Permanent MVP units
     (see Sprint 6 follow-up Block 2 / 01-vision.md MVP Units).
   - **Module product names in Main Menu:** `Crosswind · Takeoff`,
     `Crosswind · Landing`, plus any future module name. These come from
     `src/core/modules/data.json` `name` field and are product names, not
     UI strings.
   - **Splash disclaimer body** (юридический текст).
   - **About advisory disclaimer body** (то же правило).

   Crosswind output unit suffix (`KT`), TOW unit (`t`), and CG unit
   (`%MAC`) are aviation terms — also English-only.

7. Be aware of Sprint 6 + polish-round keys (already present, do not remove
   or rename):

   - **Modules section in Settings:** `settings.modulesSectionTitle`.
   - **Language picker labels:** `settings.languageEnglish`,
     `settings.languageRussian`.
   - **Theme labels:** `settings.themeAuto`, `settings.themeLight`,
     `settings.themeDark`, `settings.sheetClose`.
   - **Unit info-rows:** `settings.weightUnits`, `settings.windUnits` (label
     keys only — the values "Tons (t)" / "Knots (KT)" are hardcoded English
     aviation-term strings in the screen, NOT i18n keys).
   - **Main Menu empty state:** `mainMenu.allHidden`, `mainMenu.openSettings`.
   - **About row labels + values:** `about.title`, `about.version`,
     `about.validation`, `about.validationValue`, `about.dataSource`,
     `about.distribution`, `about.distributionValue`, `about.privacyPolicy`,
     `about.termsOfUse`, `about.support`, `about.openExternal`,
     `about.openMail`, `about.disclaimer`.

8. Removed in Sprint 6 + polish rounds — do NOT resurrect:

   - `settings.unitsUpcomingRelease` (removed when units became info-only).
   - `settings.showDataSource` (toggle deleted alongside the source-chip
     removal from the Crosswind result panel).
   - `about.aircraft`, `about.aircraftValue` (Aircraft row removed —
     variant lives in Crosswind Takeoff selector).
   - Any chart-related keys (no Crosswind chart exists in MVP).

9. Add unit test that loads both locale files and verifies all keys match
   between EN and RU in BOTH directions (no missing keys, no orphans).

10. Commit, push, PR with title "chore(i18n): comprehensive localization audit".

Manual testing:
"Open app in Expo Go:
1. In Settings, switch language to English. Walk through all screens
   (Splash → Disclaimer → Main Menu → Crosswind → Settings → About).
   Verify all UI text is in English (except aviation terms + module
   product names + disclaimer bodies, which are English in both locales).
2. Switch to Русский. Walk through all screens. Verify all UI text is in
   Russian, with the exemptions above remaining English.
3. Verify nothing shows as untranslated 'key.path' or [object Object].
4. Verify the parity unit test catches an artificial missing key (add a
   bogus key to en.json, run tests, confirm failure, then revert)."

# Definition of Done

- [ ] All hardcoded user-facing strings found and replaced.
- [ ] EN and RU locale files have matching keys (parity test passes
      in both directions).
- [ ] Aviation terms, aircraft variants, runway conditions, unit labels,
      and module product names remain English in both locales.
- [ ] Both disclaimer bodies (splash + about) remain fixed English.
- [ ] `react-native/no-raw-text` lint rule passes — gate.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with manual testing.

# When done

Report:
- Number of strings localized.
- Confirmation that ESLint `react-native/no-raw-text` passes.
- PR URL.
```

---

## После завершения

1. PR review через Expo Go: пройти все экраны на обоих языках.
2. Напишите `merge it` в чат Claude Code.
3. Следующий: `08-sprint-accessibility-audit.md`.
