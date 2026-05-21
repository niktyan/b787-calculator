import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Text } from '../Text/Text';
import type { TextVariant } from '../Text/Text';
import { sanitizeDecimalInput } from './sanitizeDecimalInput';

export type NumericInputSize = 'compact' | 'regular';

export interface NumericInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly placeholder?: string;
  readonly unit?: string;
  /** Error message shown below the field. Triggers the danger border. */
  readonly error?: string;
  readonly disabled?: boolean;
  /**
   * `compact` (default) — minHeight 44pt, mono 16pt value, microUppercase
   * 9pt label, monoSmall unit. iPhone.
   * `regular` — minHeight 80pt, monoXL 36pt value, body 16pt unit,
   * body 16pt uppercase weight 600 letterSpacing 1pt label, padding
   * 20×28pt, borderRadius 12pt. iPad-regular Crosswind input column
   * (see 06-ui-spec.md § Экран 4 input sizing — cockpit-glance variant).
   */
  readonly size?: NumericInputSize;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

const BORDER_WIDTH = 1;
const FOCUS_RING_WIDTH = 2;
const DISABLED_OPACITY = 0.5;
// Reserved space for the inline warning text. Always rendered (empty
// when there's no error) so the parent form layout doesn't shift when
// the error toggles on (см. 06-ui-spec.md § Экран 4 Visual treatment
// "Warning text reserved slot"). Sized to one line of `caption`
// (lineHeight 16pt) plus breathing room on regular.
const ERROR_SLOT_HEIGHT_COMPACT = 20;
const ERROR_SLOT_HEIGHT_REGULAR = 24;
const LABEL_COMPACT_STYLE: TextStyle = { textTransform: 'uppercase' };
const REGULAR_LABEL_FONT_WEIGHT = '600';
const REGULAR_LABEL_LETTER_SPACING = 1;
const LABEL_REGULAR_STYLE: TextStyle = {
  fontWeight: REGULAR_LABEL_FONT_WEIGHT,
  letterSpacing: REGULAR_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};
const REGULAR_FIELD_MIN_HEIGHT = 80;
const REGULAR_FIELD_PADDING_VERTICAL = 20;
const REGULAR_FIELD_PADDING_HORIZONTAL = 28;
const REGULAR_INPUT_FONT_SIZE = tokens.typography.variants.monoXL.fontSize;

interface Styles {
  readonly errorSlot: ViewStyle;
  readonly field: ViewStyle;
  readonly fieldRing: ViewStyle;
  readonly input: TextStyle;
  readonly root: ViewStyle;
}

interface SizeMetrics {
  readonly fieldRadius: number;
  readonly minHeight: number;
  readonly paddingHorizontal: number;
  readonly paddingVertical: number;
  readonly inputFontSize: number;
  readonly rootGap: number;
}

function metricsForSize(size: NumericInputSize): SizeMetrics {
  if (size === 'regular') {
    return {
      fieldRadius: tokens.radii.lg,
      minHeight: REGULAR_FIELD_MIN_HEIGHT,
      paddingHorizontal: REGULAR_FIELD_PADDING_HORIZONTAL,
      paddingVertical: REGULAR_FIELD_PADDING_VERTICAL,
      inputFontSize: REGULAR_INPUT_FONT_SIZE,
      rootGap: tokens.spacing.md,
    };
  }
  return {
    fieldRadius: tokens.radii.md,
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    inputFontSize: tokens.typography.variants.mono.fontSize,
    rootGap: tokens.spacing.xs,
  };
}

function buildStyles(args: {
  readonly palette: ColorPalette;
  readonly hasError: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly size: NumericInputSize;
}): Styles {
  const { palette, hasError, focused, disabled, size } = args;
  const fieldBorderColor = hasError ? palette.danger : focused ? palette.accent : palette.border;
  const showRing = focused && !hasError;
  const m = metricsForSize(size);
  const errorSlotHeight =
    size === 'regular' ? ERROR_SLOT_HEIGHT_REGULAR : ERROR_SLOT_HEIGHT_COMPACT;
  return StyleSheet.create({
    errorSlot: {
      justifyContent: 'flex-start',
      minHeight: errorSlotHeight,
    },
    field: {
      alignItems: 'center',
      backgroundColor: palette.bgInput,
      borderColor: fieldBorderColor,
      borderRadius: m.fieldRadius,
      borderWidth: BORDER_WIDTH,
      flexDirection: 'row',
      minHeight: m.minHeight,
      opacity: disabled ? DISABLED_OPACITY : 1,
      paddingHorizontal: m.paddingHorizontal,
      paddingVertical: m.paddingVertical,
    },
    fieldRing: {
      backgroundColor: palette.accentRing,
      borderRadius: m.fieldRadius + FOCUS_RING_WIDTH,
      padding: showRing ? FOCUS_RING_WIDTH : 0,
    },
    input: {
      color: palette.textPrimary,
      flex: 1,
      fontFamily: tokens.typography.fontFamily.mono,
      fontSize: m.inputFontSize,
    },
    root: {
      gap: m.rootGap,
    },
  });
}

