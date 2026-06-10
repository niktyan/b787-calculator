import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../../core';
import { useTheme } from '../../../core/theming';
import {
  COMPACT_WIDTH_BREAKPOINT,
  computeAnchoredPosition,
  positionBottomDocked,
} from '../../anchored-popover/computeAnchoredPosition';
import type { PopoverPosition } from '../../anchored-popover/computeAnchoredPosition';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { NumericKeypad } from './NumericKeypad';
import { useNumericKeypadContext } from './NumericKeypadContext';
import { KEYPAD_HEIGHT_COMPACT, KEYPAD_HEIGHT_REGULAR } from './NumericKeypadHostMetrics';

const HOST_TEST_ID = 'numeric-keypad-host';
const KEYPAD_TEST_ID = 'numeric-keypad';

// Popover dimensions are fixed because (a) the keypad's layout is itself
// fixed (4×3 grid + Done), and (b) measuring the popover before mount in
// order to place it would require a layout pass we'd rather avoid.
// Height is picked per-`activeIsRegular` so the popover doesn't trail empty
// space below the Done button on compact sizing. See ADR-0011 Iteration 3
// § Done button containment.
//
// Content height math (4 keys, 3 row gaps, padding, Done margin + button):
//   compact: 24 + 4×48 + 3×8 + 8 + 44 = 292  →  +12 buffer = 304
//   regular: 24 + 4×56 + 3×12 + 12 + 44 = 340  →  +12 buffer = 352
const KEYPAD_WIDTH = 280;
const KEYPAD_BORDER_WIDTH = 1;
const KEYPAD_SHADOW_OFFSET_Y = 4;
const KEYPAD_SHADOW_OPACITY = 0.25;
const KEYPAD_SHADOW_RADIUS = 12;
const KEYPAD_ELEVATION = 8;
// Bottom-dock variant (ADR-0011 Iteration 4) draws the popover flush
// against the bottom safe-area inset on iPhone-compact widths. Negative
// shadow offset lifts the cast shadow above the top edge (where the
// popover meets the form), mirroring the iOS system keyboard.
const BOTTOM_DOCK_SHADOW_OFFSET_Y = -KEYPAD_SHADOW_OFFSET_Y;

// Re-export under the keypad's original name so existing unit tests keep
// importing `computeKeypadPosition` without an at-shore rewrite. F2 visual
// fix v4 (ADR-0018 § UI Layout) generalised the math into
// `computeAnchoredPosition` so the runway-condition picker can re-use it.
export { computeAnchoredPosition as computeKeypadPosition } from '../../anchored-popover/computeAnchoredPosition';

type Position = PopoverPosition;

interface Styles {
  readonly backdrop: ViewStyle;
  readonly popover: ViewStyle;
}

interface BuildStylesArgs {
  readonly palette: ColorPalette;
  readonly position: Position;
  readonly width: number;
  readonly height: number;
  readonly bottomDocked: boolean;
}

function buildStyles({ palette, position, width, height, bottomDocked }: BuildStylesArgs): Styles {
  const cornerRadii = bottomDocked
    ? {
        borderTopLeftRadius: tokens.radii.lg,
        borderTopRightRadius: tokens.radii.lg,
      }
    : { borderRadius: tokens.radii.lg };
  // Bottom-dock has no left/right/bottom border (it's flush against the
  // safe-area edge); the top border + cast shadow give the only seam.
  const borders = bottomDocked
    ? { borderTopWidth: KEYPAD_BORDER_WIDTH }
    : { borderWidth: KEYPAD_BORDER_WIDTH };
  return StyleSheet.create({
    backdrop: {
      flex: 1,
    },
    popover: {
      ...cornerRadii,
      ...borders,
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      elevation: KEYPAD_ELEVATION,
      height,
      left: position.left,
      padding: tokens.spacing.md,
      position: 'absolute',
      shadowColor: palette.overlay,
      shadowOffset: {
        width: 0,
        height: bottomDocked ? BOTTOM_DOCK_SHADOW_OFFSET_Y : KEYPAD_SHADOW_OFFSET_Y,
      },
      shadowOpacity: KEYPAD_SHADOW_OPACITY,
      shadowRadius: KEYPAD_SHADOW_RADIUS,
      top: position.top,
      width,
    },
  });
}

export function NumericKeypadHost(): ReactNode {
  const { activeFieldId, activeIsRegular, activeAnchor, clearActiveField, pressKey, done } =
    useNumericKeypadContext();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const keypadHeight = activeIsRegular ? KEYPAD_HEIGHT_REGULAR : KEYPAD_HEIGHT_COMPACT;
  // ADR-0011 Iteration 4: iPhone-compact uses a bottom-docked,
  // full-width sheet that mirrors the iOS system keyboard. iPad
  // (>= 768 pt) keeps the anchored-popover behaviour from Iteration 2.
  const bottomDocked = screen.width < COMPACT_WIDTH_BREAKPOINT;
  const keypadWidth = bottomDocked ? screen.width : KEYPAD_WIDTH;

  const position = useMemo<Position | null>(() => {
    if (bottomDocked) {
      return positionBottomDocked(
        { width: screen.width, height: screen.height },
        { width: keypadWidth, height: keypadHeight },
        insets.bottom,
      );
    }
    if (activeAnchor === null) {
      return null;
    }
    return computeAnchoredPosition(
      activeAnchor,
      { width: screen.width, height: screen.height },
      { width: keypadWidth, height: keypadHeight },
    );
  }, [
    activeAnchor,
    bottomDocked,
    insets.bottom,
    keypadHeight,
    keypadWidth,
    screen.height,
    screen.width,
  ]);

  const styles = useMemo<Styles | null>(() => {
    if (position === null) {
      return null;
    }
    return buildStyles({
      palette,
      position,
      width: keypadWidth,
      height: keypadHeight,
      bottomDocked,
    });
  }, [bottomDocked, keypadHeight, keypadWidth, palette, position]);

  // On compact the anchor is not consulted — the dock is always at the
  // bottom — so the visibility gate is purely `activeFieldId !== null`.
  // On wide (anchored) the existing `activeAnchor !== null` gate is
  // preserved so the popover only appears once geometry is known.
  const visible =
    activeFieldId !== null && styles !== null && (bottomDocked || activeAnchor !== null);

  return (
    <Modal
      visible={visible}
      transparent
      // `animationType="none"` removes the 250-300 ms fade-in that pilots
      // perceived as a tap-to-keypad lag. Backdrop dismiss + `onRequestClose`
      // are unchanged. See ADR-0011 Iteration 3 §2.
      animationType="none"
      onRequestClose={clearActiveField}
      testID={HOST_TEST_ID}
    >
      {styles === null ? null : (
        <Pressable
          accessibilityLabel={t('keypad.closeAccessibilityLabel')}
          accessibilityRole="button"
          onPress={clearActiveField}
          style={styles.backdrop}
          testID={`${HOST_TEST_ID}-backdrop`}
        >
          {/* Inner Pressable absorbs taps on the popover surface itself so
              they don't propagate up to the dismiss backdrop. */}
          <Pressable accessible={false} onPress={(): void => undefined} style={styles.popover}>
            <NumericKeypad
              onKeyPress={pressKey}
              onDone={done}
              isRegular={activeIsRegular}
              testID={KEYPAD_TEST_ID}
            />
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}
