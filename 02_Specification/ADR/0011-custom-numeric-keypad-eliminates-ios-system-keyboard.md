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

## Iteration 1 (2026-05-22) — fix-pass after iPad user testing

After the first revision of `feat/custom-numeric-keypad` was tested on iPad,
the user surfaced three issues. Fix-pass landed as additional commits on the
same branch (PR not re-opened, no new ADR — this section extends ADR-0011).

### 1 · System keypad still appeared on repeat focus events

`showSoftInputOnFocus={false}` is **not a 100 % guarantee** on iPad when the
TextInput remains `editable={true}`. iOS sometimes surfaces the ASCII-capable
number-pad style (with ABC/DEF/GHI/JKL labels under digits) on re-focus
events — including the case where a pilot taps an already-focused field. The
only platform-level guarantee is `editable={false}`: iOS never renders a
software keyboard for non-editable TextInputs.

**Fix.** `NumericInput` now sets `editable={false}` + `caretHidden={true}`.
`showSoftInputOnFocus={false}` stays as a belt-and-braces signal.

**Trade-off.** Bluetooth-hardware-keyboard typing into the field is no longer
possible — iOS dispatches hardware key events only to editable TextInputs.
Accepted: cockpit users are extremely unlikely to pair a Bluetooth keyboard
with their iPad EFB, and the value of "zero system-keyboard exposure" against
App Review Guideline 4.2 outweighs the lost edge-case.

**Dead code preserved.** `onChangeText` in `NumericInput` is now a dead path
(non-editable TextInputs never emit text events), but the sanitizer callback
stays attached as defence-in-depth. If a future change re-enables editing for
a specific keyboard (e.g., an iPadOS update fixing the soft-keyboard leak), no
additional code is needed to keep sanitization in the loop.

### 2 · Bottom-sheet keypad covered the focused field

The first revision used `BottomSheet`, which occupied roughly half the screen
height. TOW (in the upper half of the form) stayed visible; CG (lower) was
fully hidden by the keypad. Pilots couldn't see what they were typing into
the field they were typing into.

**Fix.** `NumericKeypadHost` no longer wraps the keypad in `BottomSheet`.
Instead, it renders a `<Modal transparent animationType="fade">` with a
fixed-size (280 × 320 pt) `<Pressable>` popover absolutely positioned via the
new `computeKeypadPosition` algorithm:

- **Horizontal:** prefer the right side of the field (`anchor.x + width + 8`)
  if `screen.width - (anchor.x + width) >= 280 + 8 + 16` pt; fall back to the
  left side under the same threshold; finally horizontally center the popover
  on screen.
- **Vertical:** align the top of the popover with the top of the field, then
  clamp into `[16, screen.height − 320 − 16]` so the popover never spills
  off-screen.

The pure positioning function is exported (`computeKeypadPosition`) and unit
tested with six cases covering all branches (right / left / centered fallback,
top alignment, bottom clamp, top clamp).

**Anchor measurement.** `RegisteredField` gained a `getAnchor: () =>
Promise<FieldAnchor>` returning the window-relative geometry via React Native's
`View.measureInWindow`. The hook attaches the measured ref to the outer
`<View>` of the NumericInput and exposes the ref to the consumer
(`fieldRef`). The Provider calls `field.getAnchor()` on every register/
re-register and stores the resolved anchor in state (`activeAnchor`).
Same-id re-registration also re-measures, which gracefully handles
orientation changes.

**Why a fixed popover size.** Dynamic sizing would require an extra layout
pass before placement; measuring the popover after mount would create a
visible flicker. With a fixed 280 × 320 pt rectangle the placement is
deterministic and the keypad's own internal layout (4×3 grid + Done) is
already independent of container size.

### 3 · Keypad digit glyphs were vertically clipped

`<Text variant="mono">` set `lineHeight: 22 pt`. The keypad label override
bumped `fontSize` to 22–28 pt without bumping `lineHeight`. With
`lineHeight === fontSize` (or smaller), iOS clips the top and bottom of
mono-spaced digit glyphs — "7" reads as "/" (upper horizontal gone), "1"
loses its upper flag, "5" loses the top crossbar, etc.

