# ADR-0012 · Hide crosswind result on operational envelope violation

**Status:** Accepted
**Date:** 2026-05-23
**Related:** `02_Specification/04-domain-model.md` § «Two distinct envelope concepts» / Composition rule,
`02_Specification/06-ui-spec.md` § Экран 4 → Result panel,
`02_Specification/07-app-store-compliance.md` § Стратегия прохождения,
`02_Specification/module-contracts/crosswind.md` § Эволюция модуля,
`src/features/crosswind/presentation/useCrosswindCalculator.ts`,
`src/features/crosswind/presentation/components/CrosswindResult.tsx`

## Context

Pre-ADR-0012 behaviour (defined in the first revision of
`04-domain-model.md` § Composition rule, codified through PRs A1/A2):
when the pilot entered weight or CG outside the operational envelope
(FCOM regulatory limits), the view-model still called
`calculateCrosswindLimit` because the operational envelope is wider
than the lookup envelope. The resulting number was rendered with a
warning chip "Outside operational envelope — advisory only"
underneath.

That behaviour was chosen early on the assumption that (a) the pilot
always sees a number, (b) the chip provides an explicit warning, and
(c) the app's "advisory only" positioning already implies pilot
caution. User testing during PR A1–A2 revealed three problems:

1. **Safety risk.** In cockpit conditions (time pressure, limited
   space, sometimes-reduced lighting) a small chip is visually less
   prominent than the large display number. A pilot scanning quickly
   may register the number and miss the chip. Applying an "advisory"
   limit derived from out-of-spec inputs creates a false sense of
   precision.

2. **Apple Guideline 4.2 (Minimum Functionality) / 1.4 (Physical
   Harm) positioning.** The app's App Review defence positions itself
   as a "conservative advisory tool, validated with active line
   pilots" (см. `07-app-store-compliance.md` § Стратегия прохождения).
   Rendering a number when our own validator says "out of envelope"
   contradicts that positioning — the app should decline to compute
   when inputs are outside published FCOM ranges, mirroring how FCOM
   itself would refuse to provide values outside published ranges.

3. **UX consistency.** Other "no result" cases (`out-of-envelope` from
   `NoLookupData`, `data-not-available` from non-implemented
   combinations) already do not show a number — the pilot sees an
   explicit caption. Operational-envelope violations should follow the
   same pattern.

## Decision

When either field is outside the operational envelope, the
view-model **skips the calculator entirely** and returns the
`out-of-envelope` state with the localized reason "Out of operational
envelope — adjust inputs". The result panel renders the caption + info
icon with no number.

Field-level errors (per-field warn-colored caption under each input)
remain in place — they surface the specific axis violated (for
example, "Above maximum 227.93 t" under TOW). The result panel's
caption is the generic "Out of operational envelope" message, not a
duplicate of the per-field details.

Warning-chip rendering is removed from `CrosswindResult.tsx`
entirely. The `warning` field is removed from the `idle` state type.
The calculator is skipped (not just hidden) when the envelope is
violated — this is cleaner than computing-then-hiding and saves a
strategy dispatch on every keystroke while the form is in an invalid
state.

## Consequences

**Positive:**

- **Safety.** The pilot never sees a number derived from out-of-spec
  inputs. The risk of acting on an advisory value built from inputs
  outside FCOM published ranges is eliminated.
- **App Store 4.2 / 1.4 positioning reinforced.** The app's behaviour
  matches its "conservative advisory" defence: the app declines to
  produce a value when inputs are out of envelope, the same way FCOM
  itself would refuse to publish values outside its tabulated ranges.
- **UX consistency.** Same state pattern for all "no result" cases —
  one explicit message style, no partial / qualified values.
- **Code simplification.** `idle` state has fewer fields;
  `CrosswindResult.IdleView` has fewer branches; one less rendering
  path. The view-model loses the `warning` chip plumbing and the
  related i18n key.

**Negative:**

- **Loss of "peek" capability.** Pilots could previously see what
  the algorithm would produce just outside the envelope, useful for
  "what if" exploration. That capability is now gone. Acceptable
  trade-off — the app's role is operational reference, not
  exploratory tooling. Pilots wanting to explore the algorithm can
  do so on the bench, not in the cockpit.
- **Breaking spec change.** `04-domain-model.md` Composition rule
  collapsed from four cases to three. Integration tests touching
  idle+warning scenarios needed updates. No public-API contract
  change — the rewrite is internal to the view-model + result
  component.

## Implementation summary

- `useCrosswindCalculator.compute` checks envelope violation before
  calling `calculateCrosswindLimit`. On violation it returns
  `{ kind: 'out-of-envelope', reason: t('crosswind.outOfOperationalEnvelope') }`.
- `CrosswindUIState.idle` shrinks from
  `{ kind, output, warning }` to `{ kind, output }`.
- `CrosswindResult.IdleView` loses its `warning` / `warningText`
  props and the warning-chip rendering block. `styles.warningChip`
  removed. `EnvelopeViolation` import removed from CrosswindResult
  and from the view-model.
- `crosswind-warning-chip` testID is no longer emitted anywhere.
- i18n: new key `crosswind.outOfOperationalEnvelope` (EN + RU). The
  no-longer-referenced `crosswind.warningOutsideEnvelope` is
  removed from both locale files.
- Tests updated to assert `out-of-envelope` state for any envelope
  violation; new ADR-0012 matrix added covering every axis ×
  direction combination plus correct-one-axis and full-clean
  transitions.

## Relationship to other decisions

- Builds on PR A2 (`fix/independent-envelope-validators`, merged
  2026-05-23) which split `validateOperationalEnvelope` into
  independent weight + CG validators. ADR-0012 consumes both
  violation streams to decide hide/show.
- Reuses the existing `out-of-envelope` UI state that already
  served `NoLookupData` (algorithm-level lookup miss). ADR-0012
  adds a second entry path to the same state — both paths render
  identically (caption + icon), only the reason string differs.
- Does NOT affect ADR-0011 (custom in-app keypad) or any decisions
  about input mechanics, validators, or the calculator itself.

## Alternatives considered

**(a) Keep the chip but make it more prominent (e.g., red, larger
font, replacing the number visually).** Rejected. A chip "next to"
the number is still a number-first display by visual hierarchy; any
visual treatment short of replacing the number entirely is
susceptible to the same cockpit-scan miss that motivated this ADR.

**(b) Show the number plus a full-card warning overlay.** Rejected
for the same reason — if the number is anywhere on the surface, the
pilot can read it before the overlay registers. Hiding the number is
the only treatment that physically removes the safety risk.

**(c) Compute the number and stash it in metadata for telemetry /
debugging.** Rejected. No telemetry by Rule 7 (Privacy), and the
"peek" capability isn't worth the dead code path. Domain unit tests
in `calculator.test.ts` already pin the algorithm's behaviour for
all relevant inputs, including those outside the operational
envelope — that's the right layer for capability verification.

**(d) Make the threshold configurable (e.g., expose a Settings
toggle "show advisory results outside envelope").** Rejected.
Settings options that affect safety-critical UI are themselves a
safety hazard — pilots inherit their employer's iPad / device
preset and may not realize the toggle was flipped. The safety
decision is global.
