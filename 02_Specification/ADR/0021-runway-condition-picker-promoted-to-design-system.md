# ADR-0021 · RunwayConditionPicker promoted to design-system; Takeoff adopts the dropdown

**Status:** Accepted
**Date:** 2026-06-11
**Related:**
`02_Specification/ADR/0018-landing-runway-condition-taxonomy-v2.md` (§ UI Layout — picker pattern, hybrid presentation),
`02_Specification/ADR/0011-custom-numeric-keypad-eliminates-ios-system-keyboard.md` (anchored-popover math),
`02_Specification/module-contracts/design-system.md`,
`02_Specification/module-contracts/crosswind.md`,
`02_Specification/module-contracts/crosswind-landing.md`,
`src/design-system/components/RunwayConditionPicker/`,
`src/features/crosswind/presentation/components/CrosswindInputForm.tsx`.

## Context

Sprint F2 (ADR-0018 § UI Layout) replaced the Landing runway-condition
segmented control with a single-line dropdown picker: closed field +
option sheet, presented as an anchored popover on iPad landscape and a
centred fade-in modal everywhere else. The pattern proved itself with
the 7-option Landing taxonomy.

The Takeoff form still used a 6-segment `SegmentedControl` that wrapped
to 2 ragged rows of 3 on compact widths — the same visual problem that
motivated the Landing dropdown. Sprint G / PR G2 brings the same UX to
Takeoff.

The picker, however, lived inside `features/crosswind-landing/`.
Architecture rule 3 (02-architecture.md) forbids feature → feature
imports, so Takeoff could not consume it from there. Two options:

- **(A)** Promote the picker to `src/design-system/` as a generic
  primitive.
- **(B)** Let `features/crosswind` import from
  `features/crosswind-landing` — an architecture violation.

## Decision

1. **Promote to design-system (option A).** The picker moves to
   `src/design-system/components/RunwayConditionPicker/` (component,
   `.parts`, `.sizing`, anchored + sheet presentation branches,
   co-located tests and snapshots). It is exported from the
   design-system barrel as `RunwayConditionPicker` /
   `RunwayConditionPickerProps`.

   The component was already generic on `TValue extends string` and
   consumed an `options: readonly SegmentedControlOption<TValue>[]`
   array — no Landing types or option lists lived inside it. The
   consumer always supplies the taxonomy: Landing passes its 7-value
   `LandingRunwayCondition` list, Takeoff its 6-value `RunwayCondition`
   list (no Good split for takeoff — the AFM split is landing-only,
   per ADR-0018 § Decision 7).

2. **Takeoff adopts the picker.** `CrosswindInputForm` renders
   `RunwayConditionPicker<RunwayCondition>` with the existing 6-option
   `RUNWAY_OPTIONS` in unchanged order (Dry / Good / Medium to Good /
   Medium / Medium to Poor / Poor). The `wrap` plumbing
   (`runwayWrap` in `resolveSizing`) is removed from the form; the
   `SegmentedControl` `wrap` prop itself stays in design-system.
   Defaults are untouched: initial and Reset value remain `dry`.
   Domain types and `b787-takeoff.json` are untouched.

3. **Hybrid presentation is shared, no Takeoff-specific branch.** The
   resolution rule stays inside the picker
   (`width >= breakpoints.regular && width > height` → anchored;
   otherwise centred modal). Both calculator screens use the same
   2-column layout at ≥ 1024 pt landscape, so the anchored popover
   lands over the result column identically on both. The popover is
   `measureInWindow`-anchored, so screen layout does not constrain it.

4. **Popover height derives from the option count.** The anchored
   surface height was a fixed 560 pt sized for Landing's 7 rows;
   `AnchoredPopoverHost` renders `contentSize.height` verbatim, so 6
   takeoff rows would have left a ~70 pt dead strip. The height is now
   computed as `chrome + options.length × rowMinHeight + buffer`,
   which reproduces exactly 560 pt for 7 regular rows (Landing renders
   pixel-identically) and 488 pt for 6.

5. **Sheet title / dismiss strings move to a component-scoped i18n
   namespace.** `crosswind-landing.runwayConditionSheetTitle` /
   `runwayConditionSheetCancel` become `runwayPicker.sheetTitle` /
   `runwayPicker.sheetCancel` (values unchanged in both locales,
   including the localized RU sheet title — it is a UI label, not an
   aviation term). Rationale: a design-system component must not
   reference a feature-named i18n namespace (precedent: the numeric
   keypad's `keypad.*` namespace). Option labels remain English in
   both locales per AGENTS.md Rule 9 — they are aviation terms.

## Consequences

**Positive:**

- One selection idiom for runway condition across Takeoff and Landing;
  the compact-width 2×3 segmented wrap (uneven button widths) is gone.
- The picker is now a documented design-system primitive available to
  future modules without further moves.
- Generic popover height removes the silent Landing-row-count coupling.

**Negative / trade-offs:**

- Selecting a takeoff runway condition now takes two taps instead of
  one. Accepted for parity with Landing and the same readability
  rationale as ADR-0018 § UI Layout.
- Screen-level tests that pressed individual segments
  (`crosswind-runway-<value>`) now drive the two-tap picker flow; the
  per-segment "is enabled" guards (PR 3–7) are superseded by a single
  "all 6 options render in the sheet" assertion plus the existing
  per-condition anchor-value tests.

**Neutral:**

- `features/crosswind-landing` no longer contains presentation code
  for the picker; its form imports the component from the
  design-system barrel like any other primitive.

## Alternatives considered

- **Cross-feature import (option B).** Rejected: violates
  02-architecture.md dependency rule 3; ESLint `no-restricted-paths`
  zones aside, it would normalise feature coupling for every future
  consumer.
- **Duplicate the picker inside `features/crosswind`.** Rejected:
  ~500 lines of copied presentation code and two divergent
  implementations of the same control.
- **Keep the `crosswind-landing.*` i18n keys inside the promoted
  component.** Rejected: design-system referencing a feature namespace
  is the same coupling smell in string form; the `keypad.*` precedent
  already established component-scoped namespaces.
- **Keep the fixed 560 pt popover height.** Rejected: visibly wrong
  (dead strip) for any consumer with fewer than 7 options.
