# Template: Обновление опорных значений в bundled JSON

> **Когда использовать:** при необходимости обновить операционные значения (slope, intercepts, envelope, etc.) в `b787-8-landing-dry.json` без изменения кода.
>
> Например: если уточняется значение какого-то C-коэффициента, или меняются границы envelope.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Update bundled crosswind reference data.

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/04-domain-model.md (section "Правила инкремента dataVersion")
- 02_Specification/05-crosswind-algorithm.md (full, including test table)
- 02_Specification/module-contracts/crosswind.md

# Data update request

<REPLACE THIS SECTION with concrete change request:>

Example of fully filled request:

  Update b787-8-landing-dry.json:
  - Change intercept for 35 KT breakpoint from 9.3 to 9.4.
  - Reason: revised operational practice based on additional pilot feedback.
  - All other values remain unchanged.
  - Update referenceDocument metadata to "Boeing 787 FCOM (rev 2026-09)".

# Task

After reading and confirming the data update request:

1. Branch `chore/data-update-<date>`.

2. Update src/features/crosswind/data/b787-8-landing-dry.json:
   - Apply the requested change(s).
   - Bump dataVersion (e.g., "2026-04-29.001" → "2026-09-15.001" — date of update + counter).
   - Update metadata.notes if relevant.
   - Do NOT change schemaVersion (structure unchanged).

3. Recalculate the test table in 02_Specification/05-crosswind-algorithm.md:
   - For each affected weight set (#1, #2, #3), recalculate expected values
     using the new intercept(s).
   - Update the table inline.

4. Update the corresponding tests in
   src/features/crosswind/__tests__/calculator.test.ts:
   - For each affected test case, update the expected value to match the
     newly recalculated number from the spec.

5. Run tests:
   - `npm run test` — all updated tests should pass.
   - If any test fails — that means there's a discrepancy between the new
     JSON values and the new test expectations. Diagnose and fix.

6. Verify quality gates: lint, typecheck, test — all green.

7. Commit. Conventional commit format:
   `chore(data): update crosswind values to <new-dataVersion>`

8. Push, create PR.

PR title: `chore(data): update crosswind reference values to <new-dataVersion>`

PR body must include:
- The exact change(s) made.
- The reason for the change.
- Confirmation that test table in spec was recalculated.
- Confirmation that unit tests were updated to match.

Manual testing instructions:
"Open preview build in Expo Go. Navigate to Crosswind. Test these inputs:
1. W=170, CG=32 — expected NEW value: <recalculated>.
2. W=130, CG=27 — expected NEW value: <recalculated>.
3. (Add 2-3 more covering different brackets.)
Verify the displayed result matches the new expected values."

# Definition of Done

- [ ] JSON updated with new values.
- [ ] dataVersion bumped per `04-domain-model.md` rules.
- [ ] schemaVersion NOT changed (structure unchanged).
- [ ] Test table in 05-crosswind-algorithm.md recalculated for all affected cases.
- [ ] Unit tests updated with new expected values.
- [ ] All tests pass.
- [ ] PR with clear before/after summary.
```

---

## После merge

Если изменение касается только данных и хотим быстро доставить в production без App Store update:

**Опция 1 · Через App Store update** (стандартный путь):
```bash
./scripts/release.sh patch
```
Дальше release workflow собирает и сабмитит. Apple review 1-7 дней.

**Опция 2 · Через EAS Update** (быстрее, но требует Phase 2+ настройки):
```bash
npx eas update --branch production --message "Update crosswind values to <dataVersion>"
```
Изменения доходят до пользователей в течение часов после установки приложения.

OTA-обновление возможно ТОЛЬКО если `schemaVersion` не менялся (структура совместима с уже опубликованным кодом). Если структура меняется — обязательно App Store update.
