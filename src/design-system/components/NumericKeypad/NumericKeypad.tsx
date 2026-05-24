import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTranslation } from '../../../core';
import { useHapticFeedback } from '../../../core/haptics';
import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { KEYPAD_LAYOUT } from './keys';
import type { NumericKeypadKey } from './keys';

// Key heights are slightly tighter than tap-target floor (44 pt) because the
// keypad lives inside a floating popover with limited screen real-estate, but
// each key still presents a generous touchable surface (>= 48 / 56 pt).
const KEY_HEIGHT_COMPACT = 48;
const KEY_HEIGHT_REGULAR = 56;
const KEY_GAP_COMPACT = tokens.spacing.sm;
const KEY_GAP_REGULAR = tokens.spacing.md;
const KEY_LABEL_FONT_COMPACT = 22;
const KEY_LABEL_FONT_REGULAR = 28;
// Explicit lineHeight per key-label font size — without it iOS inherits the
// `<Text variant="mono">` lineHeight (22 pt), which is smaller than the bumped
// font size and visually clips digit glyphs ("7" reads as "/", "1" loses its
// upper flag). lineHeight ≈ fontSize × 1.28 leaves comfortable headroom for
// ascenders/descenders on the system mono face.
const KEY_LABEL_LINE_HEIGHT_COMPACT = 28;
const KEY_LABEL_LINE_HEIGHT_REGULAR = 36;
const KEY_LABEL_FONT_WEIGHT = '600';
const KEY_BORDER_WIDTH = 1;
const KEY_PRESSED_OPACITY = 0.6;
const KEY_ICON_SIZE_COMPACT = 22;
const KEY_ICON_SIZE_REGULAR = 28;
const DONE_MARGIN_TOP_COMPACT = tokens.spacing.sm;
const DONE_MARGIN_TOP_REGULAR = tokens.spacing.md;

export interface NumericKeypadProps {
  readonly onKeyPress: (key: NumericKeypadKey) => void;
  readonly onDone: () => void;
  readonly isRegular?: boolean;
  readonly testID?: string;
}

interface Sizing {
  readonly keyHeight: number;
  readonly keyGap: number;
  readonly keyLabelFont: number;
  readonly keyLabelLineHeight: number;
  readonly keyIconSize: number;
  readonly doneMarginTop: number;
}

function resolveSizing(isRegular: boolean): Sizing {
  if (isRegular) {
    return {
      keyHeight: KEY_HEIGHT_REGULAR,
      keyGap: KEY_GAP_REGULAR,
      keyLabelFont: KEY_LABEL_FONT_REGULAR,
      keyLabelLineHeight: KEY_LABEL_LINE_HEIGHT_REGULAR,
      keyIconSize: KEY_ICON_SIZE_REGULAR,
      doneMarginTop: DONE_MARGIN_TOP_REGULAR,
    };
  }
  return {
    keyHeight: KEY_HEIGHT_COMPACT,
    keyGap: KEY_GAP_COMPACT,
    keyLabelFont: KEY_LABEL_FONT_COMPACT,
    keyLabelLineHeight: KEY_LABEL_LINE_HEIGHT_COMPACT,
    keyIconSize: KEY_ICON_SIZE_COMPACT,
    doneMarginTop: DONE_MARGIN_TOP_COMPACT,
  };
}

interface Styles {
  readonly root: ViewStyle;
  readonly grid: ViewStyle;
  readonly row: ViewStyle;
  readonly key: ViewStyle;
  readonly keyPressed: ViewStyle;
  readonly keyLabel: TextStyle;
  readonly done: ViewStyle;
}

