/**
 * Anchored-right presentation branch for `RunwayConditionPicker`
 * (iPad landscape only, per ADR-0018 § UI Layout).
 *
 * Wraps the shared `OptionList` in the design-system
 * `AnchoredPopoverHost` — transparent Modal + `measureInWindow`-driven
 * absolute-positioned popover that lands beside the picker field on
 * iPad landscape, overlaying the result panel where they intersect.
 * Reuses the same `computeAnchoredPosition` math the custom numeric
 * keypad uses (ADR-0011 Iteration 2). No animation, snappy dismiss.
 */

import type { ReactNode, RefObject } from 'react';
import type { View } from 'react-native';

import type { ColorPalette, SegmentedControlOption } from '../../../../design-system';
import { AnchoredPopoverHost } from '../../../../design-system';

import { OptionList } from './RunwayConditionPicker.parts';
import type { PickerSizing } from './RunwayConditionPicker.sizing';

// Picker popover surface dimensions — wider than the keypad (280 pt)
// because the longest runway label ("Good (Slush, Dry Snow, Wet Snow)")
// reads better at 360 pt single-line.
//
// Height math at regular sizing (v5 follow-up — Cancel button removed,
// backdrop dismiss only):
//   12 popover topPadding
// + 16 title (label variant 12 pt + line-height 16)
// +  8 Stack gap between title and list
// + 7 × 72 rows at settingsRow.regular.minHeight = 504
// + 12 popover bottomPadding
// = 552 pt → round up to 560 for hairline-divider + sub-pixel buffer.
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 560;

export interface RunwayAnchoredPopoverProps<TValue extends string> {
  readonly visible: boolean;
  readonly anchorRef: RefObject<View | null>;
  readonly title: string;
  readonly closeAccessibilityLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly selectedValue: TValue;
  readonly onSelect: (next: TValue) => void;
  readonly onClose: () => void;
  readonly testID: string | undefined;
}

export function RunwayAnchoredPopover<TValue extends string>(
  props: RunwayAnchoredPopoverProps<TValue>,
): ReactNode {
  const {
    visible,
    anchorRef,
    title,
    closeAccessibilityLabel,
    palette,
    sizing,
    options,
    selectedValue,
    onSelect,
    onClose,
    testID,
  } = props;
  return (
    <AnchoredPopoverHost
      isOpen={visible}
      anchorRef={anchorRef}
      contentSize={{ width: POPOVER_WIDTH, height: POPOVER_HEIGHT }}
      onDismiss={onClose}
      accessibilityDismissLabel={closeAccessibilityLabel}
      {...(testID === undefined ? {} : { testID })}
    >
      <OptionList
        title={title}
        palette={palette}
        sizing={sizing}
        options={options}
        selectedValue={selectedValue}
        onSelect={onSelect}
        testID={testID}
      />
    </AnchoredPopoverHost>
  );
}
