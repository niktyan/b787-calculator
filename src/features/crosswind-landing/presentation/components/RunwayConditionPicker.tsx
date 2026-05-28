/**
 * Crosswind Landing runway-condition picker — single-line dropdown
 * field with a hybrid presentation: anchored popover beside the field
 * on iPad landscape, centred BottomSheet modal everywhere else
 * (ADR-0018 § UI Layout, F2 visual fix v4).
 *
 * Presentation resolution at the call site:
 *
 *   const { width, height } = useWindowDimensions();
 *   const isTwoColumn = width >= tokens.breakpoints.regular;   // 1024
 *   const isLandscape = width > height;
 *   const anchored = isTwoColumn && isLandscape;
 *
 * The compound condition deliberately diverges from the keypad's
 * pure width-only rule because the picker is only relevant in the
 * 2-column landscape layout where the result panel sits to the right
 * of the input column — the right column is precisely where the
 * anchored popover lands. iPad 13" portrait is 1024 wide (so
 * `isTwoColumn` is true there) but vertical, which means we want
 * a centred sheet there, not an anchored popover.
 *
 * Anchored branch reuses the design-system `AnchoredPopoverHost`,
 * which in turn reuses `computeAnchoredPosition` — the same pure
 * function the custom numeric keypad already uses (ADR-0011
 * Iteration 2). Modal-centre branch reuses the existing
 * `BottomSheet`. No animation; backdrop dismiss; no new npm deps.
 *
 * `size` prop continues to drive field height + label scale via
 * `tokens.sizing.settingsRow` — see `RunwayConditionPicker.sizing.ts`.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { View, ViewStyle } from 'react-native';

import { useHapticFeedback } from '../../../../core/haptics';
import { useTranslation } from '../../../../core';
import { useTheme } from '../../../../core/theming';
import type {
  ColorPalette,
  SegmentedControlOption,
  SegmentedControlSize,
} from '../../../../design-system';
import { Text, tokens } from '../../../../design-system';

import { RunwayAnchoredPopover } from './RunwayConditionAnchored';
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
  const { width, height } = useWindowDimensions();
  const palette = tokens.colors[theme.resolved];
  const haptics = useHapticFeedback();
  const [isOpen, setOpen] = useState(false);
  const anchorRef = useRef<View | null>(null);
  const sizing = useMemo(() => resolvePickerSizing(size), [size]);
  const selectedLabel = useMemo<string>(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value],
  );
  const presentationAnchored = width >= tokens.breakpoints.regular && width > height;
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
        anchorRef={anchorRef}
        isOpen={isOpen}
        selectedLabel={selectedLabel}
        palette={palette}
        sizing={sizing}
        onPress={open}
        testID={testID}
      />
      <PickerPresentation
        anchored={presentationAnchored}
        isOpen={isOpen}
        anchorRef={anchorRef}
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

interface PickerPresentationProps<TValue extends string> {
  readonly anchored: boolean;
  readonly isOpen: boolean;
  readonly anchorRef: RefObject<View | null>;
  readonly title: string;
  readonly cancelLabel: string;
  readonly closeAccessibilityLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly selectedValue: TValue;
  readonly onSelect: (next: TValue) => void;
  readonly onClose: () => void;
  readonly testID: string | undefined;
}

function PickerPresentation<TValue extends string>(
  props: PickerPresentationProps<TValue>,
): ReactNode {
  const { anchored, isOpen, anchorRef, ...rest } = props;
  if (anchored) {
    return <RunwayAnchoredPopover visible={isOpen} anchorRef={anchorRef} {...rest} />;
  }
  return <RunwaySheet visible={isOpen} {...rest} />;
}

interface ClosedFieldProps {
  readonly accessibilityLabel: string | undefined;
  readonly anchorRef: RefObject<View | null>;
  readonly isOpen: boolean;
  readonly selectedLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

function ClosedField(props: ClosedFieldProps): ReactNode {
  const { accessibilityLabel, anchorRef, isOpen, selectedLabel, palette, sizing, onPress, testID } =
    props;
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
      ref={anchorRef}
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
