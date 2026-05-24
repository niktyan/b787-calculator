# ADR-0015 · Haptic feedback strategy (expo-haptics)

**Status:** Accepted
**Date:** 2026-05-24
**Related:** `02_Specification/03-tech-stack.md` § «Allowed dependencies»,
`02_Specification/01-vision.md` § «Что входит в MVP»,
`02_Specification/06-ui-spec.md` § «Tactile feedback»,
`02_Specification/module-contracts/core.md` § «Haptics»,
`src/core/haptics/useHapticFeedback.ts`

## Context

Pre-Sprint D the app surface is fully silent — every keypad tap, every
segment selection, every Reset returns visual feedback only. Two distinct
problems compound:

1. **App Store Guideline 4.2 (Minimum Functionality).** The first
   submission was rejected as a "repackaged calculator", and Sprints A–C
   added FCOM-grounded operational depth (Landing module, B787-9
   activation, envelope safety). Sprint D adds a visible native iOS
   feature — Taptic Engine integration — which an App Reviewer
   physically feels within the first ten seconds of testing on
   hardware. This strengthens the 4.2 rebuttal at resubmit alongside
   the algorithmic depth from earlier sprints.

2. **Cockpit UX.** Pilots interact with iPad EFBs while wearing gloves,
   in reduced cockpit lighting, with split attention. A purely visual
   confirmation that a key or segment registered can be missed. A
   tactile pulse on each commit confirms the input was captured
   without forcing the eye onto the screen.

`expo-haptics` is part of the Expo SDK and is already on the project's
allowlist pattern (`expo-*` packages installed via `npx expo install`).
On supported devices (iPhone 7+ and all current iPads) it dispatches
through the iOS Taptic Engine; on unsupported hardware it is a
silent no-op at the OS layer — no try/catch required by the caller.

A spec-level kill-switch is also required: if a future iOS release or
specific device combination produces a regression (over-firing,
inappropriate buzz), the team must be able to disable every haptic in
the app without shipping a new build.

## Decision

Introduce a single hook, `useHapticFeedback()`, in `src/core/haptics/`,
exposing four typed methods aligned with iOS Taptic Engine semantics:

- `lightImpact()` — selection-confirmed events
  (`ImpactFeedbackStyle.Light`). Used for keypad digit/dot/backspace
  presses and `SegmentedControl` segment selections.
- `mediumImpact()` — committed action events
  (`ImpactFeedbackStyle.Medium`). Used for keypad **Done** and the
  **Reset** header pill on both Crosswind screens.
- `warningNotification()` — envelope/violation events
  (`NotificationFeedbackType.Warning`). Fired by
  `useCrosswindCalculator` when the result-panel UI state crosses
  `idle → out-of-envelope`.
- `successNotification()` — recovery events
  (`NotificationFeedbackType.Success`). Fired by
  `useCrosswindCalculator` when the result-panel UI state crosses
  `out-of-envelope → idle`.

The hook reads the new `enableHapticFeedback` feature flag
(default `true`) from `core/feature-flags`. When the flag is `false`,
the hook returns no-op methods and `expo-haptics` is never invoked —
this is the kill-switch path.

**Integration discipline.** All haptic calls go through the hook.
Feature code does not import `expo-haptics` directly. This keeps the
strategy (which event uses which haptic, and how the kill-switch
behaves) in one file.

**Transition haptics.** Envelope-state transitions are detected in
`useCrosswindCalculator` with a `useRef<CrosswindUIState['kind'] | null>`
that starts at `null`. A `useEffect` keyed on `result.state.kind`
compares previous vs current; the very first render compares against
`null` and intentionally fires nothing, so no haptic surprises the
pilot at mount time. Subsequent renders fire exactly once per
crossing.

Crosswind Landing has no envelope-violation state in its categorical
lookup, so it wires only the Reset medium-impact and inherits segment
light-impact through `SegmentedControl`. No warning/success
notifications are emitted on the Landing screen.

## Consequences

**Positive:**

- 4.2 rebuttal strengthened — a visible, hardware-native feature an
  App Reviewer feels immediately.
- Cockpit ergonomics improve: tactile confirmation on each touch
  reduces eye time on the input column.
- Single hook is the single point of change for any future tweak
  (additional events, different intensity mapping, etc.).
- Feature flag enables zero-deploy mitigation if a regression shows up
  in TestFlight or post-launch.

**Negative:**

- One new dependency (`expo-haptics`). Risk is minimal: it ships with
  the Expo SDK, is reviewed by Apple as part of standard Expo
  modules, and falls back to no-op silently on unsupported hardware.
- Long sessions can develop haptic fatigue. A future
  Settings-level user toggle (separate from the developer kill-switch)
  may be required if pilot feedback surfaces this. Out of scope for
  PR D1.

**Neutral:**

- Snapshot tests do not capture haptic dispatch — the calls live in
  event handlers, not the render tree. Behaviour is asserted via
  explicit unit/integration tests that mock `expo-haptics`.
- The `enableHapticFeedback` flag joins
  `showCalcTimeOnResult` and `enableDataVersionBanner` in
  `defaults.json`; the type union in `flags.ts` is generated from the
  JSON keys so no manual augmentation is required.

## Alternatives considered

**(a) Direct `Haptics.*Async` calls in each component.** Rejected:
disperses the "what fires when" decision across the codebase and
makes the kill-switch impossible to implement in one place. Every
component would also need to read the feature flag itself.

**(b) Wrapping haptic dispatch in `core/feature-flags` and exposing
a single `triggerHaptic(kind: 'light' | 'medium' | …)` function.**
Rejected: the typed-method hook expresses intent at the call site
(`haptics.warningNotification()` reads better than
`triggerHaptic('warning')`) and lets TypeScript catch typos at the
strategy boundary rather than runtime.

**(c) Adding a settings-level user toggle in this PR.** Rejected as
out of scope. The kill-switch flag is for developer/operator
intervention; an exposed user setting changes the Settings screen
contract and merits its own ADR + UI design pass. Re-evaluate after
TestFlight feedback from pilots.

**(d) Wiring envelope-transition haptics inside the calculator domain
function rather than the view-model.** Rejected as a Domain Purity
violation (`02-architecture.md` § Domain Purity Rules — domain must
not import React or RN). The transition is a UI/state-machine concern
that lives in `presentation`.

## Future

- Sprint D2 (Recent calculations) will add a success haptic on
  "calculation saved", reusing `successNotification()` without any
  changes to this strategy.
- A user-facing Settings toggle becomes a candidate for Phase 2 if
  TestFlight pilots request it. The hook structure already supports
  this — only the input to the gating boolean changes (flag → flag
  AND user preference).
- Apple Watch companion (post-MVP, Phase 4+) can use the same hook
  pattern via React Native Apple Watch bindings if added.
