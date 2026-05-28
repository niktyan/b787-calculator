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

4. **Default screen state** changes from `good` to `goodWetDamp`.
   Rationale: `goodWetDamp` carries the **higher** (more permissive)
   manual base limit — but with the wider distribution of surface
   conditions a typical pilot would expect "Good" to mean (clean wet
   runway). Picking `goodSlushSnow` as the default would be more
   conservative on paper but would mislead users selecting a wet
   runway. `dry` would have been the safest starting state, but the
   Sprint C screen already opens with `dry`; this ADR keeps that
   behaviour because the *default state* of the screen on cold open
   continues to be `dry` (per `useLandingScreenState.ts`). The
   `goodWetDamp` substitution is only used as the **legacy-`good`
   fallback** when restoring inputs from a pre-2.4.0 Recent
   Calculations entry. Choosing the more permissive of the two new
   variants preserves the user's prior expectation that "Good" meant
   "you can land with the standard Good crosswind".

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

- One more dimension on the landing input form. The compact iPhone
  layout already wraps the runway segmented control; the new longest
  label (`Good (Slush, Dry Snow, Wet Snow)`) extends the wrap.
  Verified visually on iPhone SE 4.7" portrait — wraps cleanly to a
  second row without label truncation.
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
