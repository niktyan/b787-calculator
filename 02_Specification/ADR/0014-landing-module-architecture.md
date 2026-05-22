# ADR-0014 · Crosswind Landing module — categorical lookup, parallel feature

**Status:** Accepted
**Date:** 2026-05-23
**Related:** `02_Specification/01-vision.md` § "Что входит в MVP",
`02_Specification/02-architecture.md` § "Module Communication Patterns",
`02_Specification/04-domain-model.md` § "Landing types",
`02_Specification/06-ui-spec.md` § "Экран 4b · Crosswind Landing Calculator",
`02_Specification/module-contracts/crosswind-landing.md`,
`02_Specification/ADR/0013-per-aircraft-operational-envelope.md`,
`src/core/aviation/types.ts`,
`src/features/crosswind-landing/`

## Context

Sprint A closed the UX-bug list flagged by App Review under Guideline 4.2
(Minimum Functionality). Sprint B added the B787-9 variant to the
existing Takeoff module (ADR-0013). Apple resubmit still needs more
functional breadth to convincingly counter the 4.2 rejection: a calculator
that exposes a single computation across two aircraft and six runway
conditions reads as "one formula × variants", not as a domain tool.

Sprint C adds the second crosswind module — **Crosswind Landing**. With
both phases active, the app becomes a "crosswind operations suite":
2 modules × 2 aircraft × 6 RWYCC = 24 calculation matrices, in addition
to FCOM CAUTION adjustments specific to landing. This crosses the
ambiguity threshold App Review draws around 4.2.

The Landing algorithm differs from Takeoff in **shape**, not magnitude:

- **No weight / CG dependency.** The FCOM landing limit table
  (Tab 2.29.3 + page 2-105) is keyed by aircraft × runway condition ×
  landing mode. Pilot weight does not influence the limit.
- **Categorical lookup, not piecewise-linear.** Six inputs are
  categorical toggles. Output is one of a finite set of integer KT.
- **Conditional adjustments, not breakpoint interpolation.** Three
  caution-driven adjustments (CAT II-III cap, Asymmetric Reverse
  penalty, ONE ENG INOP cap) optionally lower the base lookup.

This rules out reusing the Takeoff strategy machinery (`bracketedLinear`
/ `variableSlopeBracketed` / etc.) — the per-aircraft × per-condition
JSON shape, the Value Object pipeline, and the operational envelope
validators are all dead weight for Landing.

## Decision

Add Crosswind Landing as a **separate feature module** at
`src/features/crosswind-landing/`, parallel to the existing
`src/features/crosswind/` (Takeoff). The two modules share neither code
nor data — only the aviation primitives `AircraftVariant`,
`RunwayCondition`, and `FlightPhase` which are extracted to
`src/core/aviation/` so both features can import them from `core`
(cross-feature imports remain forbidden per ADR-0001).

Concrete shape:

- **Domain layer** (`features/crosswind-landing/domain/`):
  - `types.ts` — `LandingMode`, `YesNo`, `CrosswindLandingInput`,
    `CrosswindLandingOutput`, `CrosswindLandingError`.
  - `calculator.ts` — `calculateLandingCrosswind(input, data)`. Single
    pure function; no strategy interface (only one algorithm shape).
- **Data layer** (`features/crosswind-landing/data/`):
  - `b787-landing.json` — schemaVersion 1.0.0, separate file from the
    takeoff bundle. Shape:
    ```jsonc
    {
      "schemaVersion": "1.0.0",
      "dataVersion": "YYYY-MM-DD.NNN",
      "phase": "landing",
      "adjustments": { "catIIIIICap": 25, "asymReversePenalty": 5 },
      "byAircraft": {
        "b787_8": {
          "engineInopAutolandLimit": 28,
          "baseTable": { "dry": { "manual": 37, "auto": 33 }, ... },
          "metadata": { ... }
        },
        "b787_9": { ... }
      }
    }
    ```
  - `schema.ts` — zod schema + business-rule walker. Both required
    `b787_8` and `b787_9` entries; strict `baseTable` keys.
  - `landingRepository.ts` — same `Result<Data, CorruptedDataBundle>`
    surface as the takeoff repository, with default-context
    `expectedPhase: 'landing'`.
