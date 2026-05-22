# ADR-0011 · Custom in-app numeric keypad replaces iOS system keyboard for numeric inputs

**Status:** Accepted
**Date:** 2026-05-22
**Related:** `02_Specification/06-ui-spec.md` § Экран 4 "Keyboard behavior",
`02_Specification/module-contracts/design-system.md` § Inputs,
`02_Specification/module-contracts/design-system.md` § Overlays · NumericKeypad,
`src/design-system/components/NumericKeypad/`,
`src/design-system/components/NumericInput/NumericInput.tsx`,
`src/app/_layout.tsx`

## Context

After PR #81 (`fix(design-system): harden NumericInput keyboard against letter
input`) we shipped two-layer protection against letter input on numeric fields:
pinned `keyboardType="decimal-pad"` plus a sanitizer in `onChangeText`. Manual
testing on iPad surfaced a residual issue: the iOS system `decimal-pad` keeps a
hardwired **"ABC"** button that switches the keyboard to full QWERTY. iOS
**remembers the chosen mode per field for the lifetime of the session** — a
pilot who taps ABC by accident sees a QWERTY layout every subsequent focus on
the same field until the app is killed. React Native does not expose any prop
that hides the ABC switch on `decimal-pad`.

A second issue compounds the keyboard one. With `useState`-driven `focused`
state, each transition between TOW and CG triggered a double re-render of the
input wrapper, which combined with the iOS keyboard slide-in animation
(~250 ms) produced a visible 200–400 ms gap before the new field's keyboard
appeared. Pilots running through "weight, CG, weight, CG" cycles flagged this
as sluggish.

Beyond UX, App Review Guideline 4.2 (Minimum Functionality) had already cited
this app once. The reviewer report explicitly mentioned the "generic web-form
feel" of the input experience. A QWERTY-capable keyboard on a number field is
exactly the kind of detail that reinforces that impression. Replacing the
system keyboard with a domain-shaped keypad is the strongest possible
counter-signal — it makes the input experience visibly **iPad-native and
pilot-shaped**.

## Decision

Suppress the iOS system keyboard entirely on every `NumericInput` via
`showSoftInputOnFocus={false}`, and replace it with an in-app **custom numeric
keypad** mounted at the app shell level:

- **`NumericKeypad`** — presentational component: 12 keys (10 digits + decimal
  separator + backspace) arranged in a 4×3 grid, with a full-width Done button
  beneath. Compact (52 pt keys) for iPhone / iPad portrait; regular (72 pt keys)
  for iPad landscape.
- **`NumericKeypadProvider`** — React Context + state machine. Stores the
  `activeFieldId` (the one reactive bit that drives the BottomSheet's
  visibility) and a ref containing the registered field's
  `getValue / setValue / isRegular` closures. The ref pattern avoids stale
  closures across re-renders of the `NumericInput`.
- **`NumericKeypadHost`** — a `BottomSheet` overlay rendered once in
  `src/app/_layout.tsx` as a sibling of `<Stack>`. Visible when
  `activeFieldId !== null`. Wraps a `<NumericKeypad>` that delegates `onKeyPress`
  / `onDone` to the Provider's `pressKey` / `done` actions.
- **`useNumericKeypad({ value, onChange, isRegular, disabled })`** — the
  consumer hook used by `NumericInput`. Generates a stable field id via
  `useId()`, returns `{ isActive, handleFieldPress }`, and auto-clears the
  active field on unmount when the unmounting component was the active one.
- **`sanitizeDecimalInput`** (from PR #81) stays put. It runs both on every
  `pressKey` (Provider concatenates `value + key` and sanitizes) and on every
  `onChangeText` (Bluetooth-hardware-keyboard path). This is defence-in-depth:
  the in-app keypad cannot produce non-digit input, but iPad's hardware keyboard
  can.

Switching focus between fields **does not re-mount the BottomSheet** — only
`activeFieldId` updates. The keypad stays visible and instantly retargets the
new field, eliminating the keyboard-switch lag.

`renderWithTheme` in `src/design-system/_testing/` now also wraps the tree in
`NumericKeypadProvider`. This is invisible to snapshots (Context.Provider emits
no host node) and lets every existing NumericInput test continue to work
without bespoke setup.

## Consequences

**Positive:**

- QWERTY input is now physically impossible: the system keyboard never appears.
  The strongest signal we can give App Review that this is a domain-specific
  pilot tool, not a generic form.
- Field-switching lag is gone — the keypad stays mounted, only `activeFieldId`
  flips.
- Tap-target ergonomics improve in the cockpit: 52 / 72 pt keys are
  fat-finger-friendly compared to the system keyboard's 30-pt digits.
- New design-system primitives (`NumericKeypad`, `NumericKeypadProvider`,
  `NumericKeypadHost`, `useNumericKeypad`) are composable for any future
  numeric input surface (Weight & Balance, Performance, Fuel modules) without
  re-implementing the suppression/registration plumbing.
- ID stability via `useId()` (React 19) keeps re-press of the same field a
  pure no-op — no double-register, no re-render storm.

**Negative:**

- New code surface: 6 files in `src/design-system/components/NumericKeypad/`
  plus a wire-up in `src/app/_layout.tsx`. Mitigated by colocated tests
  (presentational, state-machine, host, hook) that cover the new code at
  100 % lines.
- Bluetooth-hardware-keyboard users on iPad now type into the field without
  the on-screen keypad providing a visible echo. The TextInput remains
  `editable={true}` so typing works; the sanitizer still filters non-digits.
  This is a small regression for an audience that is likely to be rare in
  cockpit use (Bluetooth keyboards are uncommon EFB accessories).
- The design-system primitive `NumericKeypad` is the first DS component to
  consume `useTranslation()` directly (for "Done" / "Backspace" /
  "Decimal separator" / "Close numeric keypad" labels). Other primitives
  receive their strings via props. This is a deliberate exception: the four
  strings are keypad-content rather than caller-content, and threading them
  through props at every call site (in practice only `NumericKeypadHost`) adds
  noise without buying compositional flexibility.
- `NumericKeypadProvider` must be mounted in the app shell for any
  `NumericInput` to function. `useNumericKeypadContext` throws at render time
  when the provider is missing, so the missing-provider failure mode is
  loud and immediate — not silent fallback.

**Future:**

- Sprint D will add haptic feedback (`expo-haptics`) on key press once that
  package is approved into `03-tech-stack.md` via a separate ADR.
- If Phase 2+ introduces a non-numeric input (e.g., ICAO airport code), the
  same Provider + Host pattern scales: a sibling `AlphanumericKeypad` /
  `AlphanumericKeypadHost` can register through the same Provider abstraction
  or a parallel one. We deliberately did **not** generalize ahead of demand.

## Alternatives considered

**(a) Keep the system keyboard, hide the ABC button some other way.**
There is no React Native or iOS API to hide the ABC switch on `decimal-pad`.
Possible workarounds (custom `inputAccessoryView`, third-party native modules)
would all require an Expo prebuild and break the managed-workflow constraint
in `03-tech-stack.md`. Rejected.

**(b) Use `keyboardType="number-pad"` instead of `decimal-pad`.**
`number-pad` omits the decimal separator entirely. CG is a fractional value
(`%MAC` with one decimal), so a number-only keyboard would force the pilot to
abandon precision. Rejected.

**(c) Render the keypad inline below each `NumericInput` rather than as a
bottom-sheet.**
Inline rendering doubles the screen-height footprint of the input section,
clashing with the iPad landscape `flex: 1` result-card layout
(`06-ui-spec.md` § Экран 4 "Result-секция"). A bottom-sheet overlay leaves the
form layout untouched and is the iOS-canonical pattern for "auxiliary input
surface". Rejected.

**(d) Per-screen keypad instance instead of an app-shell-level host.**
Two issues: (1) every screen with a `NumericInput` would re-implement the
mount and lifecycle, and (2) switching from a field on one screen to a field
after navigation would lose the keypad mid-transition. App-shell hosting
makes the keypad a stable overlay across the entire navigation tree.
Rejected.

**(e) Keep `onFocus`/`onBlur` for the focus ring, layer `isActive` on top.**
Considered briefly. With the system keyboard suppressed, `onFocus` still fires
on a tap into the TextInput, but the ring would now have two competing
sources of truth (focused vs. active). Collapsing both into `isActive` from
the keypad context gives a single source of truth: the ring shows precisely
when the keypad is open and targeting this field. Rejected the alternative.
