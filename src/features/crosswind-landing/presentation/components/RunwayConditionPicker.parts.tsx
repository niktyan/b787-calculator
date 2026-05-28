/**
 * Shared inner content for `RunwayConditionPicker` — the title +
 * option rows + Cancel button block, rendered identically by both
 * presentation modes (modal-centre BottomSheet on iPhone / iPad
 * portrait, anchored popover on iPad landscape). ADR-0018 § UI Layout.
 *
 * Extracted into its own file so each presentation wrapper stays
 * inside the 300-line / 80-line caps and the two branches stay
 * pixel-identical.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ColorPalette, SegmentedControlOption } from '../../../../design-system';
import { Stack, Text, tokens } from '../../../../design-system';

import type { PickerSizing } from './RunwayConditionPicker.sizing';

const PRESSED_OPACITY = 0.6;

export interface OptionListProps<TValue extends string> {
  readonly title: string;
  readonly cancelLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly selectedValue: TValue;
  readonly onSelect: (next: TValue) => void;
  readonly onCancel: () => void;
  readonly testID: string | undefined;
}

export function OptionList<TValue extends string>(props: OptionListProps<TValue>): ReactNode {
  const {
    title,
    cancelLabel,
    palette,
    sizing,
    options,
    selectedValue,
    onSelect,
    onCancel,
    testID,
  } = props;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={title} testID={testID}>
      <Stack gap="sm">
        <Text variant={sizing.titleVariant} color="textSecondary" style={sizing.titleStyle}>
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
              sizing={sizing}
              onPress={(): void => onSelect(option.value)}
              testID={testID === undefined ? undefined : `${testID}-option-${option.value}`}
            />
          ))}
        </View>
        <CancelButton
          label={cancelLabel}
          palette={palette}
          sizing={sizing}
          onPress={onCancel}
          testID={testID === undefined ? undefined : `${testID}-cancel`}
        />
      </Stack>
    </View>
  );
}

interface CancelButtonProps {
  readonly label: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

function CancelButton({ label, palette, sizing, onPress, testID }: CancelButtonProps): ReactNode {
  const cancelStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      alignSelf: 'center',
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      marginTop: tokens.spacing.md,
      minHeight: sizing.fieldMinHeight,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: sizing.fieldPaddingVertical,
    }),
    [palette.border, sizing.fieldMinHeight, sizing.fieldPaddingVertical],
  );
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): ViewStyle[] => {
        const layered: ViewStyle[] = [cancelStyle];
        if (pressed) {
          layered.push(styles.pressed);
        }
        return layered;
      }}
      testID={testID}
    >
      <Text variant={sizing.labelVariant} color="textPrimary" style={sizing.labelStyle}>
        {label}
      </Text>
    </Pressable>
  );
}

interface PickerRowProps {
  readonly label: string;
  readonly selected: boolean;
  readonly showDivider: boolean;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

function PickerRow(props: PickerRowProps): ReactNode {
  const { label, selected, showDivider, palette, sizing, onPress, testID } = props;
  const rowStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: sizing.rowMinHeight,
      paddingHorizontal: sizing.rowPaddingHorizontal,
      paddingVertical: sizing.rowPaddingVertical,
    }),
    [
      palette.border,
      showDivider,
      sizing.rowMinHeight,
      sizing.rowPaddingHorizontal,
      sizing.rowPaddingVertical,
    ],
  );
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }): ViewStyle[] => {
        const layered: ViewStyle[] = [rowStyle];
        if (pressed) {
          layered.push(styles.pressed);
        }
        return layered;
      }}
      testID={testID}
    >
      <Text
        variant={sizing.labelVariant}
        color={selected ? 'accentText' : 'textPrimary'}
        numberOfLines={1}
        style={[styles.rowLabel, sizing.labelStyle]}
      >
        {label}
      </Text>
      {selected ? (
        <Text variant={sizing.labelVariant} color="accentText">
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  rowLabel: {
    flex: 1,
  },
});