- **Presentation layer** (`features/crosswind-landing/presentation/`):
  - `CrosswindLandingScreen.tsx` — 6 segmented controls, single result
    panel. 2-column layout on iPad landscape; stacked elsewhere.
  - `CrosswindLandingInputForm.tsx` — implements the **conditional UI
    hide**: CAT II-III and ONE ENG INOP rows unmount entirely when
    `landingMode === 'manual'` (their values cannot affect the result
    in manual mode). When the pilot switches back to Autoland the rows
    reappear with whatever the parent state holds (default `no` / `no`).
  - `CrosswindLandingResult.tsx` — single-card centred number. Visual
    treatment intentionally mirrors `CrosswindResult` from the takeoff
    feature so both modules look the same in the cockpit; the component
    is **duplicated, not shared**, since features may not cross-import.
  - `useCrosswindLandingCalculator.ts` — view-model. Far simpler than
    the takeoff one: no field parsing, no envelope validation, no
    Result composition for two fields. Just calculator → UI state.
- **Routing** — `src/app/(main)/crosswind-landing.tsx` is a one-line
  re-export of `CrosswindLandingScreen`. `src/core/modules/data.json`
  activates the landing card (`active: true`, `route: '/crosswind-landing'`).
- **i18n** — new namespace `crosswind-landing.*` (EN + RU). Aviation
  terms (`Manual`, `Autoland`, `Asymmetric Reverse Thrust`, `CAT II-III`,
  `ONE ENG INOP`, `RVR`, `KT`) stay in English in both locales per
  AGENTS.md Rule 9. General UI labels (Тип ВС, Состояние ВПП,
  Посадка, No/Yes) are translated.

Shared-types extraction:

- `AircraftVariant`, `RunwayCondition`, `FlightPhase`,
  `RunwayConditionCode`, `RWYCC`, and the matching const arrays move
  from `features/crosswind/domain/types.ts` to `src/core/aviation/`.
- The takeoff module's `domain/types.ts` re-exports the same names so
  every existing internal import path stays valid and the takeoff
  feature's public API surface is unchanged.

Algorithm formalization:

```
function calculateLandingCrosswind(input, data):
  base       = data.byAircraft[input.aircraft].baseTable[input.runwayCondition][input.landingMode]
  catCap     = data.adjustments.catIIIIICap
  inopLimit  = data.byAircraft[input.aircraft].engineInopAutolandLimit

  if input.landingMode == 'manual':
    return applyAsymReverse(base, input)

  // auto mode — stacked adjustments
  afterCat   = (input.catIIIII == 'yes' AND base > catCap) ? catCap : base
  afterAsym  = applyAsymReverse(afterCat, input)
  afterInop  = (input.engineInop == 'yes' AND inopLimit < afterAsym) ? inopLimit : afterAsym
  return afterInop

function applyAsymReverse(value, input):
  if input.asymReverse != 'yes' OR input.runwayCondition == 'dry':
    return value
  return value - data.adjustments.asymReversePenalty   // 5 KT
```

All values are integers per FCOM Tab 2.29.3 — no rounding required.

## Consequences

**Positive:**

- Clean separation: Landing has its own domain, data, presentation, JSON
  and tests. Changing the landing FCOM data has zero risk of regressing
  Takeoff and vice versa.
- The pattern (categorical lookup + conditional adjustments) is reusable
  for future modules whose algorithms are also non-interpolated tables
  (e.g., a hypothetical Brake Cooling, Pack Failure performance, etc.).
- Sprint C ships the App-Review-positioning narrative: "Crosswind
  Operations Suite" with two phases × two aircraft × six RWYCC × CAUTION
  adjustments.
- Public API of the takeoff feature is **bit-for-bit unchanged**. All
  412 existing crosswind tests pass without modification after the
  aviation-types extraction.
- The new module passes the same quality gates as the takeoff module:
  lint 0/0, typecheck 0, ≥ 90% domain coverage, 18 acceptance anchors,
  defence-in-depth tests on repository corruption paths.
