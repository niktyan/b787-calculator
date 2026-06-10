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
 * title, which mirror the `REGULAR_SECTION_LABEL_STYLE` used by the
 * consumer forms (Landing and Takeoff input forms).
 */

import type { TextStyle } from 'react-native';

import { tokens } from '../../tokens';
import type { SegmentedControlSize } from '../SegmentedControl';
import type { TextVariant } from '../Text';

const REGULAR_LABEL_FONT_WEIGHT = '500';
const REGULAR_TITLE_FONT_WEIGHT = '600';
const REGULAR_TITLE_LETTER_SPACING = 1;

// Label bump (user feedback, post-G2): the runway-condition labels —
// closed field and option rows, both size classes — render at the
// heading3 size (18 pt) instead of body (16 pt) so the selected
// condition reads clearly at a glance. Identical in the Takeoff and
// Landing modules because both consume this shared sizing. The size is
// borrowed from the existing typography scale (no new token); `body`'s
// 22 pt line height already matches heading3's, so no override needed.
const LABEL_FONT_SIZE = tokens.typography.variants.heading3.fontSize;

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
      // Weight 500 mirrors the regular-segment label; size bumped to
      // 18 pt per the post-G2 readability feedback (see LABEL_FONT_SIZE).
      labelVariant: 'body',
      labelStyle: { fontSize: LABEL_FONT_SIZE, fontWeight: REGULAR_LABEL_FONT_WEIGHT },
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
    labelStyle: { fontSize: LABEL_FONT_SIZE },
    rowMinHeight: row.minHeight,
    rowPaddingHorizontal: row.paddingH,
    rowPaddingVertical: row.paddingV,
    titleVariant: 'microUppercase',
    titleStyle: undefined,
  };
}
