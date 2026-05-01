# Prompt 05 · Sprint: Crosswind Module (главный)

> **Когда использовать:** после merge Main Menu.
>
> **Что произойдёт:** Claude Code реализует ПОЛНОСТЬЮ модуль Crosswind: domain, data, presentation, JSON-данные, тесты по таблице из спеки. Это главный модуль MVP.
>
> **Ожидаемое время Claude Code:** 90–150 минут. Ваше активное время: 10–15 минут (включая тщательный функциональный тест).

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code. Implement the Crosswind feature module.

This is the most important sprint. The accuracy of the algorithm and the
quality of tests directly impact whether real pilots can trust the app.
Do not take shortcuts.

# Required reading (READ ALL FILES IN FULL)

- CLAUDE.md
- 02_Specification/AGENTS.md
- 02_Specification/02-architecture.md
- 02_Specification/04-domain-model.md (FULL, especially Value Objects + JSON schema)
- 02_Specification/05-crosswind-algorithm.md (FULL, especially the test table)
- 02_Specification/06-ui-spec.md (section "Экран 4 · Crosswind Calculator")
- 02_Specification/08-quality-gates.md
- 02_Specification/ADR/0003-bundled-json-with-explicit-versioning.md
- 02_Specification/module-contracts/crosswind.md

After reading, summarize:
- The algorithm in 5 bullet points.
- The 5 test sets and their purposes.
- The 3 "Excel-equivalent" peculiarities you must replicate exactly.
- The Value Objects and their validation rules.

WAIT for "go".

# Task

After my "go":

1. Branch `feat/crosswind-module`.

2. Implement domain layer first (TDD-friendly):

   src/features/crosswind/domain/types.ts:
   - All types from `04-domain-model.md`: AircraftVariant, FlightPhase,
     RunwayCondition, RunwayConditionCode, CrosswindCalculationInput,
     CrosswindCalculationOutput, CalculationMetadata, CrosswindCalculationError.

   src/features/crosswind/domain/valueObjects.ts:
   - Branded types: WeightInTons, CGPercentMAC, CrosswindKnots.
   - Factory functions with envelope validation, returning Result.

   src/features/crosswind/domain/validators.ts:
   - Input validation per `04-domain-model.md` step 0.

   src/features/crosswind/domain/strategies.ts:
   - Implementation of 'piecewise-linear-excel-equivalent' as a pure function.
   - EXACTLY replicate the Excel formula behavior including:
     * IFNA-fallback to 40 when XLOOKUP misses.
     * Math.floor for ROUNDDOWN equivalent.
     * Discontinuity at bracket boundaries (do not "fix" the math).

   src/features/crosswind/domain/calculator.ts:
   - Main calculateCrosswindLimit function.
   - Validates input, dispatches to strategy by data.interpolation.model.
   - Returns Result<Output, Error>.

3. Implement data layer:

   src/features/crosswind/data/schema.ts:
   - Full zod schema per `04-domain-model.md` section "zod-схема валидации".
   - Plus business-rule validations (sorted breakpoints, file-name consistency).

   src/features/crosswind/data/b787-8-landing-dry.json:
   - Complete file per `04-domain-model.md` section "JSON Schema bundled данных".
   - Use the canonical envelope values from spec: weight 110-172 t, CG 8-35 %MAC.
   - dataVersion: today's date.
   - referenceDocument: "Boeing 787 FCOM".

   src/features/crosswind/data/crosswindRepository.ts:
   - Loads JSON, validates via zod, returns parsed data or CorruptedDataBundle error.
   - Memoizes the loaded data.

4. Implement presentation layer:

   src/features/crosswind/presentation/CrosswindScreen.tsx:
   - Layout per `06-ui-spec.md`:
     * iPad landscape: 2 columns (input | result).
     * iPad portrait / iPhone: stacked vertically.
   - Header with BackButton and Reset button.
   - Empty fields by default with placeholders ("e.g. 170", "e.g. 25.5").
   - Live recalculation when both fields filled.
   - Source chip "Reference: 787 FCOM" on result.
   - Localized labels (RU + EN).

   src/features/crosswind/presentation/components/CrosswindInputForm.tsx:
   - NumericInput for weight (kg, integer).
   - NumericInput for CG (% MAC, decimal 1 digit).
   - SegmentedControl for runway condition (Dry active, Wet/Cont disabled).
   - Validation: red border + error text on out-of-envelope.

   src/features/crosswind/presentation/components/CrosswindResult.tsx:
   - Uses ResultPanel from design-system.
   - States: empty, idle, error, out-of-envelope.

   src/features/crosswind/presentation/useCrosswindCalculator.ts:
   - View-model hook orchestrating input state, validation, calculation,
     and result-state.