function buildStyles(args: { readonly palette: ColorPalette; readonly sizing: Sizing }): Styles {
  const { palette, sizing } = args;
  return StyleSheet.create({
    done: {
      // `<Button>` carries intrinsic width from its label + padding, which
      // can exceed the popover's inner area without these constraints. See
      // ADR-0011 Iteration 2 §1.
      alignSelf: 'stretch',
      marginTop: sizing.doneMarginTop,
      width: '100%',
    },
    grid: {
      gap: sizing.keyGap,
    },
    key: {
      alignItems: 'center',
      backgroundColor: palette.bgInput,
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: KEY_BORDER_WIDTH,
      flex: 1,
      justifyContent: 'center',
      minHeight: sizing.keyHeight,
    },
    keyLabel: {
      color: palette.textPrimary,
      fontFamily: tokens.typography.fontFamily.mono,
      fontSize: sizing.keyLabelFont,
      fontWeight: KEY_LABEL_FONT_WEIGHT,
      lineHeight: sizing.keyLabelLineHeight,
      textAlign: 'center',
    },
    keyPressed: {
      opacity: KEY_PRESSED_OPACITY,
    },
    // The outer container must stretch to the popover's full content
    // width — without it, `flex: 1` on the keys collapses to intrinsic
    // sizes and the Done button overflows the small parent. See ADR-0011
    // Iteration 3 §1.
    root: {
      width: '100%',
    },
    row: {
      flexDirection: 'row',
      gap: sizing.keyGap,
    },
  });
}

interface KeyButtonProps {
  readonly value: NumericKeypadKey;
  readonly onKeyPress: (key: NumericKeypadKey) => void;
  readonly styles: Styles;
  readonly iconSize: number;
  readonly iconColor: string;
  readonly accessibilityLabel: string;
  readonly testID: string | undefined;
}

function KeyButton({
  value,
  onKeyPress,
  styles,
  iconSize,
  iconColor,
  accessibilityLabel,
  testID,
}: KeyButtonProps): ReactNode {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={(): void => onKeyPress(value)}
      style={({ pressed }): ViewStyle[] =>
        pressed ? [styles.key, styles.keyPressed] : [styles.key]
      }
      testID={testID}
    >
      {value === 'backspace' ? (
        <MaterialIcons name="backspace" size={iconSize} color={iconColor} />
      ) : (
        <Text variant="mono" color="textPrimary" style={styles.keyLabel}>
          {value}
        </Text>
      )}
    </Pressable>
  );
}

function labelForKey(t: (key: string) => string, key: NumericKeypadKey): string {
  if (key === 'backspace') {
    return t('keypad.backspace');
  }
  if (key === '.') {
    return t('keypad.decimalSeparator');
  }
  return key;
}

function keyTestID(testID: string | undefined, key: NumericKeypadKey): string | undefined {
  return testID === undefined ? undefined : `${testID}-key-${key}`;
}

export function NumericKeypad({
  onKeyPress,
  onDone,
  isRegular = false,
  testID,
}: NumericKeypadProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const { t } = useTranslation();
  const haptics = useHapticFeedback();
  const sizing = resolveSizing(isRegular);
  const styles = useMemo(() => buildStyles({ palette, sizing }), [palette, sizing]);

  const handleKeyPress = (key: NumericKeypadKey): void => {
    haptics.lightImpact();
    onKeyPress(key);
  };
  const handleDone = (): void => {
    haptics.mediumImpact();
    onDone();
  };

  return (
    <View style={styles.root} testID={testID}>
      <View style={styles.grid}>
        {KEYPAD_LAYOUT.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => (
              <KeyButton
                key={key}
                value={key}
                onKeyPress={handleKeyPress}
                styles={styles}
                iconSize={sizing.keyIconSize}
                iconColor={palette.textPrimary}
                accessibilityLabel={labelForKey(t, key)}
                testID={keyTestID(testID, key)}
              />
            ))}
          </View>
        ))}
      </View>
      <Button
        label={t('keypad.done')}
        onPress={handleDone}
        variant="primary"
        style={styles.done}
        testID={testID === undefined ? undefined : `${testID}-done`}
      />
    </View>
  );
}