**Fix.** `keyLabel` now sets an explicit `lineHeight` (28 pt compact, 36 pt
regular — roughly `fontSize × 1.28`, comfortable headroom for ascenders and
descenders). Also added `fontWeight: '600'` (overriding the variant's 500) for
a heavier glyph that reads better at large sizes, and `textAlign: 'center'`
for safety.

### Other changes bundled with the fix-pass

- Key heights shrank from 52 / 72 pt to 48 / 56 pt so the keypad fits
  comfortably inside the 280 × 320 pt floating popover while still presenting
  generous touch targets (≥ 48 pt — minimum touchable, ≥ 56 pt regular).
- The `sanitizeDecimalInput` defence-in-depth function is now unit-tested
  directly (`sanitizeDecimalInput.test.ts`) instead of through the NumericInput
  `onChangeText` path, which is now non-reachable in production.

## Iteration 2 (2026-05-22 evening) — second fix-pass after iPad + iPhone testing

After Iteration 1 was tested on both iPad and iPhone, three polish issues
surfaced:

### 1 · Done button overflowed the popover container

The `<Button>` design-system primitive carries intrinsic width from its
label + padding; without an explicit width constraint it could exceed the
popover's 280 pt − 24 pt padding inner area. The Done button visibly bled
past the right border of the keypad surface.

**Fix.** `styles.done` now sets `alignSelf: 'stretch'` + `width: '100%'`
alongside `marginTop`. Both properties target slightly different layout
paths (alignSelf for flex containers, width for explicit sizing) — keeping
both is cheap insurance against RN behaviour changes between versions.

### 2 · Tap target was limited to the bordered field box

The `<Pressable>` in `NumericInput` previously wrapped only the inner
`styles.field` (the bordered TextInput box, ~44 pt compact / 80 pt regular).
Taps on the label region above the field or on the reserved-error-slot
region below the field did not register, and a non-editable TextInput on
iOS occasionally absorbed first taps — together producing the "doesn't open
on first tap" effect pilots reported.

**Fix.** The Pressable moved to the outermost wrapper (`styles.root`), so
any tap inside the NumericInput's visible area (label + bordered field +
reserved warning slot) triggers `handleFieldPress`. The bordered field is
still the visual the popover should align to, so the anchor ref is
decoupled from the tap-target wrapper:

- `useNumericKeypad` renamed its returned ref from `fieldRef` to
  `anchorRef` and documented it as "attach to the bordered field box, not
  the outer tap wrapper."
- `NumericInput` attaches `anchorRef` to the inner `<View
  style={styles.fieldRing}>` and uses the outer `<Pressable
  style={styles.root}>` for taps.

The inner Pressable was removed; the inner `<View style={styles.field}>` is
now a plain View (it never needed press handling once the outer Pressable
existed).

### 3 · Popover covered the field on iPhone compact widths

The Iteration 1 algorithm preferred right-of-field, then left-of-field,
then horizontally centred the popover when no horizontal space was
available. On iPhone (~375–390 pt width) neither side fits a 280-pt
popover, so the algorithm always centred — landing directly on top of the
focused field.

**Fix.** The positioning algorithm splits by screen width:

- **Wide screen (>= 768 pt — iPad, iPad-mini portrait):** prefer right of
  field, then left of field, then **fall back to above/below** (rather
  than the old "horizontally center on screen"). The above/below fallback
  reuses the compact-screen logic so we avoid having two divergent
  branches for the rare edge case.
- **Compact screen (< 768 pt — iPhone, iPhone landscape):** prefer above
  field, then below field. Horizontally centre the popover on the field
  (clamped to `[SCREEN_MARGIN, screen.width − KEYPAD_WIDTH − SCREEN_MARGIN]`)
  so it sits visually under or over the same column as the input.

When neither above nor below has enough vertical room (very short screen
+ tall popover), the algorithm picks the side with more room and clamps
to the screen margin — guarantees the popover is never partially
off-screen.

The breakpoint constant matches `tokens.breakpoints.regularHeader` (768)
so any future shifts in the design-system breakpoints propagate naturally.

The new `positionBesideOrAbove`, `positionAboveOrBelow`, `clampVertical`,
and `horizontalCenterOnField` helpers are internal to the Host file;
`computeKeypadPosition` remains the only exported entry point for
testing. Twelve unit tests cover the wide + compact branches, all
clamping paths, and the fallback when wide screen has no side room.