5. Implement comprehensive tests:

   src/features/crosswind/__tests__/calculator.test.ts:
   - ONE test per row in Test Set #1 (24 cases for W=170).
   - ONE test per row in Test Set #2 (10 cases for W=130).
   - ONE test per row in Test Set #3 (7 cases for W=160).
   - Use exact expected values from the spec table. Do not adjust.
   - Use describe-it structure: describe per weight, it per CG.

   src/features/crosswind/__tests__/validators.test.ts:
   - All 7 cases from Test Set #4 (out-of-envelope).

   src/features/crosswind/__tests__/repository.test.ts:
   - All 5 cases from Test Set #5 (corrupted data).

   src/features/crosswind/__tests__/acceptance.test.ts:
   - End-to-end: load repository → calculate → verify metadata.

   Coverage MUST be ≥ 90% for src/features/crosswind/domain/**.

6. Update Main Menu navigation:
   - Replace placeholder src/app/(main)/crosswind.tsx with re-export of
     CrosswindScreen from src/features/crosswind.

7. Verify everything:
   - `npm run lint` — 0 errors.
   - `npm run typecheck` — 0 errors.
   - `npm run test` — ALL tests pass. Coverage thresholds met.

8. Commit, push, PR.

PR title: "feat(crosswind): Crosswind Landing module for B787-8 Dry runway"

Manual testing in PR:
"Open preview build, navigate to Crosswind from Main Menu. Verify:
1. Both input fields are EMPTY by default with placeholders.
2. Result panel shows 'Enter weight and CG to see result'.
3. Enter W=170, CG=32. Result should be exactly 34 KT.
4. Try W=170, CG=20 (below envelope). Should show error 'Below minimum 8 %MAC'
   or similar (depending on validation order).
5. Try W=170, CG=42 (above all breakpoints). Should show 40 KT (Excel quirk).
6. Reset button clears both fields.
7. Light and dark themes both work.
8. Layout works on portrait/landscape and on iPhone (stacked) vs iPad (2-col).
9. Source chip 'Reference: 787 FCOM' is visible on result."

# Definition of Done

- [ ] All required spec files read.
- [ ] Domain layer fully implemented per types and algorithm spec.
- [ ] Data layer with valid JSON and zod validation.
- [ ] Presentation layer with all UI states.
- [ ] All test sets implemented (50+ test cases). Each row in spec table is one test.
- [ ] Tests for validators (7 cases) and repository (5 cases).
- [ ] Domain coverage ≥ 90%, total ≥ 80%.
- [ ] Excel-equivalent quirks replicated (IFNA-fallback, discontinuity).
- [ ] `npm run lint/typecheck/test` all green.
- [ ] PR with detailed testing instructions.

# Hard constraints (CRITICAL FOR ALGORITHM CORRECTNESS)

- The algorithm MUST exactly match the Excel formula behavior. Especially:
  * Above-envelope (CG > all thresholds) returns 40 KT, NOT a calculated value.
  * Discontinuity at bracket boundaries is intentional.
  * Use Math.floor for ROUNDDOWN.
- Test expected values come EXACTLY from the spec table. Do not "adjust" them
  even if they seem off — the spec is the source of truth.
- Domain code MUST be pure TypeScript (no React Native imports).
- All numbers in code that come from JSON must be Value Objects (not raw numbers).

# When done

Report:
1. Number of test cases passing.
2. Domain coverage %.
3. Confirmation that Excel-quirk above-envelope test (case 1.23, 1.24, 2.10) returns 40.
4. Confirmation that boundary discontinuity test (1.09 vs 1.10) shows 37 → 35.
5. PR URL.
```

---

## После завершения — обязательная тщательная проверка

Этот sprint — самый критичный. Не торопитесь с merge:

1. Откройте PR, дождитесь зелёного CI.
2. Откройте preview build на iPhone через Expo Go.
3. Пройдите ВСЕ 9 пунктов manual testing из PR описания.
4. Дополнительно проверьте по тест-таблице из `05-crosswind-algorithm.md`:
   - W=170, CG=32 → 34 KT (тест-кейс 1.12, видео).
   - W=170, CG=42 → 40 KT (Excel quirk, тест-кейс 1.23).
   - W=130, CG=27 → 34 KT (тест-кейс 2.06).
5. Если что-то не сходится с ожидаемым — оставьте комментарий в PR, попросите Claude Code исправить.
6. Если всё ОК — Approve + Merge.
7. Следующий промпт: `06-sprint-settings-about.md`.
