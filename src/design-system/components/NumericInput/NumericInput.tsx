import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Text } from '../Text/Text';

export interface NumericInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly placeholder?: string;
  readonly unit?: string;
  /** When true, uses `decimal-pad`; otherwise `numeric-pad`. */
  readonly decimal?: boolean;
  /** Error message shown below the field. Triggers the danger border. */
  readonly error?: string;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

const FOCUS_BORDER_WIDTH = 2;
const DISABLED_OPACITY = 0.5;

interface Styles {
  readonly field: ViewStyle;
  readonly input: TextStyle;
  readonly root: ViewStyle;
}

function buildStyles(args: {
  readonly palette: ColorPalette;
  readonly hasError: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
}): Styles {
  const { palette, hasError, focused, disabled } = args;
  const fieldBorderColor = hasError ? palette.danger : focused ? palette.accent : palette.border;
  return StyleSheet.create({
    field: {
      alignItems: 'center',
      backgroundColor: palette.bgInput,
      borderColor: fieldBorderColor,
      borderRadius: tokens.radii.md,
      borderWidth: focused || hasError ? FOCUS_BORDER_WIDTH : 1,
      flexDirection: 'row',
      minHeight: tokens.layout.minTouchTarget,
      opacity: disabled ? DISABLED_OPACITY : 1,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    },
    input: {
      color: palette.textPrimary,
      flex: 1,
      fontFamily: tokens.typography.fontFamily.mono,
      fontSize: tokens.typography.variants.mono.fontSize,
    },
    root: {
      gap: tokens.spacing.xs,
    },
  });
}

function suffixId(testID: string | undefined, suffix: string): string | undefined {
  return testID === undefined ? undefined : `${testID}-${suffix}`;
}

export function NumericInput(props: NumericInputProps): ReactNode {
  const {
    value,
    onChange,
    label,
    placeholder,
    unit,
    decimal = false,
    error,
    disabled = false,
    accessibilityLabel,
    testID,
  } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const [focused, setFocused] = useState(false);
  const hasError = error !== undefined && error.length > 0;
  const hasUnit = unit !== undefined && unit.length > 0;

  const styles = useMemo(
    () => buildStyles({ palette, hasError, focused, disabled }),
    [disabled, focused, hasError, palette],
  );

  return (
    <View style={styles.root} testID={testID}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          editable={!disabled}
          keyboardType={decimal ? 'decimal-pad' : 'numeric'}
          onBlur={(): void => setFocused(false)}
          onChangeText={onChange}
          onFocus={(): void => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={palette.textTertiary}
          style={styles.input}
          testID={suffixId(testID, 'input')}
          value={value}
        />
        {hasUnit ? (
          <Text variant="caption" color="textTertiary">
            {unit}
          </Text>
        ) : null}
      </View>
      {hasError ? (
        <Text variant="caption" color="danger" testID={suffixId(testID, 'error')}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
