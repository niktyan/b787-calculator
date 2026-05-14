/**
 * Modal bottom-sheet used by Settings → Language / Theme pickers
 * (см. `02_Specification/06-ui-spec.md` § Экран 5 "Bottom-sheet для
 * Language / Theme"). Tap on backdrop or back-gesture closes the sheet
 * via `onClose`. Slide-up animation comes from React Native's native
 * `Modal` (animationType="slide"); Reduce Motion is honoured at the
 * OS level for modal animations.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

const SHEET_HANDLE_WIDTH = 36;
const SHEET_HANDLE_HEIGHT = 4;
const SHEET_HANDLE_OPACITY = 0.3;
const ROW_BORDER_WIDTH = 1;

export interface BottomSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly closeAccessibilityLabel: string;
  readonly children: ReactNode;
  readonly testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  closeAccessibilityLabel,
  children,
  testID,
}: BottomSheetProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const backdropStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.overlay,
      flex: 1,
      justifyContent: 'flex-end',
    }),
    [palette.overlay],
  );

  const sheetStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.bgCard,
      borderTopLeftRadius: tokens.radii.xl,
      borderTopRightRadius: tokens.radii.xl,
      paddingBottom: tokens.spacing.xl,
      paddingHorizontal: tokens.spacing.md,
      paddingTop: tokens.spacing.md,
    }),
    [palette.bgCard],
  );

  const handleStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: 'center',
      backgroundColor: palette.textTertiary,
      borderRadius: SHEET_HANDLE_HEIGHT / 2,
      height: SHEET_HANDLE_HEIGHT,
      marginBottom: tokens.spacing.md,
      opacity: SHEET_HANDLE_OPACITY,
      width: SHEET_HANDLE_WIDTH,
    }),
    [palette.textTertiary],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        accessibilityLabel={closeAccessibilityLabel}
        accessibilityRole="button"
        onPress={onClose}
        style={backdropStyle}
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
      >
        {/*
         * Inner Pressable absorbs taps on the sheet surface so they don't
         * propagate to the dismiss-backdrop above. `accessible={false}`
         * keeps it out of the VoiceOver focus order — the sheet itself is
         * a passive surface, not a tappable target.
         */}
        <Pressable accessible={false} onPress={(): void => undefined} style={sheetStyle}>
          <View style={handleStyle} />
          <Stack gap="sm">{children}</Stack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface BottomSheetOptionProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
  /**
   * When true, the option row uses the iPad-regular sizing bundle —
   * matches the row height + label font of the underlying screen so
   * the picker doesn't feel visually smaller than the row it opened
   * from (см. 06-ui-spec.md § Адаптивность iPad ↔ iPhone).
   */
  readonly isRegular?: boolean;
}

export function BottomSheetOption({
  label,
  selected,
  onPress,
  testID,
  isRegular = false,
}: BottomSheetOptionProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.settingsRow.regular : tokens.sizing.settingsRow.compact;

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderColor: selected ? palette.accent : palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: ROW_BORDER_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: sizing.minHeight,
      paddingHorizontal: sizing.paddingH,
      paddingVertical: sizing.paddingV,
    }),
    [
      palette.accent,
      palette.bgCard,
      palette.border,
      selected,
      sizing.minHeight,
      sizing.paddingH,
      sizing.paddingV,
    ],
  );
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: sizing.labelSize, fontWeight: sizing.labelWeight }),
    [sizing.labelSize, sizing.labelWeight],
  );
  const checkStyle = useMemo<TextStyle>(() => ({ fontSize: sizing.labelSize }), [sizing.labelSize]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={rowStyle}
      testID={testID}
    >
      <Text variant="caption" color="textPrimary" style={labelStyle}>
        {label}
      </Text>
      {selected ? (
        // Parent Pressable carries accessibilityLabel + selected state,
        // so it becomes the single accessibility element. The ✓ glyph is
        // not read out separately by VoiceOver — selection is announced
        // via the parent's accessibilityState.
        <Text variant="caption" color="accent" style={checkStyle}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}
