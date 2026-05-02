import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Text } from '../Text/Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string | undefined;
  readonly testID?: string | undefined;
  readonly style?: StyleProp<ViewStyle>;
}

interface VariantTone {
  readonly background: string;
  readonly border: string;
  readonly text: 'textOnAccent' | 'accent' | 'textPrimary';
}

function variantTone(variant: ButtonVariant, palette: ColorPalette): VariantTone {
  if (variant === 'primary') {
    return { background: palette.accent, border: palette.accent, text: 'textOnAccent' };
  }
  if (variant === 'secondary') {
    return { background: 'transparent', border: palette.accent, text: 'accent' };
  }
  return { background: 'transparent', border: 'transparent', text: 'accent' };
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const tone = variantTone(variant, palette);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        disabled: {
          opacity: 0.5,
        },
        pressed: {
          opacity: 0.6,
        },
        root: {
          alignItems: 'center',
          backgroundColor: tone.background,
          borderColor: tone.border,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: tokens.layout.minTouchTarget,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
      }),
    [tone.background, tone.border],
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.root,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
      testID={testID}
    >
      <Text variant="body" color={tone.text}>
        {label}
      </Text>
    </Pressable>
  );
}
