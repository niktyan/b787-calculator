/**
 * Pure positioning math for an anchored popover.
 *
 * Originally written for the custom numeric keypad
 * (`src/design-system/components/NumericKeypad/NumericKeypadHost.tsx`,
 * ADR-0011 Iteration 2). Extracted here so a second consumer —
 * `RunwayConditionPicker` on iPad landscape — can re-use the same
 * cascade without copying numbers (F2 visual fix v4, ADR-0018 § UI
 * Layout).
 *
 * Cascade by screen width:
 *   - width ≥ COMPACT_WIDTH_BREAKPOINT (768pt): prefer right of the
 *     anchor, fall back to left, fall back to above/below.
 *   - width <  COMPACT_WIDTH_BREAKPOINT: prefer above the anchor,
 *     fall back to below, fall back to clamped edges.
 *
 * No React Native imports — keeps the math pure and unit-testable.
 */

// Window-relative geometry of the anchor element, used by the Host to
// position the floating popover next to it.
export interface AnchorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

export interface PopoverSize {
  readonly width: number;
  readonly height: number;
}

export interface PopoverPosition {
  readonly top: number;
  readonly left: number;
}

// Anything from iPad-mini portrait upwards picks the "beside the
// anchor" cascade; iPhone-width screens use the "above/below" cascade.
// See ADR-0011 Iteration 2 §3.
export const COMPACT_WIDTH_BREAKPOINT = 768;

const SCREEN_MARGIN = 16;
const ANCHOR_OFFSET = 8;
const HALF = 2;

function clampVertical(preferredTop: number, popoverHeight: number, screenHeight: number): number {
  const maxTop = screenHeight - popoverHeight - SCREEN_MARGIN;
  if (preferredTop > maxTop) {
    return Math.max(SCREEN_MARGIN, maxTop);
  }
  if (preferredTop < SCREEN_MARGIN) {
    return SCREEN_MARGIN;
  }
  return preferredTop;
}

function horizontalCenterOnAnchor(
  anchor: AnchorRect,
  screen: ScreenSize,
  popover: PopoverSize,
): number {
  const anchorCenterX = anchor.x + anchor.width / HALF;
  const preferredLeft = anchorCenterX - popover.width / HALF;
  const maxLeft = screen.width - popover.width - SCREEN_MARGIN;
  if (preferredLeft < SCREEN_MARGIN) {
    return SCREEN_MARGIN;
  }
  if (preferredLeft > maxLeft) {
    return Math.max(SCREEN_MARGIN, maxLeft);
  }
  return preferredLeft;
}

function positionAboveOrBelow(
  anchor: AnchorRect,
  screen: ScreenSize,
  popover: PopoverSize,
): PopoverPosition {
  const topSpace = anchor.y;
  const bottomSpace = screen.height - (anchor.y + anchor.height);
  const requiredVertical = popover.height + ANCHOR_OFFSET + SCREEN_MARGIN;

  let top: number;
  if (topSpace >= requiredVertical) {
    top = anchor.y - popover.height - ANCHOR_OFFSET;
  } else if (bottomSpace >= requiredVertical) {
    top = anchor.y + anchor.height + ANCHOR_OFFSET;
  } else {
    top = topSpace > bottomSpace ? SCREEN_MARGIN : screen.height - popover.height - SCREEN_MARGIN;
  }

  return { top, left: horizontalCenterOnAnchor(anchor, screen, popover) };
}

function positionBesideOrAbove(
  anchor: AnchorRect,
  screen: ScreenSize,
  popover: PopoverSize,
): PopoverPosition {
  const rightSpace = screen.width - (anchor.x + anchor.width);
  const leftSpace = anchor.x;
  const requiredHorizontal = popover.width + ANCHOR_OFFSET + SCREEN_MARGIN;

  if (rightSpace >= requiredHorizontal) {
    return {
      left: anchor.x + anchor.width + ANCHOR_OFFSET,
      top: clampVertical(anchor.y, popover.height, screen.height),
    };
  }
  if (leftSpace >= requiredHorizontal) {
    return {
      left: anchor.x - popover.width - ANCHOR_OFFSET,
      top: clampVertical(anchor.y, popover.height, screen.height),
    };
  }
  return positionAboveOrBelow(anchor, screen, popover);
}

/**
 * Pure: same inputs → same output; no side effects. Exposed so callers
 * (keypad host + picker popover host) and unit tests share one
 * implementation.
 */
export function computeAnchoredPosition(
  anchor: AnchorRect,
  screen: ScreenSize,
  popover: PopoverSize,
): PopoverPosition {
  if (screen.width >= COMPACT_WIDTH_BREAKPOINT) {
    return positionBesideOrAbove(anchor, screen, popover);
  }
  return positionAboveOrBelow(anchor, screen, popover);
}

/**
 * Bottom-dock positioning — pure helper for the iPhone-compact numeric
 * keypad branch (ADR-0011 Iteration 4).
 *
 * Places the popover flush against the bottom edge of the safe-area
 * inset and horizontally centred on the screen. Unlike
 * `computeAnchoredPosition`, the anchor is NOT consulted — bottom-dock
 * is a stable position that does not "follow" the active field. This
 * matches the iOS system-keyboard contract on iPhone.
 *
 * Invariants (asserted by unit tests + host integration tests):
 *   - `position.top + popover.height === screen.height - safeAreaBottom`
 *     The popover's bottom edge sits exactly on the safe-area top.
 *   - `position.left === (screen.width - popover.width) / 2`
 *     Horizontally centred; with a full-width popover, `left === 0`.
 *
 * Out of scope: anchor-driven scrolling. The caller (CrosswindScreen)
 * handles "keep active field visible above the dock" by wrapping the
 * form in a ScrollView and adding paddingBottom when the keypad is
 * open. See ADR-0011 Iteration 4.
 */
export function positionBottomDocked(
  screen: ScreenSize,
  popover: PopoverSize,
  safeAreaBottom: number,
): PopoverPosition {
  return {
    top: screen.height - popover.height - safeAreaBottom,
    left: (screen.width - popover.width) / HALF,
  };
}
