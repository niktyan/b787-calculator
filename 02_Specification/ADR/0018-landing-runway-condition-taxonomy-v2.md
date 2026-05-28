# ADR-0018 · Landing runway condition taxonomy v2 (Good split)

**Status:** Accepted
**Date:** 2026-05-28
**Related:**
`02_Specification/ADR/0014-landing-module-architecture.md`,
`02_Specification/module-contracts/crosswind-landing.md`,
`02_Specification/04-domain-model.md`,
`src/core/aviation/types.ts`,
`src/features/crosswind-landing/domain/types.ts`,
`src/features/crosswind-landing/data/b787-landing.json`,
`src/features/crosswind-landing/data/schema.ts`,
`src/features/crosswind-landing/presentation/components/CrosswindLandingInputForm.tsx`.

## Context

Sprint C (ADR-0014) shipped the Landing module with the same six
runway-condition categories that the Takeoff module uses:
`dry`, `good`, `mediumToGood`, `medium`, `mediumToPoor`, `poor`.

Curator review of the Landing (2).xlsx "Data" sheet, cross-checked
against the Boeing 787 AFM Rev. 20 "MAXIMUM CROSS WIND FOR LANDING"
table, surfaced that the AFM **splits the old single `Good` category
into two distinct landing conditions**:

1. **Good (Wet, Damp).** Surface contamination by water — the AFM
   permits the full Dry crosswind limit for B787-8 and B787-9
   (37 / 33 KT manual / auto for B787-8; 37 / 28 KT for B787-9).
2. **Good (Slush, Dry Snow, Wet Snow).** Surface contamination by
   loose contaminants — the AFM lowers the manual limit to 35 KT
   for both aircraft while keeping autoland unchanged from the
   previous `Good` row.

The single `good` row in `b787-landing.json` carried the
slush/dry-snow values for both aircraft, so users selecting Good for
a wet runway were getting a *more conservative than necessary*
advisory limit. AFM Rev. 20 is the operational source of truth and
intentionally distinguishes the two surfaces — the bundled data must
mirror that distinction.

The same review also confirmed that the *takeoff* table does **not**
split Good. The Boeing 787 FCOM takeoff crosswind table treats Wet
and contaminated-runway crosswind limits via a different mechanism
(operational envelope reduction, not a per-row split) and the
operational data flow already in production for takeoff is correct.
Therefore the split is **landing-only**.

## Decision

1. **Introduce a landing-specific runway-condition taxonomy** with
   seven categories, in this order (also the UI render order):

   1. `dry`
   2. `goodWetDamp`            — Good (Wet, Damp)
   3. `goodSlushSnow`          — Good (Slush, Dry Snow, Wet Snow)
   4. `goodToMedium`           — Good to Medium
   5. `medium`
   6. `mediumToPoor`
   7. `poor`

   This taxonomy lives in `core/aviation/types.ts` as
   `LANDING_RUNWAY_CONDITIONS` / `LandingRunwayCondition`, alongside
   the existing 6-value `RUNWAY_CONDITIONS` / `RunwayCondition` that
   the takeoff module continues to consume. The two unions are kept
   distinct on purpose — they describe physically different lookup
   tables and conflating them would re-introduce the bug this ADR
   fixes.

2. **Per-aircraft × per-mode crosswind values** (knots) for the new
   table, sourced from Landing (2).xlsx "Data" sheet and the AFM
   Rev. 20 "MAXIMUM CROSS WIND FOR LANDING" table:

   | Condition                          | 787-8 MAN | 787-8 AUTO | 787-9 MAN | 787-9 AUTO |
   |------------------------------------|-----------|------------|-----------|------------|
   | Dry                                | 37        | 33         | 37        | 28         |
   | Good (Wet, Damp)                   | 37        | 33         | 37        | 28         |
   | Good (Slush, Dry Snow, Wet Snow)   | 35        | 33         | 35        | 28         |
   | Good to Medium                     | 35        | 33         | 35        | 28         |
   | Medium                             | 35        | 33         | 25        | 25         |
   | Medium to Poor                     | 20        | 20         | 17        | 17         |
   | Poor                               | 17        | 17         | 15        | 15         |

   These 28 anchor values are covered by the
   `__tests__/acceptance.test.ts` matrix.

