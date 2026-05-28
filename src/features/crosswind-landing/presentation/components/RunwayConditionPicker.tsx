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
 * Closed-state field mimics a `NumericInput` row (same border radius,
 * padding, height) so the runway condition section visually aligns
 * with the rest of the input column. A trailing chevron-down icon
 * signals the dropdown affordance.
 *
 * Open-state modal reuses the shared `BottomSheet` primitive
 * (`src/design-system/components/BottomSheet`) — already a slide-up
 * modal on iPhone, dismissable by tapping the backdrop. On iPad the
 * sheet is constrained to `tokens.layout.runwayPicker.sheetMaxWidth`
 * for a centred-feel without introducing a new modal-presentation
 * primitive. Each row is a custom `PickerRow` (no extra third-party
 * dependency) with a divider between rows, selected-state accent
 * colour, and trailing ✓ glyph — visually distinct from the bordered
 * card style used by Settings → Language / Theme.
 *
 * No new npm dependencies. Haptic + accessibility behaviour matches
 * the surrounding controls.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useHapticFeedback } from '../../../../core/haptics';
import { useTranslation } from '../../../../core';
import { useTheme } from '../../../../core/theming';
import type { ColorPalette, SegmentedControlOption } from '../../../../design-system';
import { BottomSheet, Stack, Text, tokens } from '../../../../design-system';

export interface RunwayConditionPickerProps<TValue extends string> {
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange: (next: TValue) => void;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

const CHEVRON_SIZE = 20;
const ROW_DIVIDER_WIDTH = 1;
const PRESSED_OPACITY = 0.6;

export function RunwayConditionPicker<TValue extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  testID,
}: RunwayConditionPickerProps<TValue>): ReactNode {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];
  const haptics = useHapticFeedback();
  const [isOpen, setOpen] = useState(false);

  const selectedLabel = useMemo<string>(() => {
    const match = options.find((option) => option.value === value);
    return match?.label ?? '';
  }, [options, value]);

  const open = useCallback((): void => {
    haptics.lightImpact();
    setOpen(true);
  }, [haptics]);

  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  const handleSelect = useCallback(
    (next: TValue): void => {
      haptics.lightImpact();
      setOpen(false);
      onChange(next);
    },
    [haptics, onChange],
  );

  const fieldStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.bgInput,
      borderColor: palette.border,
    }),
    [palette.bgInput, palette.border],
  );

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityValue={{ text: selectedLabel }}
        onPress={open}
        style={({ pressed }): ViewStyle[] => {
          const layered: ViewStyle[] = [styles.field, fieldStyle];
          if (pressed) {
            layered.push(styles.pressed);
          }
          return layered;
        }}
        testID={testID}
      >
        <Text variant="body" color="textPrimary" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={CHEVRON_SIZE}
          color={palette.textSecondary}
          testID={testID === undefined ? undefined : `${testID}-chevron`}
        />
      </Pressable>
      <RunwaySheet
        visible={isOpen}
        title={t('crosswind-landing.runwayConditionSheetTitle')}
        cancelLabel={t('crosswind-landing.runwayConditionSheetCancel')}
        closeAccessibilityLabel={t('crosswind-landing.runwayConditionSheetCancel')}
        palette={palette}
        options={options}
        selectedValue={value}
        onSelect={handleSelect}
        onClose={close}
        testID={testID === undefined ? undefined : `${testID}-sheet`}
      />
    </>
  );
}

interface RunwaySheetProps<TValue extends string> {
  readonly visible: boolean;
  readonly title: string;
  readonly cancelLabel: string;
  readonly closeAccessibilityLabel: string;
  readonly palette: ColorPalette;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly selectedValue: TValue;
  readonly onSelect: (next: TValue) => void;
  readonly onClose: () => void;
  readonly testID: string | undefined;
}

function RunwaySheet<TValue extends string>({
  visible,
  title,
  cancelLabel,
  closeAccessibilityLabel,
  palette,
  options,
  selectedValue,
  onSelect,
  onClose,
  testID,
}: RunwaySheetProps<TValue>): ReactNode {
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: 'center',
      maxWidth: tokens.layout.runwayPicker.sheetMaxWidth,
      width: '100%',
    }),
    [],
  );
  const cancelStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      alignSelf: 'center',
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      marginTop: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.sm,
    }),
    [palette.border],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel={closeAccessibilityLabel}
      {...(testID === undefined ? {} : { testID })}
    >
      <View style={containerStyle} accessibilityRole="radiogroup" accessibilityLabel={title}>
        <Stack gap="sm">
          <Text variant="microUppercase" color="textSecondary">
            {title}
          </Text>
          <View>
            {options.map((option, index) => (
              <PickerRow
                key={option.value}
                label={option.label}
                selected={option.value === selectedValue}
                showDivider={index < options.length - 1}
                palette={palette}
                onPress={(): void => onSelect(option.value)}
                testID={testID === undefined ? undefined : `${testID}-option-${option.value}`}
              />
            ))}
          </View>
          <Pressable
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }): ViewStyle[] => {
              const layered: ViewStyle[] = [cancelStyle];
              if (pressed) {
                layered.push(styles.pressed);
              }
              return layered;
            }}
            testID={testID === undefined ? undefined : `${testID}-cancel`}
          >
            <Text variant="body" color="textPrimary">
              {cancelLabel}
            </Text>
          </Pressable>
        </Stack>
      </View>
    </BottomSheet>
  );
}

interface PickerRowProps {
  readonly label: string;
  readonly selected: boolean;
  readonly showDivider: boolean;
  readonly palette: ColorPalette;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

function PickerRow({
  label,
  selected,
  showDivider,
  palette,
  onPress,
  testID,
}: PickerRowProps): ReactNode {
  const rowStyle = useMemo<ViewStyle>(
    () => ({
      borderBottomColor: palette.border,
      borderBottomWidth: showDivider ? ROW_DIVIDER_WIDTH : 0,
    }),
    [palette.border, showDivider],
  );
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }): ViewStyle[] => {
        const layered: ViewStyle[] = [styles.row, rowStyle];
        if (pressed) {
          layered.push(styles.pressed);
        }
        return layered;
      }}
      testID={testID}
    >
      <Text
        variant="body"
        color={selected ? 'accentText' : 'textPrimary'}
        numberOfLines={1}
        style={styles.rowLabel}
      >
        {label}
      </Text>
      {selected ? (
        <Text variant="body" color="accentText">
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    borderRadius: tokens.layout.runwayPicker.fieldRadius,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.layout.runwayPicker.fieldPaddingHorizontal,
    paddingVertical: tokens.layout.runwayPicker.fieldPaddingVertical,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: tokens.layout.runwayPicker.rowMinHeight,
    paddingHorizontal: tokens.layout.runwayPicker.rowPaddingHorizontal,
    paddingVertical: tokens.layout.runwayPicker.rowPaddingVertical,
  },
  rowLabel: {
    flex: 1,
  },
});
