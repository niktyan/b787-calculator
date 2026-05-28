/**
 * Size resolution for the runway-condition picker (ADR-0018 § UI
 * Layout). Routes every size-dependent metric through existing
 * `tokens.sizing.settingsRow` and `tokens.spacing` so the closed
 * field's height + label scale matches the adjacent SegmentedControls
 * at the same breakpoint. See `RunwayConditionPicker.tsx` for the
 * consumer.
 *
 * No new design tokens, no magic numbers — the only literal values
 * here are font weights / letter-spacing for the regular section
 * title, which mirror the form's `REGULAR_SECTION_LABEL_STYLE` used by
 * CrosswindLandingInputForm.
 */

import type { TextStyle } from 'react-native';

import type { SegmentedControlSize, TextVariant } from '../../../../design-system';
import { tokens } from '../../../../design-system';

const REGULAR_LABEL_FONT_WEIGHT = '500';
const REGULAR_TITLE_FONT_WEIGHT = '600';
const REGULAR_TITLE_LETTER_SPACING = 1;

export interface PickerSizing {
  readonly fieldMinHeight: number;
  readonly fieldPaddingHorizontal: number;
  readonly fieldPaddingVertical: number;
  readonly chevronSize: number;
  readonly labelVariant: TextVariant;
  readonly labelStyle: TextStyle | undefined;
  readonly rowMinHeight: number;
  readonly rowPaddingHorizontal: number;
  readonly rowPaddingVertical: number;
  readonly titleVariant: TextVariant;
  readonly titleStyle: TextStyle | undefined;
}

export function resolvePickerSizing(size: SegmentedControlSize): PickerSizing {
  if (size === 'regular') {
    const row = tokens.sizing.settingsRow.regular;
    return {
      // Match the SegmentedControl regular track height (72 pt) via the
      // settings-row regular bundle — same value, same source of truth.
      fieldMinHeight: row.minHeight,
      fieldPaddingHorizontal: row.paddingH,
      fieldPaddingVertical: row.paddingV,
      chevronSize: row.chevronSize,
      // SegmentedControl regular uses `body` (16 pt) + weight 500 —
      // copied 1:1 so the closed field renders the selected label at
      // the same scale as a regular-segment label.
      labelVariant: 'body',
      labelStyle: { fontWeight: REGULAR_LABEL_FONT_WEIGHT },
      rowMinHeight: row.minHeight,
      rowPaddingHorizontal: row.paddingH,
      rowPaddingVertical: row.paddingV,
      // Section-label scale matches the form's regular section labels.
      titleVariant: 'label',
      titleStyle: {
        fontWeight: REGULAR_TITLE_FONT_WEIGHT,
        letterSpacing: REGULAR_TITLE_LETTER_SPACING,
        textTransform: 'uppercase',
      },
    };
  }
  const row = tokens.sizing.settingsRow.compact;
  return {
    fieldMinHeight: tokens.layout.minTouchTarget,
    fieldPaddingHorizontal: tokens.spacing.lg,
    fieldPaddingVertical: tokens.spacing.sm,
    chevronSize: row.chevronSize,
    labelVariant: 'body',
    labelStyle: undefined,
    rowMinHeight: row.minHeight,
    rowPaddingHorizontal: row.paddingH,
    rowPaddingVertical: row.paddingV,
    titleVariant: 'microUppercase',
    titleStyle: undefined,
  };
}
