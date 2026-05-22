import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTranslation } from '../../../core';
import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { NumericKeypad } from './NumericKeypad';
import { useNumericKeypadContext } from './NumericKeypadContext';
import type { FieldAnchor } from './NumericKeypadContext';

const HOST_TEST_ID = 'numeric-keypad-host';
const KEYPAD_TEST_ID = 'numeric-keypad';

// Popover dimensions are fixed because (a) the keypad's layout is itself
// fixed (4×3 grid + Done), and (b) measuring the popover before mount in
// order to place it would require a layout pass we'd rather avoid.
// `KEYPAD_HEIGHT` carries a buffer over the strict content height so that
// `<Button variant="primary">` internal padding + regular-size doneMarginTop
// always fit. See ADR-0011 Iteration 3 § Done button containment.
const KEYPAD_WIDTH = 280;
const KEYPAD_HEIGHT = 400;
const SCREEN_MARGIN = 16;
const ANCHOR_OFFSET = 8;
// Match `tokens.breakpoints.regularHeader` — anything from iPad-mini portrait
// upwards picks the "beside the field" cascade; iPhone-width screens use the
// "above/below the field" cascade. See ADR-0011 Iteration 2 §3.
const COMPACT_WIDTH_BREAKPOINT = 768;
const KEYPAD_BORDER_WIDTH = 1;
const KEYPAD_SHADOW_OFFSET_Y = 4;
const KEYPAD_SHADOW_OPACITY = 0.25;
const KEYPAD_SHADOW_RADIUS = 12;
const KEYPAD_ELEVATION = 8;
const HALF = 2;

interface Position {
  readonly top: number;
  readonly left: number;
}

interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

interface KeypadSize {
  readonly width: number;
  readonly height: number;
}

function clampVertical(preferredTop: number, keypadHeight: number, screenHeight: number): number {
  const maxTop = screenHeight - keypadHeight - SCREEN_MARGIN;
  if (preferredTop > maxTop) {
    return Math.max(SCREEN_MARGIN, maxTop);
  }
  if (preferredTop < SCREEN_MARGIN) {
    return SCREEN_MARGIN;
  }
  return preferredTop;
}

function horizontalCenterOnField(
  anchor: FieldAnchor,
  screen: ScreenSize,
  keypadSize: KeypadSize,
): number {
  const fieldCenterX = anchor.x + anchor.width / HALF;
  const preferredLeft = fieldCenterX - keypadSize.width / HALF;
  const maxLeft = screen.width - keypadSize.width - SCREEN_MARGIN;
  if (preferredLeft < SCREEN_MARGIN) {
    return SCREEN_MARGIN;
  }
  if (preferredLeft > maxLeft) {
    return Math.max(SCREEN_MARGIN, maxLeft);
  }
  return preferredLeft;
}

function positionAboveOrBelow(
  anchor: FieldAnchor,
  screen: ScreenSize,
  keypadSize: KeypadSize,
): Position {
  const topSpace = anchor.y;
  const bottomSpace = screen.height - (anchor.y + anchor.height);
  const requiredVertical = keypadSize.height + ANCHOR_OFFSET + SCREEN_MARGIN;

  let top: number;
  if (topSpace >= requiredVertical) {
    top = anchor.y - keypadSize.height - ANCHOR_OFFSET;
  } else if (bottomSpace >= requiredVertical) {
    top = anchor.y + anchor.height + ANCHOR_OFFSET;
  } else {
    // Neither side fits — pick the side with more room and clamp.
    top =
      topSpace > bottomSpace ? SCREEN_MARGIN : screen.height - keypadSize.height - SCREEN_MARGIN;
  }

  return { top, left: horizontalCenterOnField(anchor, screen, keypadSize) };
}

function positionBesideOrAbove(
  anchor: FieldAnchor,
  screen: ScreenSize,
  keypadSize: KeypadSize,
): Position {
  const rightSpace = screen.width - (anchor.x + anchor.width);
  const leftSpace = anchor.x;
  const requiredHorizontal = keypadSize.width + ANCHOR_OFFSET + SCREEN_MARGIN;

  if (rightSpace >= requiredHorizontal) {
    return {
      left: anchor.x + anchor.width + ANCHOR_OFFSET,
      top: clampVertical(anchor.y, keypadSize.height, screen.height),
    };
  }
  if (leftSpace >= requiredHorizontal) {
    return {
      left: anchor.x - keypadSize.width - ANCHOR_OFFSET,
      top: clampVertical(anchor.y, keypadSize.height, screen.height),
    };
  }
  // Wide screen, no side room (rare — e.g. extra-wide field on iPad mini
  // portrait) — fall back to the compact-screen above/below behaviour.
  return positionAboveOrBelow(anchor, screen, keypadSize);
}

// Exported for unit-testing the pure positioning logic without mounting the
// Modal tree. See `__tests__/NumericKeypadHost.test.tsx`.
export function computeKeypadPosition(
  anchor: FieldAnchor,
  screen: ScreenSize,
  keypadSize: KeypadSize = { width: KEYPAD_WIDTH, height: KEYPAD_HEIGHT },
): Position {
  if (screen.width >= COMPACT_WIDTH_BREAKPOINT) {
    return positionBesideOrAbove(anchor, screen, keypadSize);
  }
  return positionAboveOrBelow(anchor, screen, keypadSize);
}

interface Styles {
  readonly backdrop: ViewStyle;
  readonly popover: ViewStyle;
}

function buildStyles(args: {
  readonly palette: ColorPalette;
  readonly position: Position;
}): Styles {
  const { palette, position } = args;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
    },
    popover: {
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: KEYPAD_BORDER_WIDTH,
      elevation: KEYPAD_ELEVATION,
      height: KEYPAD_HEIGHT,
      left: position.left,
      padding: tokens.spacing.md,
      position: 'absolute',
      shadowColor: palette.overlay,
      shadowOffset: { width: 0, height: KEYPAD_SHADOW_OFFSET_Y },
      shadowOpacity: KEYPAD_SHADOW_OPACITY,
      shadowRadius: KEYPAD_SHADOW_RADIUS,
      top: position.top,
      width: KEYPAD_WIDTH,
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

  const position = useMemo<Position | null>(() => {
    if (activeAnchor === null) {
      return null;
    }
    return computeKeypadPosition(activeAnchor, { width: screen.width, height: screen.height });
  }, [activeAnchor, screen.width, screen.height]);

  const styles = useMemo<Styles | null>(() => {
    if (position === null) {
      return null;
    }
    return buildStyles({ palette, position });
  }, [palette, position]);

  const visible = activeFieldId !== null && activeAnchor !== null && styles !== null;

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
