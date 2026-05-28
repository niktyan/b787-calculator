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
// reads better at 360 pt single-line. Height accommodates 7 rows at
// regular sizing (7 × 72 pt minHeight) plus title + Cancel + padding.
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 600;

export interface RunwayAnchoredPopoverProps<TValue extends string> {
  readonly visible: boolean;
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

export function RunwayAnchoredPopover<TValue extends string>(
  props: RunwayAnchoredPopoverProps<TValue>,
): ReactNode {
  const {
    visible,
    anchorRef,
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
        cancelLabel={cancelLabel}
        palette={palette}
        sizing={sizing}
        options={options}
        selectedValue={selectedValue}
        onSelect={onSelect}
        onCancel={onClose}
        testID={testID}
      />
    </AnchoredPopoverHost>
  );
}
