# ADR-0019 · Static Landing layout — no-scroll viewport with reserved Autoland slot

**Status:** Accepted
**Date:** 2026-05-28
**Related:** `02_Specification/06-ui-spec.md` § Экран 4b "Crosswind Landing Calculator",
`02_Specification/module-contracts/crosswind-landing.md` § Conditional UI behaviour,
`02_Specification/ADR/0014-landing-module-architecture.md`,
`02_Specification/ADR/0018-landing-runway-condition-taxonomy-v2.md`,
`02_Specification/ADR/0011-custom-numeric-keypad-eliminates-ios-system-keyboard.md`
(precedent: instant overlay-style controls),
`src/features/crosswind-landing/presentation/CrosswindLandingScreen.tsx`,
`src/features/crosswind-landing/presentation/components/CrosswindLandingInputForm.tsx`,
`src/features/crosswind-landing/presentation/components/ToggleCell.tsx`

## Context

Sprint C (ADR-0014) shipped the Landing calculator with **conditional
mount** for the two Autoland-only toggles — CAT II/III and ONE ENG INOP
appeared below the four core controls when `landingMode === 'auto'`
and unmounted when `landingMode === 'manual'`. Sprint C bug-fix wrapped
the whole screen in a `<ScrollView>` so the newly-mounted rows would
not push the result panel off-screen on iPhone-class viewports, and a
`useAutoScrollOnAutoland` hook chased the scroll position to keep the
new rows in view.

This worked but produced visible jank. Every Manual ↔ Autoland flip
shifted the result panel vertically (by the height of two `YesNoRow`s,
about 88 pt compact + label gaps), and the auto-scroll animation drew
the eye away from the very number the pilot was about to read. Sprint
F1/F2 collapsed the runway-condition row from a 6-segment wrap to a
single-line picker (ADR-0018) — that freed enough vertical real-estate
that the screen could plausibly fit a smallest target viewport
(iPhone SE, 4.7 inch, ≈ 667 pt usable) without scroll, IF the
remaining Autoland-only toggles stopped causing a layout shift.

User feedback after the F2 ship summarised it: "the result jumps every
time I touch Landing; just keep the layout fixed so I always know where
the number will appear."

## Decision

Re-shape the Landing screen as a **static, viewport-sized layout**:

1. **Remove `<ScrollView>` from the screen tree.** `CrosswindLandingScreen`
   uses `<Screen>` directly as its viewport; the inner `<Stack>` chains
   `flex: 1` so the result panel (in 2-column landscape) and the input
   form (in 1-column) both size against the safe-area height minus
   header.

2. **Restructure the input form into 4 single-column rows + 1
   reserved 2-column pair:**

   ```
   Row 1 — Aircraft                       (full width)
   Row 2 — Runway condition               (full width, picker)
   Row 3 — Asymmetric Reverse Thrust      (full width)
   Row 4 — Landing                        (full width)
   Row 5 — [CAT II/III (RVR < 350 m) | ONE ENG INOP]   (2-column, reserved)
   ```

   Why only Row 5 is 2-column: Rows 3–4 carry labels long enough that
   half-width cells render visibly cramped on iPhone widths (an earlier
   F3 draft put Rows 3–4 in a pair too — user testing on phone showed
   "Asymmetric Reverse Thrust" and "Landing" overflowed the half-cell).
   Rows 3–4 stay full-width; only the two Autoland-only labels — both
   already short and FCOM-canonical — fit comfortably side-by-side.

3. **Introduce the reserved-slot pattern.** Row 5 is **always
   mounted** at the same layout offset, regardless of Landing mode
   value. The new `ToggleCell` atom carries a `hidden?: boolean` prop
   that, when true:

   - sets `opacity: 0`
   - sets `pointerEvents: 'none'`
   - sets `accessibilityElementsHidden: true`
   - sets `importantForAccessibility: 'no-hide-descendants'`
   - **does NOT collapse the cell's natural rendered height**

   When Landing is Manual, the two CAT/INOP cells render as invisible
   spacers occupying the row's natural height. When Landing is
   Autoland, the same cells render visible and interactive in place.
   The transition is **instant** (no animation), matching the
   "no animation on overlay-style controls" precedent from ADR-0011
   Iteration 3 §2 (Modal `animationType="none"`).

4. **Delete the `useAutoScrollOnAutoland` hook and its tests.** With no
   ScrollView in the tree, there is nothing for the hook to scroll. It
   would have remained inert forever; deleting it removes a 60-line
   file plus its 130-line test fixture from the module. Repo-wide
   grep for `useAutoScrollOnAutoland` returns zero matches after F3.

