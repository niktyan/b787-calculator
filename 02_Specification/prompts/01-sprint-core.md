# Prompt 01 · Sprint: Core module

> **Когда использовать:** после завершения Phase B (промпт 00). Это первый sprint реализации.
>
> **Что произойдёт:** Claude Code реализует модуль Core (i18n, theming, storage, disclaimer, feature-flags, logger, Result, coming-soon-modules) с тестами.
>
> **Ожидаемое время Claude Code:** 30–60 минут. Ваше активное время: 5 минут (review + merge).

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement the Core module per the specification.

# Required reading

Read these files in full before starting:

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/02-architecture.md
- 02_Specification/03-tech-stack.md
- 02_Specification/04-domain-model.md (sections on Result-pattern, Value Objects)
- 02_Specification/06-ui-spec.md (sections on Themes, Localization, Disclaimer)
- 02_Specification/08-quality-gates.md
- 02_Specification/module-contracts/core.md

After reading, summarize in 5–8 bullet points your understanding of:
- What submodules Core consists of.
- The public API per the contract.
- The architectural rules that must be respected.
- Quality gates that apply.

WAIT for my "go" before implementing.

# Task: implement Core module at src/core/

After my "go":

1. Create feature branch: `git checkout -b feat/core-module`.

2. Implement each submodule per `module-contracts/core.md`:
   - src/core/result/ — Result-pattern with ok/err/map/flatMap/unwrap
   - src/core/logger/ — logger with debug/info/warn/error, no-op in production
   - src/core/storage/ — type-safe AsyncStorage wrapper with zod validation
   - src/core/i18n/ — i18next setup with EN+RU locales (use placeholder strings,
     real translations come in later sprints)
   - src/core/theming/ — ThemeProvider, useTheme hook, design tokens stub
     (real tokens come in design-system sprint)
   - src/core/disclaimer/ — disclaimer state hook with persistence
   - src/core/feature-flags/ — simple in-memory flag store with hook
   - src/core/coming-soon-modules/ — JSON loader + hook, with placeholder data
     (real data filled when needed in main-menu sprint)

3. Create comprehensive unit tests for each submodule:
   - src/core/result/__tests__/Result.test.ts (cover all operations)
   - src/core/storage/__tests__/storage.test.ts
   - src/core/disclaimer/__tests__/state.test.ts
   - src/core/feature-flags/__tests__/flags.test.ts
   - src/core/logger/__tests__/logger.test.ts
   - src/core/i18n/__tests__/integration.test.ts
   - Coverage MUST be ≥ 80% for src/core/**.

4. Create barrel exports per `module-contracts/core.md`:
   - src/core/<submodule>/index.ts for each submodule.
   - src/core/index.ts as the main public API barrel.

5. Verify locally:
   - `npm run lint` — 0 errors.
   - `npm run typecheck` — 0 errors.
   - `npm run test -- --coverage` — passes, coverage ≥ 80%.

6. Commit using Conventional Commits (multiple commits OK, one per submodule):
   - feat(core): add Result pattern
   - feat(core): add logger
   - feat(core): add storage adapter
   - ...

7. Push branch: `git push origin feat/core-module`.

8. Create PR: `gh pr create --title "feat(core): initial Core module" --body-file [body]`.
   Body must follow .github/pull_request_template.md exactly, including:
   - Reference to 02_Specification/module-contracts/core.md.
   - Definition of Done checklist with all items checked.
   - Manual testing instructions: "No UI yet, only library code.
     Verification: review CI status, ensure all green checks."

# Definition of Done

- [ ] All required spec files read.
- [ ] All 8 submodules implemented per core.md contract.
- [ ] Public API matches the contract exactly.
- [ ] Unit tests for each submodule.
- [ ] `npm run lint` exits with 0 errors / 0 warnings.
- [ ] `npm run typecheck` exits with 0 errors.
- [ ] `npm run test` passes; coverage of src/core ≥ 80%.
- [ ] No analytics, ads, trackers, or forbidden libraries added.
- [ ] No `console.log` in non-test code.
- [ ] Conventional Commits used.
- [ ] Branch pushed to remote.
- [ ] PR created with all template sections filled.

# Hard constraints

- Domain code in core (Result, logger pure logic) MUST be pure TypeScript.
  No imports from react-native or expo in those modules.
- Hook-based modules (useTheme, useDisclaimerStatus, useFeatureFlag) CAN import
  from react-native (for hooks like useColorScheme).
- Storage MUST validate via zod. NEVER trust AsyncStorage values without validation.
- If you encounter ambiguity in the spec — STOP and ask. Do not assume.

# When done

Report:
1. Brief summary of submodules implemented (max 50 words).
2. Confirmation of all DoD items.
3. PR URL.
4. List of decisions made not explicitly in spec (if any) — these may need ADRs.
```

---

## После завершения

1. Откройте PR в браузере (Claude Code даст ссылку).
2. Убедитесь, что все CI checks зелёные.
3. Прочитайте описание PR — Claude должен указать «No UI in this sprint, only library code».
4. Approve и Squash Merge (через GitHub UI).
5. Перейдите к следующему промпту: `02-sprint-design-system.md`.
