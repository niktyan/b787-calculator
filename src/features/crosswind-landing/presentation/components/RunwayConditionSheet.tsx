/**
 * Modal-centre presentation branch for `RunwayConditionPicker`
 * (iPhone any orientation + iPad portrait per ADR-0018 § UI Layout).
 *
 * Wraps the shared `OptionList` in the design-system `BottomSheet` —
 * slide-up sheet on iPhone, centred surface on iPad portrait.
 * Pixel-identical content to the anchored-right branch, only the
 * outer chrome differs.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ColorPalette, SegmentedControlOption } from '../../../../design-system';
import { BottomSheet, tokens } from '../../../../design-system';

import { OptionList } from './RunwayConditionPicker.parts';
import type { PickerSizing } from './RunwayConditionPicker.sizing';

export interface RunwaySheetProps<TValue extends string> {
  readonly visible: boolean;
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

export function RunwaySheet<TValue extends string>(props: RunwaySheetProps<TValue>): ReactNode {
  const {
    visible,
    title,
    cancelLabel,
    closeAccessibilityLabel,
    palette,
    sizing,
    options,
    selectedValue,
    onSelect,
    onClose,
    testID,
  } = props;
  const containerStyle = useMemo<ViewStyle>(() => styles.container, []);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel={closeAccessibilityLabel}
      {...(testID === undefined ? {} : { testID })}
    >
      <View style={containerStyle}>
        <OptionList
          title={title}
          cancelLabel={cancelLabel}
          palette={palette}
          sizing={sizing}
          options={options}
          selectedValue={selectedValue}
          onSelect={onSelect}
          onCancel={onClose}
          testID={testID}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    maxWidth: tokens.layout.runwayPicker.sheetMaxWidth,
    width: '100%',
  },
});
