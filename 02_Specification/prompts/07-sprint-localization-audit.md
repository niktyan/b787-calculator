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
   - No leftover hardcoded user-facing strings (after audit).
   - The eslint-plugin-react-native rule `no-raw-text` should pass with no exceptions.

5. Validate translations:
   - Check Russian translations make sense (not literal machine translation).
   - Aviation terms (KT, MAC, RWYCC) NOT translated — they remain English.
   - Disclaimer body text in app/disclaimer.tsx remains FIXED ENGLISH (per spec).

6. Add unit test that loads both locale files and verifies all keys match
   between EN and RU (no missing keys in either direction).

7. Commit, push, PR with title "chore(i18n): comprehensive localization audit".

Manual testing:
"Open app in Expo Go:
1. In Settings, switch language to English. Walk through all screens
   (Splash → Disclaimer → Main Menu → Crosswind → Settings → About).
   Verify all UI text is in English (except aviation terms).
2. Switch to Русский. Walk through all screens. Verify all UI text is in Russian
   (except aviation terms which remain English).
3. Verify nothing shows as untranslated 'key.path' or [object Object]."

# Definition of Done

- [ ] All hardcoded user-facing strings found and replaced.
- [ ] EN and RU locale files have matching keys (parity test passes).
- [ ] Aviation terms remain English.
- [ ] Disclaimer body remains fixed English.
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with manual testing.

# When done

Report:
- Number of strings localized.
- Confirmation that ESLint no-raw-text passes.
- PR URL.
```

---

## После завершения

1. PR review через Expo Go: пройти все экраны на обоих языках.
2. Approve + Merge.
3. Следующий: `08-sprint-accessibility-audit.md`.
