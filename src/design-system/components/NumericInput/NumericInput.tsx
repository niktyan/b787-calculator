import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
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

const BORDER_WIDTH = 1;
const COMPACT_FOCUS_RING_WIDTH = 2;
const REGULAR_FOCUS_RING_WIDTH = 3;
const DISABLED_OPACITY = 0.5;
// Polish-3 follow-up: iPad-regular sizing for cockpit viewing distance.
// Auto-detect via `useWindowDimensions` width >= regularHeader (768 pt) —
// same pattern as SegmentedControl wrap.
const REGULAR_FIELD_MIN_HEIGHT = 64;
const REGULAR_PADDING_VERTICAL = 14;
const REGULAR_PADDING_HORIZONTAL = 20;
const COMPACT_INPUT_FONT_SIZE = tokens.typography.variants.mono.fontSize;
const REGULAR_INPUT_FONT_SIZE = tokens.typography.variants.monoMedium.fontSize;
const COMPACT_INPUT_LINE_HEIGHT = tokens.typography.variants.mono.lineHeight;
const REGULAR_INPUT_LINE_HEIGHT = tokens.typography.variants.monoMedium.lineHeight;

const LABEL_UPPERCASE: TextStyle = { textTransform: 'uppercase' };

interface Styles {
  readonly field: ViewStyle;
  readonly fieldRing: ViewStyle;
  readonly input: TextStyle;
  readonly root: ViewStyle;
}

interface SizeMetrics {
  readonly ringWidth: number;
  readonly minHeight: number;
  readonly paddingVertical: number;
  readonly paddingHorizontal: number;
  readonly inputFontSize: number;
  readonly inputLineHeight: number;
  readonly rootGap: number;
}

const COMPACT_METRICS: SizeMetrics = {
  ringWidth: COMPACT_FOCUS_RING_WIDTH,
  minHeight: tokens.layout.minTouchTarget,
  paddingVertical: tokens.spacing.sm,
  paddingHorizontal: tokens.spacing.md,
  inputFontSize: COMPACT_INPUT_FONT_SIZE,
  inputLineHeight: COMPACT_INPUT_LINE_HEIGHT,
  rootGap: tokens.spacing.xs,
};

const REGULAR_METRICS: SizeMetrics = {
  ringWidth: REGULAR_FOCUS_RING_WIDTH,
  minHeight: REGULAR_FIELD_MIN_HEIGHT,
  paddingVertical: REGULAR_PADDING_VERTICAL,
  paddingHorizontal: REGULAR_PADDING_HORIZONTAL,
  inputFontSize: REGULAR_INPUT_FONT_SIZE,
  inputLineHeight: REGULAR_INPUT_LINE_HEIGHT,
  rootGap: tokens.spacing.sm,
};

interface BuildStylesArgs {
  readonly palette: ColorPalette;
  readonly hasError: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly metrics: SizeMetrics;
}

function buildStyles(args: BuildStylesArgs): Styles {
  const { palette, hasError, focused, disabled, metrics } = args;
  const fieldBorderColor = hasError ? palette.danger : focused ? palette.accent : palette.border;
  const showRing = focused && !hasError;
  return StyleSheet.create({
    field: {
      alignItems: 'center',
      backgroundColor: palette.bgInput,
      borderColor: fieldBorderColor,
      borderRadius: tokens.radii.md,
      borderWidth: BORDER_WIDTH,
      flexDirection: 'row',
      minHeight: metrics.minHeight,
      opacity: disabled ? DISABLED_OPACITY : 1,
      paddingHorizontal: metrics.paddingHorizontal,
      paddingVertical: metrics.paddingVertical,
    },
    fieldRing: {
      backgroundColor: palette.accentRing,
      borderRadius: tokens.radii.md + metrics.ringWidth,
      padding: showRing ? metrics.ringWidth : 0,
    },
    input: {
      color: palette.textPrimary,
      flex: 1,
      fontFamily: tokens.typography.fontFamily.mono,
      fontSize: metrics.inputFontSize,
      lineHeight: metrics.inputLineHeight,
    },
    root: {
      gap: metrics.rootGap,
    },
  });
}

function suffixId(testID: string | undefined, suffix: string): string | undefined {
  return testID === undefined ? undefined : `${testID}-${suffix}`;
}

interface FieldBoxProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly placeholder?: string | undefined;
  readonly unit?: string | undefined;
  readonly decimal: boolean;
  readonly disabled: boolean;
  readonly accessibilityLabel?: string | undefined;
  readonly testID?: string | undefined;
  readonly placeholderColor: string;
  readonly setFocused: (next: boolean) => void;
  readonly inputStyle: TextStyle;
  readonly unitVariant: 'body' | 'monoSmall';
}

function FieldBox(props: FieldBoxProps): ReactNode {
  const {
    value,
    onChange,
    label,
    placeholder,
    unit,
    decimal,
    disabled,
    accessibilityLabel,
    testID,
    placeholderColor,
    setFocused,
    inputStyle,
    unitVariant,
  } = props;
  const hasUnit = unit !== undefined && unit.length > 0;
  return (
    <>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        editable={!disabled}
        keyboardType={decimal ? 'decimal-pad' : 'numeric'}
        onBlur={(): void => setFocused(false)}
        onChangeText={onChange}
        onFocus={(): void => setFocused(true)}
        onSubmitEditing={(): void => Keyboard.dismiss()}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        returnKeyType="done"
        style={inputStyle}
        testID={suffixId(testID, 'input')}
        value={value}
      />
      {hasUnit ? (
        <Text variant={unitVariant} color="textTertiary">
          {unit}
        </Text>
      ) : null}
    </>
  );
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
  const { width } = useWindowDimensions();
  const isRegular = width >= tokens.breakpoints.regularHeader;
  const metrics = isRegular ? REGULAR_METRICS : COMPACT_METRICS;

  const styles = useMemo(
    () => buildStyles({ palette, hasError, focused, disabled, metrics }),
    [disabled, focused, hasError, palette, metrics],
  );

  // iPad regular: bigger label (variant `label` 12 pt sans 600) for
  // cockpit readability. Compact keeps `microUppercase` (9 pt) so the
  // existing iPhone visual stays untouched.
  const labelVariant = isRegular ? 'label' : 'microUppercase';
  const unitVariant = isRegular ? 'body' : 'monoSmall';

  return (
    <View style={styles.root} testID={testID}>
      <Text variant={labelVariant} color="textSecondary" style={LABEL_UPPERCASE}>
        {label}
      </Text>
      <View style={styles.fieldRing}>
        <View style={styles.field}>
          <FieldBox
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            unit={unit}
            decimal={decimal}
            disabled={disabled}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
            placeholderColor={palette.textTertiary}
            setFocused={setFocused}
            inputStyle={styles.input}
            unitVariant={unitVariant}
          />
        </View>
      </View>
      {hasError ? (
        <Text variant="caption" color="danger" testID={suffixId(testID, 'error')}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
