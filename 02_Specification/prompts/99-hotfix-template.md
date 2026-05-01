# Template: Hotfix для production-бага

> **Когда использовать:** при обнаружении критичного бага в production (приложение в App Store).
>
> **Triage** перед использованием шаблона:
> 1. Если bug — это просто значения в JSON (например, нужно срочно поправить число) → используйте `99-update-data-template.md`.
> 2. Если bug — это код, но изменение не затрагивает Native modules → можно через EAS Update OTA (Phase 2+).
> 3. Если bug требует пересборки → этот шаблон + Expedited Review (см. ниже).

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement a hotfix for a critical production bug.

# Context

A critical bug was discovered in production. We need a minimal, focused fix
released to App Store as a PATCH version (e.g., 1.0.0 → 1.0.1).

# Bug description

<REPLACE THIS SECTION with concrete description of the bug:>
- What the user does:
- What they expect:
- What actually happens:
- When it started: (which version introduced it, if known)
- Reproducibility: (always / sometimes / hard-to-reproduce)
- Severity: (crash / wrong calculation / UX issue)

# Required reading

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/09-cicd-and-ops.md (section "Hotfix process")
- The relevant module-contract for the affected area.
- The most recent commits in main that might be related.

# Task

After reading and confirming you understand the bug:

1. Branch `fix/<short-description>` from main.

2. Implement the MINIMAL fix:
   - Do NOT refactor unrelated code.
   - Do NOT add new features.
   - Focus on the smallest change that fixes the issue.

3. Add a regression test that:
   - Fails BEFORE your fix.
   - Passes AFTER your fix.
   - This is critical to ensure the bug doesn't return.

4. Verify locally:
   - `npm run lint`, `typecheck`, `test` — all green.
   - Manually verify the bug is fixed (describe how I should reproduce).

5. Commit:
   - Conventional Commits format.
   - Example: `fix(crosswind): handle CG = 0 input correctly (regression test added)`.

6. Bump version: PATCH increment (1.0.0 → 1.0.1).
   - Update package.json and app.json.
   - Use `npm version patch -m "chore(release): bump to %s"`.

7. Push, create PR.

PR title: `fix(<scope>): <short description> [hotfix]`

PR body must include:
- Description of the bug.
- Description of the fix.
- Confirmation that regression test was added.
- "[Hotfix]" tag for visibility.

# When PR is approved and merged

Inform me to push the tag manually:
   ./scripts/release.sh patch

The release.yml workflow will then automatically build and submit to App Store
Connect.

For Apple Expedited Review (ускоренный ревью):
1. Login to App Store Connect.
2. App → App Store → Submission → "Expedited App Review Request".
3. Reason: "Critical bug affecting calculation accuracy" (or similar).
4. Submit. Apple reviews in hours instead of days.
   (Note: 1 expedited review per year is granted by Apple.)

# Definition of Done

- [ ] Minimal fix implemented (no scope creep).
- [ ] Regression test added.
- [ ] All quality gates green.
- [ ] Version bumped to PATCH.
- [ ] PR created with [Hotfix] tag.
- [ ] Manual testing instructions clearly written.
```

---

## После merge

1. На main выполните release-скрипт:
   ```bash
   ./scripts/release.sh patch
   ```
   (если Claude Code сам не выполнил его при merge через CI — это маловероятно для hotfix-ов, но проверьте).

2. На странице GitHub Actions дождитесь успешного `release.yml` workflow (~30 минут).

3. В App Store Connect:
   - TestFlight → новая сборка.
   - Если уверены в исправлении — сразу submit для Expedited Review.

4. Apple Expedited Review обычно занимает 2–24 часа (vs 1–7 дней для обычного review).

5. После approval — Manual release (один клик).