3. **Schema bump 2.3.0 → 2.4.0** for `b787-landing.json`. The change
   is breaking: the `good` key is removed and replaced with
   `goodWetDamp` and `goodSlushSnow`; `mediumToGood` is renamed to
   `goodToMedium` to follow the AFM phrasing (`Good to Medium`).
   No formal migration is performed — the bundle is shipped with the
   app binary, so every install carries the matching schema.

4. **Default screen state stays `dry`** (Sprint C carryover).
   Rationale: `dry` is the most common operational case for line
   pilots and provides the simplest, lowest-cognitive-load starting
   state. The Reset action restores `dry` too — Reset is intended for
   fast cleanup, not safety-defaulting.

   An interim F2 follow-up briefly set the default to `goodWetDamp`
   (commit `302f521`, justified as "most conservative MANUAL = 37 KT
   non-Dry"); the user explicitly overrode that decision in F2 visual
   fix v2 because the dropdown picker now makes the default visible
   in the closed-state field, and showing `Good (Wet, Damp)` as the
   first thing on screen was confusing for the typical Dry-runway
   case. The `goodWetDamp` value is **retained as the legacy-`good`
   fallback** only — `useRestoreFromRecent` maps a persisted v1
   `'good'` entry to `'goodWetDamp'` when restoring inputs from a
   pre-2.4.0 Recent Calculations entry (most permissive of the two
   Good splits; preserves the user's prior expectation).

5. **Recent Calculations — non-destructive legacy fallback.**
   Persisted entries with the old `good` or `mediumToGood` keys
   continue to deserialize and display in the Recent list (their
   schema accepts both old and new keys for landing entries). They
   are labelled `Good (legacy)` and `Medium to Good (legacy)` in
   the UI so users can recognise that the value comes from the
   previous taxonomy. When restoring such an entry back into the
   calculator screen, the legacy keys map to:
   - `good` → `goodWetDamp` (most permissive of the two splits)
   - `mediumToGood` → `goodToMedium` (a pure rename, no information
     loss).
   The alternative — wiping legacy entries silently on first launch
   after upgrade — was rejected because it destroys user-visible
   history without consent.

6. **UI label policy preserved.** Per AGENTS.md Rule 9 and the
   landing module contract, runway-condition labels remain English
   in both RU and EN locales. They are aviation terms, not localized
   strings. The labels are:
   `Dry`, `Good (Wet, Damp)`, `Good (Slush, Dry Snow, Wet Snow)`,
   `Good to Medium`, `Medium`, `Medium to Poor`, `Poor`.

7. **Takeoff is untouched.** The shared `RunwayCondition` type and
   the `b787-takeoff.json` data file are not modified. The two
   modules now legitimately diverge in their runway-condition
   vocabulary because the source AFM tables themselves diverge.

## UI Layout

The 7 runway-condition labels vary roughly 4× in length — from a
3-character `Dry` to the 32-character `Good (Slush, Dry Snow, Wet
Snow)`. Two earlier attempts at a flat horizontal layout failed:

1. **Flexible `SegmentedControl` with wrap=true** (initial Sprint F2
   commit). Buttons reflowed by flex so widths became visibly uneven;
   on iPad landscape the long Slush/Snow row dominated the track and
   the surrounding buttons looked pinched. User feedback:
   "растянуто, несуразно, неэстетично".
2. **4 × 2 fixed grid with an invisible spacer cell** (F2 visual fix
   v1, commit on this branch later reverted). Equal-width cells in
   theory; in practice the selected-button background highlight made
   the cell appear visually wider than its inactive siblings, and the
   3 + 3 + 1 row distribution read as ragged.

**Adopted pattern: single-line dropdown + bottom-sheet modal**, inspired
by the Boeing Onboard Performance Tool COND control.

- **Closed state.** A full-width `Pressable` field shows the current
  selection's label + a trailing `chevron-down` Ionicons glyph. The
  field mimics the `NumericInput` row's border / radius / padding /
  height (`tokens.layout.runwayPicker.field*`), so the runway-condition
  row visually aligns with the other input fields in the column.
- **Open state.** Tapping the field fires a light haptic and opens a
  `BottomSheet` modal (the same primitive Settings → Language / Theme
  use). The sheet lists all 7 options vertically as full-width
  `PickerRow` cells with a divider between rows. The active row's
  label is `accentText` colour with a trailing `✓` glyph. A Cancel
  button at the bottom dismisses the sheet without mutating the
  value. Tapping the backdrop or the system back-gesture also
  dismisses.
- **Accessibility.** Closed field: `role="button"`,
  `accessibilityState.expanded` mirrors `isOpen`, `accessibilityValue.text`
  is the current label. Sheet wrapper: `role="radiogroup"`. Each row:
  `role="radio"` + `accessibilityState.selected`. VoiceOver announces
  the current label inside the field and the selection state of each
  row inside the sheet.
- **Tokens.** All spacing / radius / max-width values live under
  `tokens.layout.runwayPicker` — no magic numbers in the component.
- **No new dependencies.** `BottomSheet` and `Ionicons` are already
  shipped. The picker uses the React Native `Modal` indirectly via
  `BottomSheet` — no `@gorhom/bottom-sheet`, no `react-native-picker`,
  no UIPickerView wheel.

The dropdown gives every option the same vertical real-estate at full
text length; horizontal-width compromises are eliminated because the
sheet uses the natural single-line width of each label. The pattern is
also familiar from iOS Settings, so pilots do not need to learn a new
selection idiom.

## Consequences

**Positive:**

- Landing crosswind limits now align with AFM Rev. 20 for wet runways
  (previously the user got a 35 KT manual cap for any "Good" surface,
  even clean wet — the AFM allows 37 KT in that case).
- The two distinct runway taxonomies (takeoff 6, landing 7) match
  their source tables faithfully. No more shared-type ambiguity for
  future contributors.
- Recent Calculations history survives the schema bump without data
  loss.

**Negative / trade-offs:**

- The runway-condition row is now a dropdown (one extra tap to change
  the selection vs. a segmented control). The trade-off was accepted
  because the alternative layouts produced visibly uneven button
  widths (see § UI Layout); a familiar dropdown is preferable to a
  ragged segmented row.
- A small amount of legacy-fallback code (label resolver, restore
  mapper) lives in the codebase indefinitely. Acceptable cost vs.
  silently wiping user data.
- The takeoff and landing types are no longer one-to-one. A future
  module that needs to reason about both phases must explicitly
  bridge `RunwayCondition` ↔ `LandingRunwayCondition`. Documented
  here so the next contributor expects it.

## Schema migration note

`schemaVersion` in `b787-landing.json` jumps from `1.0.x` (Sprint C)
straight to `2.4.0`. The intermediate 2.0–2.3 versions were never
shipped for landing — the numbering aligns the landing JSON with the
takeoff JSON's `2.3.0` baseline so a future shared schema-version
floor can use a single comparator. The Zod schema's
`SCHEMA_VERSION_PATTERN` is widened to `^2\.4\.\d+$` accordingly.

## Alternatives considered

- **Keep one shared 7-condition union.** Rejected: would force the
  takeoff JSON to be reshuffled and the takeoff tests rewritten,
  violating the "Modifying Crosswind (Takeoff) module" forbidden
  scope of this PR. Also, AFM does not actually use the 7-category
  split for takeoff.
- **Wipe Recent Calculations on first launch after upgrade.**
  Rejected: destructive, breaks the user's mental model that history
  is preserved across updates.
- **Default to `goodSlushSnow` (the more conservative split).**
  Rejected: pilots think of "Good" as the standard wet-runway
  category; defaulting to the snow row would mislead. See section 4.