- Conditional UI hide for CAT/INOP in manual mode keeps the form small
  (4 toggles) for the most common case while still surfacing the full
  6-toggle Autoland configuration without a separate screen.

**Negative:**

- `CrosswindLandingResult` duplicates ~95% of the takeoff
  `CrosswindResult` structure (status label, big number, KT suffix, info
  caption variant, error variant). The duplication is intentional —
  hoisting a shared "BigNumberResult" component into the design system
  would couple it to two separate state-machine shapes (`CrosswindUIState`
  vs `CrosswindLandingUIState`) that may yet diverge. Triggered if/when
  a third numeric module joins the family.
- `mainMenu.activeModuleDescription` (single string) was replaced by
  `mainMenu.descriptions.<module-id>` (per-id keys). Future active
  modules must add their own description key; the dynamic lookup
  silently falls through to the literal key string if a description is
  missing. Trade-off accepted: the alternative was hardcoding two
  strings in `ModuleCards.tsx`.
- `Coming Soon` infrastructure now ships zero entries — Landing was the
  only teaser. The infrastructure stays in place for Phase 3+
  (Weight & Balance, Performance, Fuel) and the affected tests now
  assert "MVP ships no teasers" explicitly.

**Neutral:**

- New JSON file `b787-landing.json` ships its own `dataVersion`
  separate from the takeoff one. Updating either file is independent.
- The new ADR raises the total to 14; the next module activation
  (Phase 3+) is expected to follow the same pattern and may not need
  its own ADR if the algorithm shape is similar.

## Alternatives considered

**(a) Add Landing as a sub-module inside `features/crosswind/`.**
Reuse the existing `crosswindRepository`, extend the JSON schema with a
`phase: 'landing'` discriminant, and add a `landingLookup` strategy to
the strategy union. Rejected: the landing algorithm shape has no
weight/CG dimension at all; jamming it into the strategy interface
(which assumes `CalculatorInput` with `WeightInTons` + `CGPercentMAC`)
either pollutes the takeoff interface with optional fields or requires
the strategy to ignore them silently. The data shapes are also
incompatible — takeoff stores brackets + slopes, landing stores
integer lookup cells.

**(b) Share a single bundled JSON with `phase: 'takeoff' | 'landing'`
discriminator.**
Keep one file per aircraft, with separate `takeoff` and `landing`
branches inside. Rejected: each branch has incompatible schemas
(takeoff: strategy union + brackets + envelope; landing: 6×2 integer
matrix + adjustments + inop limit). zod's `discriminatedUnion` would
work, but the file would balloon to ~800 lines mixing two unrelated
concerns. Worse, every JSON update would force a re-validation of the
unrelated branch.

**(c) Promote `CrosswindResult` to the design system instead of
duplicating.**
Hoist the big-number card into `src/design-system/components/` and
parametrise it over the UI state shape. Rejected for Sprint C: the
takeoff state machine carries five states (`empty`, `idle`,
`out-of-envelope`, `data-not-available`, `error`); landing has three
(`idle`, `data-not-available`, `error`). A generic component would
need to accept all five variants, leaving Landing with two unused
ones — and Future modules might add more. Delayed to whenever a third
numeric module is added or the DS gets a "BigNumberPanel" primitive
refactor.

**(d) Keep `AircraftVariant` / `RunwayCondition` duplicated in both
features.**
Define them inline in each feature's `domain/types.ts`. Rejected: the
two definitions would drift over time (e.g., adding B777 or a 7th
RWYCC value would require keeping two files in sync). Moving them to
`core/aviation/` is the architecturally correct location per
`02-architecture.md` § "Module Communication Patterns" trigger 5
("один и тот же data-источник или утилита нужны в двух фичах →
вынести в core").

**(e) Defer Landing until Phase 2 and resubmit with Sprint B only.**
Rejected by user direction: Apple's 4.2 rejection cited
"single-formula novelty". Sprint B alone (B787-9 variant) widens the
data dimension but does not change the formula count. Sprint C adds a
second, structurally different formula — the actual evidence that
the app is a domain tool. Skipping Sprint C risks another 4.2 rejection
on resubmit.