5. **Verify the layout fits all 7 target viewports.** Before merging,
   the input-form + header + result-panel sum-of-heights is asserted
   ≤ available viewport height (minus safe-area + header) for each of
   the seven supported sizes:

   | Viewport               | Width × Height (pt) |
   |------------------------|---------------------|
   | iPhone SE (4.7")       | 375 × 667           |
   | iPhone 15 Pro          | 393 × 852           |
   | iPhone 15 Pro Max      | 430 × 932           |
   | iPad 11" portrait      | 834 × 1194          |
   | iPad 11" landscape     | 1194 × 834          |
   | iPad 13" portrait      | 1024 × 1366         |
   | iPad 13" landscape     | 1366 × 1024         |

   The 7 × 2 (Manual, Autoland) snapshot matrix in
   `CrosswindLandingInputForm.test.tsx` locks the rendered structure
   for each viewport-state combination and catches any regression that
   would re-introduce a layout shift between Manual and Autoland.

## Consequences

**Positive:**

- The result panel never moves. Pilots see the number in the same
  pixel location regardless of which Landing mode is selected — the
  exact UX outcome requested after F2.
- No scroll surface on the screen → no scroll-position lifecycle, no
  scroll-restoration on focus, no auto-scroll hook to maintain.
  Sprint-C's `useAutoScrollOnAutoland` (130-line test, 60-line hook) is
  deleted outright.
- The reserved-slot pattern is a reusable primitive (`ToggleCell` with
  `hidden` prop) for any future surface that needs the same "appear in
  place" semantics — e.g., advanced-mode toggles on a future Performance
  module.
- Single-screen no-scroll layout is closer to professional cockpit-EFB
  apps (ForeFlight, Jeppesen FliteDeck) where the calculation surface
  is always whole and visible.

**Negative:**

- Vertical budget is now tighter. iPhone SE in particular has very
  little headroom — the form + header + result-panel sum has to stay
  ≤ ~580 pt usable (667 − ~16 status-bar − ~10 home-indicator − ~50
  header − ~10 padding). The 7-viewport verification matrix is the
  trip-wire that catches any future widget addition that would push
  past this budget. Adding a 7th toggle to Landing without splitting
  the calculator surface is now structurally blocked — by design.
- The reserved slot consumes vertical space in Manual mode that
  produces no visible value. This is a deliberate trade: zero result-
  panel jitter is worth the ~88 pt of "always-reserved" space.
- The `RunwayConditionSheet` modal overlay still contains a
  `ScrollView` for its iPhone-landscape overflow path (kept from
  ADR-0018 § UI Layout fix v5). That ScrollView is **scoped to the
  picker bottom-sheet, not to the screen tree** — when the picker is
  closed the ScrollView is not mounted at all. The cleanup directive
  "no ScrollView in the screen tree" is honoured; the unrelated picker
  overlay is out of scope for F3.

**Neutral / future:**

- If a Phase 2+ Landing extension adds a 7th input (e.g., autobrake
  setting), we either (a) introduce a second reserved slot below
  Row 5 — requires re-running the 7-viewport verification — or (b)
  re-enable scroll only on the smallest viewport(s) via a width-keyed
  branch. Either is a future ADR, not part of F3.

## Alternatives considered

**(a) Keep the unmount + ScrollView pattern, polish the scroll
animation.**
The animation could be made shorter or eliminated, but the layout
shift itself is the visual noise pilots flagged — not the animation
on top of it. Without the unmount, the layout is stable; the simpler
fix (delete both) wins.

**(b) Keep ScrollView but always-mount the CAT/INOP rows.**
Always-mount alone fixes the jitter, but leaves a ScrollView that
serves no purpose (no overflow path remains). Dead UI infrastructure
is a maintenance hazard — the hook would have been retained "just in
case" and grown stale. Removing both is cleaner.

**(c) Collapse the reserved slot with `height: 0` in Manual.**
Collapsing the height re-introduces the layout shift; the result
panel would still move by the row's height every Manual ↔ Autoland
flip. Defeats the purpose of the reserved slot. Rejected.

**(d) `display: 'none'` instead of opacity + accessibility flags.**
React Native does not support `display: 'none'` reliably on all RN
versions (it removes from layout, defeating "reserved slot"), and
`display: 'none'` would lose the underlying View's height. The
opacity-0 + a11y-hidden + non-interactive triple is the canonical
React Native pattern for "render invisibly but reserve layout space".

**(e) Render the form into a fixed-height container that clips
overflow.**
Clipping would mask a real bug if future widgets exceed the budget —
the failure mode becomes silent (button cropped off-screen). The
7-viewport snapshot matrix + the no-scroll DoD make the failure mode
loud instead.

**(f) Make the row pair 2-column for AsymReverse + Landing too
(original F3 draft).**
Tried in the first draft; on iPhone widths the longer aviation labels
("Asymmetric Reverse Thrust", "Landing") rendered cramped in
half-width cells. Reverted to full-width for those two rows after
user feedback. Only the two Autoland-only labels — both already short
and FCOM-canonical — sit in the 2-column pair.

## 7-viewport height-fit verification matrix

Run as part of the F3 commit verification. Each row records: viewport
size, available height (minus safe-area + header), the actual rendered
content height (input form + result panel) at both Manual and Autoland
states, and the residual headroom. **All rows must show "fits" in
both states.**

The matrix is recorded in the F3 PR commit message body and re-checked
on every subsequent change to `CrosswindLandingScreen.tsx`,
`CrosswindLandingInputForm.tsx`, `ToggleCell.tsx`, or
`CrosswindLandingResult.tsx`.
