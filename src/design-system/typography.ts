/**
 * Typography tokens — variant map consumed by the `<Text variant="...">`
 * component and indirectly by every text rendering in the app.
 *
 * Lives in its own module so `tokens.ts` stays under the 300-line cap.
 * Re-exported through `tokens.typography` so callers see a single
 * namespace: `tokens.typography.variants.body`.
 *
 * Variant names and their values are governed by
 * `02_Specification/module-contracts/design-system.md` § Typography
 * variants. Any change to a variant's numeric values requires updating
 * that table in the same PR.
 */

import type { TextStyle } from 'react-native';

// --- Typography sizes (subset of 8 / 9 / 10 / 11 / 12 / 14 / 16 / 18 / 22 / 24 / 28 / 36 / 48 / 64). ---
const FONT_SIZE_MONO_MICRO = 8;
const FONT_SIZE_MICRO_UPPERCASE = 9;
const FONT_SIZE_SEGMENT_LABEL = 10;
const FONT_SIZE_MICRO = 11;
const FONT_SIZE_LABEL = 12;
const FONT_SIZE_CAPTION = 12;
const FONT_SIZE_BODY = 16;
const FONT_SIZE_HEADING_3 = 18;
const FONT_SIZE_HEADING_2 = 22;
const FONT_SIZE_MONO_MEDIUM = 24;
const FONT_SIZE_HEADING_1 = 28;
const FONT_SIZE_DISPLAY = 48;

// --- Line heights ---
const LINE_HEIGHT_MONO_MICRO = 12; // 8 × 1.5; small monoglyph chip readout
const LINE_HEIGHT_MICRO_UPPERCASE = 12; // 9 × 1.33; matches mockup uppercase labels
const LINE_HEIGHT_SEGMENT_LABEL = 14; // 10 × 1.4; SegmentedControl segment label
const LINE_HEIGHT_MICRO = 16; // 11 × 1.5 ≈ 16.5, rounded to nearest pt
const LINE_HEIGHT_LABEL = 16;
const LINE_HEIGHT_CAPTION = 16;
const LINE_HEIGHT_BODY = 22;
const LINE_HEIGHT_HEADING_3 = 22;
const LINE_HEIGHT_HEADING_2 = 28;
const LINE_HEIGHT_MONO_MEDIUM = 28;
const LINE_HEIGHT_HEADING_1 = 34;
const LINE_HEIGHT_MONO_LARGE = 28;
const LINE_HEIGHT_DISPLAY = 56;

// --- Letter spacing (RN points; em values shown for cross-reference with mockup CSS). ---
const LETTER_SPACING_TIGHTER = -0.5; // ≈ -0.02em at 24pt + 28pt + 48pt; used by monoMedium / display
const LETTER_SPACING_TIGHT = -0.18; // ≈ -0.01em at 18pt; used by heading3
const LETTER_SPACING_NORMAL = 0;
const LETTER_SPACING_CHIP = 0.44; // ≈ 0.04em at 11pt; used by chipLabel (uppercase)
const LETTER_SPACING_MICRO_UPPERCASE = 0.54; // ≈ 0.06em at 9pt; used by microUppercase (uppercase)
const LETTER_SPACING_LOOSE = 0.6;

const fontFamilySans = 'System';
const fontFamilyMono = 'Menlo';

export interface TypographyVariant {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: TextStyle['fontWeight'];
  readonly letterSpacing: number;
}

export const typography = {
  fontFamily: {
    sans: fontFamilySans,
    mono: fontFamilyMono,
  },
  variants: {
    display: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_DISPLAY,
      lineHeight: LINE_HEIGHT_DISPLAY,
      fontWeight: '700',
      letterSpacing: LETTER_SPACING_TIGHTER,
    },
    heading1: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_HEADING_1,
      lineHeight: LINE_HEIGHT_HEADING_1,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    heading2: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_HEADING_2,
      lineHeight: LINE_HEIGHT_HEADING_2,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    heading3: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_HEADING_3,
      lineHeight: LINE_HEIGHT_HEADING_3,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_TIGHT,
    },
    body: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_BODY,
      lineHeight: LINE_HEIGHT_BODY,
      fontWeight: '400',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    bodySmall: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_MICRO,
      lineHeight: LINE_HEIGHT_MICRO,
      fontWeight: '400',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    caption: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_CAPTION,
      lineHeight: LINE_HEIGHT_CAPTION,
      fontWeight: '400',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    label: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_LABEL,
      lineHeight: LINE_HEIGHT_LABEL,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_LOOSE,
    },
    chipLabel: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_MICRO,
      lineHeight: LINE_HEIGHT_MICRO,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_CHIP,
    },
    /**
     * Tiny uppercase label — used by input labels, result-status, meta-item
     * labels in the Crosswind Calculator (см. `06-ui-spec.md` Экран 4
     * Visual treatment). Forward-signaled by PR #27.
     */
    microUppercase: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_MICRO_UPPERCASE,
      lineHeight: LINE_HEIGHT_MICRO_UPPERCASE,
      fontWeight: '600',
      letterSpacing: LETTER_SPACING_MICRO_UPPERCASE,
    },
    mono: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_BODY,
      lineHeight: LINE_HEIGHT_BODY,
      fontWeight: '500',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    /**
     * Small monospace — used by result-meta values, input field unit suffix,
     * and Settings/About row values (см. `06-ui-spec.md` Экран 4 Visual
     * treatment "Meta-item value"). Forward-signaled by PR #27.
     */
    monoSmall: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_MICRO,
      lineHeight: LINE_HEIGHT_MICRO,
      fontWeight: '400',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    /**
     * Medium monospace — used by the "KT" suffix on the Crosswind result
     * value — sits between `monoLarge` (22 pt) and `display` (48 pt).
     * Forward-signaled by PR #27.
     */
    monoMedium: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_MONO_MEDIUM,
      lineHeight: LINE_HEIGHT_MONO_MEDIUM,
      fontWeight: '700',
      letterSpacing: LETTER_SPACING_TIGHTER,
    },
    monoLarge: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_HEADING_2,
      lineHeight: LINE_HEIGHT_MONO_LARGE,
      fontWeight: '700',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    /**
     * Tiny mono — used by the source chip on the Crosswind result panel
     * («Reference: 787 FCOM», 8 pt mono per `06-ui-spec.md` Экран 4
     * Visual treatment "Source chip"). Smaller than `monoSmall` (11 pt);
     * intentionally compact to avoid drawing the eye away from the
     * primary value.
     */
    monoMicro: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_MONO_MICRO,
      lineHeight: LINE_HEIGHT_MONO_MICRO,
      fontWeight: '400',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
    /**
     * Segmented-control segment label — sans 10 pt weight 500. Per
     * `06-ui-spec.md` Экран 4 Visual treatment "Segmented control".
     * Smaller than `caption` (12 pt) to keep the track compact while
     * the active-segment background stays visually distinct.
     */
    segmentLabel: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_SEGMENT_LABEL,
      lineHeight: LINE_HEIGHT_SEGMENT_LABEL,
      fontWeight: '500',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
  } satisfies Record<string, TypographyVariant>,
} as const;
