/**
 * Generic anchored-popover primitive — transparent `<Modal>` with an
 * absolutely-positioned card whose `{top, left}` are computed from the
 * anchor element's `measureInWindow` result via
 * `computeAnchoredPosition`.
 *
 * Extracted from the custom numeric keypad's host (ADR-0011 Iteration
 * 2) so a second consumer — `RunwayConditionPicker` on iPad landscape
 * (F2 visual fix v4, ADR-0018 § UI Layout) — can re-use the same
 * cascade without copying numbers. The keypad's own host
 * (`NumericKeypadHost`) keeps its existing Provider/Context glue and
 * does not yet consume this primitive — see TODO at the bottom of
 * this file.
 *
 * Contract:
 *   - The caller owns `isOpen` and `onDismiss`. The host does no
 *     state of its own.
 *   - The caller supplies an `anchorRef` pointing at the trigger
 *     element. When `isOpen` flips true the host calls
 *     `measureInWindow(...)` on the ref and renders the popover
 *     at the computed position.
 *   - `contentSize` is the fixed size the popover surface should
 *     render at. Layout-driven sizing is intentionally not supported —
 *     measuring before mount requires an extra layout pass and the
 *     keypad's existing math assumes a known size.
 *   - No animation (`animationType="none"`) — matches keypad behaviour
 *     per ADR-0011 Iteration 3 §2; pilots perceived the fade-in as
 *     tap-to-popup lag.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { View, ViewStyle } from 'react-native';

import { useTheme } from '../../core/theming';
import { tokens } from '../tokens';
import type { ColorPalette } from '../tokens';

import { computeAnchoredPosition } from './computeAnchoredPosition';
import type { AnchorRect, PopoverPosition } from './computeAnchoredPosition';

const POPOVER_BORDER_WIDTH = 1;
const POPOVER_SHADOW_OFFSET_Y = 4;
const POPOVER_SHADOW_OPACITY = 0.25;
const POPOVER_SHADOW_RADIUS = 12;
const POPOVER_ELEVATION = 8;

export interface AnchoredPopoverHostProps {
  readonly isOpen: boolean;
  readonly anchorRef: RefObject<View | null>;
  readonly contentSize: { readonly width: number; readonly height: number };
  readonly onDismiss: () => void;
  readonly accessibilityDismissLabel: string;
  readonly children: ReactNode;
  readonly testID?: string;
}

const ZERO_ANCHOR: AnchorRect = { x: 0, y: 0, width: 0, height: 0 };

function measureAnchor(ref: RefObject<View | null>, onMeasured: (rect: AnchorRect) => void): void {
  const node = ref.current;
  if (node === null || typeof node.measureInWindow !== 'function') {
    // Test renderer / native handle not attached → leave the initial
    // ZERO_ANCHOR in place. Matches the keypad's `useNumericKeypad`
    // ZERO_ANCHOR fallback (acceptable defensive default in
    // production; correct behaviour in test env).
    return;
  }
  node.measureInWindow((x, y, width, height) => {
    onMeasured({ x, y, width, height });
  });
}

export function AnchoredPopoverHost(props: AnchoredPopoverHostProps): ReactNode {
  const { isOpen, anchorRef, contentSize, onDismiss, accessibilityDismissLabel, children, testID } =
    props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const screen = useWindowDimensions();
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAnchor(null);
      return;
    }
    // Seed synchronously with ZERO_ANCHOR so the popover renders on
    // the first commit (test renderers + first-paint defensive case),
    // then update from `measureInWindow` if available.
    setAnchor(ZERO_ANCHOR);
    let cancelled = false;
    measureAnchor(anchorRef, (rect) => {
      if (!cancelled) {
        setAnchor(rect);
      }
    });
    return (): void => {
      cancelled = true;
    };
  }, [isOpen, anchorRef]);

  const position = useMemo<PopoverPosition | null>(() => {
    if (anchor === null) {
      return null;
    }
    return computeAnchoredPosition(
      anchor,
      { width: screen.width, height: screen.height },
      contentSize,
    );
  }, [anchor, screen.width, screen.height, contentSize]);

  const styles = useMemo<Styles | null>(() => {
    if (position === null) {
      return null;
    }
    return buildStyles({ palette, position, contentSize });
  }, [palette, position, contentSize]);

  const visible = isOpen && styles !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      testID={testID}
    >
      {styles === null ? null : (
        <Pressable
          accessibilityLabel={accessibilityDismissLabel}
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.backdrop}
          testID={testID === undefined ? undefined : `${testID}-backdrop`}
        >
          {/* Inner Pressable absorbs taps on the popover surface itself so
              they don't propagate up to the dismiss backdrop. */}
          <Pressable accessible={false} onPress={(): void => undefined} style={styles.popover}>
            {children}
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

interface Styles {
  readonly backdrop: ViewStyle;
  readonly popover: ViewStyle;
}

interface BuildStylesArgs {
  readonly palette: ColorPalette;
  readonly position: PopoverPosition;
  readonly contentSize: { readonly width: number; readonly height: number };
}

function buildStyles({ palette, position, contentSize }: BuildStylesArgs): Styles {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
    },
    popover: {
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: POPOVER_BORDER_WIDTH,
      elevation: POPOVER_ELEVATION,
      height: contentSize.height,
      left: position.left,
      padding: tokens.spacing.md,
      position: 'absolute',
      shadowColor: palette.overlay,
      shadowOffset: { width: 0, height: POPOVER_SHADOW_OFFSET_Y },
      shadowOpacity: POPOVER_SHADOW_OPACITY,
      shadowRadius: POPOVER_SHADOW_RADIUS,
      top: position.top,
      width: contentSize.width,
    },
  });
}

// TODO(future-cleanup): unify NumericKeypadHost on top of this primitive.
// The keypad's existing Provider/Context registration flow (async
// `getAnchor` → `activeAnchor` state) does not map 1:1 to this
// host's anchorRef-prop API, so the consolidation requires reworking
// `NumericKeypadProvider` to expose a single `anchorRef` per active
// field instead of a Promise-returning `getAnchor`. Out of scope for
// F2 — keep the two hosts side-by-side for now.
