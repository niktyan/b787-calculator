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

import { useMemo } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { View } from 'react-native';

import { AnchoredPopoverHost } from '../../anchored-popover';
import type { ColorPalette } from '../../tokens';
import { tokens } from '../../tokens';
import type { SegmentedControlOption } from '../SegmentedControl';

import { OptionList } from './RunwayConditionPicker.parts';
import type { PickerSizing } from './RunwayConditionPicker.sizing';

// Picker popover surface dimensions — wider than the keypad (280 pt)
// because the longest runway label ("Good (Slush, Dry Snow, Wet Snow)")
// reads better at 360 pt single-line.
//
// Height is computed from the consumer's option count (G2 / ADR-0021 —
// Landing passes 7 rows, Takeoff passes 6; a fixed 7-row height would
// leave a dead strip under shorter lists):
//   chrome = popover top+bottom padding (2 × spacing.md)
//          + title line (label variant 12 pt renders at 16 pt line
//            height — no line-height token exists)
//          + Stack gap "sm" between title and list,
//   height = chrome + rows × sizing.rowMinHeight + buffer.
// At regular sizing with 7 rows: 24 + 16 + 8 + 504 + 8 = 560 pt —
// identical to the fixed v5 value, so Landing renders unchanged.
const POPOVER_WIDTH = 360;
const POPOVER_TITLE_LINE_HEIGHT = 16;
const POPOVER_VERTICAL_CHROME =
  2 * tokens.spacing.md + POPOVER_TITLE_LINE_HEIGHT + tokens.spacing.sm;
// Hairline dividers + sub-pixel rounding headroom.
const POPOVER_HEIGHT_BUFFER = 8;

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
  const contentSize = useMemo(
    () => ({
      width: POPOVER_WIDTH,
      height:
        POPOVER_VERTICAL_CHROME + options.length * sizing.rowMinHeight + POPOVER_HEIGHT_BUFFER,
    }),
    [options.length, sizing.rowMinHeight],
  );
  return (
    <AnchoredPopoverHost
      isOpen={visible}
      anchorRef={anchorRef}
      contentSize={contentSize}
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
