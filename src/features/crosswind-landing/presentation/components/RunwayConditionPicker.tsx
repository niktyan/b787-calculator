/**
 * Crosswind Landing runway-condition picker — single-line dropdown
 * field that opens a bottom-sheet modal listing the 7 options
 * vertically (ADR-0018 § UI Layout).
 *
 * Inspired by the Boeing Onboard Performance Tool COND control. Chosen
 * over a segmented control / grid because the 7 runway-condition
 * labels vary roughly 4× in length ("Dry" vs. "Good (Slush, Dry Snow,
 * Wet Snow)") — any flex-based or fixed-column layout produced visibly
 * uneven button widths or ragged wrapping. A dropdown gives every
 * option the same vertical real-estate at full text length without
 * compromise.
 *
 * The `size` prop mirrors `SegmentedControlSize` and is supplied by
 * the parent form using the same `sizing.segmentedSize` value already
 * resolved by `resolveSizing(isRegular)`. Every size-dependent metric
 * (field height, label variant, chevron size, sheet-row padding, etc.)
 * routes through the existing `tokens.sizing.settingsRow` bundle plus
 * `tokens.spacing` — see `RunwayConditionPicker.sizing.ts`. No new
 * design tokens, no magic numbers. The closed field therefore matches
 * the adjacent SegmentedControls (Aircraft, Landing mode) at
 * iPad-regular height and font scale.
 *
 * Modal sheet rendering lives in `RunwayConditionSheet.tsx` so this
 * file stays inside the 300-line / 80-line caps. No new npm deps.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useHapticFeedback } from '../../../../core/haptics';
import { useTranslation } from '../../../../core';
import { useTheme } from '../../../../core/theming';
import type {
  ColorPalette,
  SegmentedControlOption,
  SegmentedControlSize,
} from '../../../../design-system';
import { Text, tokens } from '../../../../design-system';

import type { PickerSizing } from './RunwayConditionPicker.sizing';
import { resolvePickerSizing } from './RunwayConditionPicker.sizing';
import { RunwaySheet } from './RunwayConditionSheet';

export interface RunwayConditionPickerProps<TValue extends string> {
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange: (next: TValue) => void;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
  /**
   * Picker size class. Defaults to `compact`. Pass `sizing.segmentedSize`
   * from the parent form so the picker scales together with the other
   * SegmentedControls in the same column.
   */
  readonly size?: SegmentedControlSize;
}

const PRESSED_OPACITY = 0.6;

export function RunwayConditionPicker<TValue extends string>(
  props: RunwayConditionPickerProps<TValue>,
): ReactNode {
  const { value, options, onChange, accessibilityLabel, testID, size = 'compact' } = props;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];
  const haptics = useHapticFeedback();
  const [isOpen, setOpen] = useState(false);
  const sizing = useMemo(() => resolvePickerSizing(size), [size]);
  const selectedLabel = useMemo<string>(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value],
  );
  const open = useCallback((): void => {
    haptics.lightImpact();
    setOpen(true);
  }, [haptics]);
  const close = useCallback((): void => setOpen(false), []);
  const handleSelect = useCallback(
    (next: TValue): void => {
      haptics.lightImpact();
      setOpen(false);
      onChange(next);
    },
    [haptics, onChange],
  );

  return (
    <>
      <ClosedField
        accessibilityLabel={accessibilityLabel}
        isOpen={isOpen}
        selectedLabel={selectedLabel}
        palette={palette}
        sizing={sizing}
        onPress={open}
        testID={testID}
      />
      <RunwaySheet
        visible={isOpen}
        title={t('crosswind-landing.runwayConditionSheetTitle')}
        cancelLabel={t('crosswind-landing.runwayConditionSheetCancel')}
        closeAccessibilityLabel={t('crosswind-landing.runwayConditionSheetCancel')}
        palette={palette}
        sizing={sizing}
        options={options}
        selectedValue={value}
        onSelect={handleSelect}
        onClose={close}
        testID={testID === undefined ? undefined : `${testID}-sheet`}
      />
    </>
  );
}

interface ClosedFieldProps {
  readonly accessibilityLabel: string | undefined;
  readonly isOpen: boolean;
  readonly selectedLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

function ClosedField(props: ClosedFieldProps): ReactNode {
  const { accessibilityLabel, isOpen, selectedLabel, palette, sizing, onPress, testID } = props;
  const fieldStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.bgInput,
      borderColor: palette.border,
      minHeight: sizing.fieldMinHeight,
      paddingHorizontal: sizing.fieldPaddingHorizontal,
      paddingVertical: sizing.fieldPaddingVertical,
    }),
    [
      palette.bgInput,
      palette.border,
      sizing.fieldMinHeight,
      sizing.fieldPaddingHorizontal,
      sizing.fieldPaddingVertical,
    ],
  );
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      accessibilityValue={{ text: selectedLabel }}
      onPress={onPress}
      style={({ pressed }): ViewStyle[] => {
        const layered: ViewStyle[] = [styles.field, fieldStyle];
        if (pressed) {
          layered.push(styles.pressed);
        }
        return layered;
      }}
      testID={testID}
    >
      <Text
        variant={sizing.labelVariant}
        color="textPrimary"
        numberOfLines={1}
        style={sizing.labelStyle}
      >
        {selectedLabel}
      </Text>
      <Ionicons
        name="chevron-down"
        size={sizing.chevronSize}
        color={palette.textSecondary}
        testID={testID === undefined ? undefined : `${testID}-chevron`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