function suffixId(testID: string | undefined, suffix: string): string | undefined {
  return testID === undefined ? undefined : `${testID}-${suffix}`;
}

interface SizeVariants {
  readonly labelVariant: TextVariant;
  readonly unitVariant: TextVariant;
}

function variantsForSize(size: NumericInputSize): SizeVariants {
  if (size === 'regular') {
    return { labelVariant: 'body', unitVariant: 'body' };
  }
  return { labelVariant: 'microUppercase', unitVariant: 'monoSmall' };
}

function labelStyleForSize(size: NumericInputSize): TextStyle {
  return size === 'regular' ? LABEL_REGULAR_STYLE : LABEL_COMPACT_STYLE;
}

interface ErrorSlotProps {
  readonly error: string | undefined;
  readonly hasError: boolean;
  readonly style: ViewStyle;
  readonly testID: string | undefined;
}

/**
 * Reserved warning slot. When `hasError` is false, the slot is an empty
 * layout placeholder — explicitly marked non-accessible so VoiceOver skips
 * past it instead of pausing on an empty region. When populated, the error
 * <Text> is the accessibility element encountered right after the input
 * field. See 06-ui-spec.md § Экран 4 "Warning text reserved slot" — the
 * slot exists for layout stability, not as a focus target.
 */
function ErrorSlot({ error, hasError, style, testID }: ErrorSlotProps): ReactNode {
  return (
    <View
      accessible={hasError}
      importantForAccessibility={hasError ? 'auto' : 'no-hide-descendants'}
      style={style}
      testID={suffixId(testID, 'error-slot')}
    >
      {hasError ? (
        <Text variant="caption" color="danger" testID={suffixId(testID, 'error')}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function NumericInput(props: NumericInputProps): ReactNode {
  const {
    value,
    onChange,
    label,
    placeholder,
    unit,
    error,
    disabled = false,
    size = 'compact',
    accessibilityLabel,
    testID,
  } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const [focused, setFocused] = useState(false);
  const hasError = error !== undefined && error.length > 0;
  const hasUnit = unit !== undefined && unit.length > 0;
  const { labelVariant, unitVariant } = variantsForSize(size);
  const inputRef = useRef<TextInput>(null);

  const styles = useMemo(
    () => buildStyles({ palette, hasError, focused, disabled, size }),
    [disabled, focused, hasError, palette, size],
  );

  const handleChangeText = useCallback(
    (next: string): void => {
      onChange(sanitizeDecimalInput(next));
    },
    [onChange],
  );

  const handleFieldPress = useCallback((): void => {
    if (disabled) {
      return;
    }
    inputRef.current?.focus();
  }, [disabled]);

  return (
    <View style={styles.root} testID={testID}>
      <Text variant={labelVariant} color="textSecondary" style={labelStyleForSize(size)}>
        {label}
      </Text>
      <View style={styles.fieldRing}>
        <Pressable
          accessible={false}
          disabled={disabled}
          onPress={handleFieldPress}
          style={styles.field}
        >
          <TextInput
            accessibilityLabel={accessibilityLabel ?? label}
            autoComplete="off"
            autoCorrect={false}
            editable={!disabled}
            inputMode="decimal"
            keyboardType="decimal-pad"
            onBlur={(): void => setFocused(false)}
            onChangeText={handleChangeText}
            onFocus={(): void => setFocused(true)}
            onSubmitEditing={(): void => Keyboard.dismiss()}
            placeholder={placeholder}
            placeholderTextColor={palette.textTertiary}
            ref={inputRef}
            returnKeyType="done"
            spellCheck={false}
            style={styles.input}
            testID={suffixId(testID, 'input')}
            textContentType="none"
            value={value}
          />
          {hasUnit ? (
            <Text variant={unitVariant} color="textTertiary">
              {unit}
            </Text>
          ) : null}
        </Pressable>
      </View>
      <ErrorSlot error={error} hasError={hasError} style={styles.errorSlot} testID={testID} />
    </View>
  );
}
