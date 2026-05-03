/**
 * Adaptive sizing variants for Main Menu (compact phone vs iPad regular).
 *
 * Two parallel value sets keyed by viewport class. Consumers branch on
 * `useWindowDimensions().width >= tokens.breakpoints.regularHeader` (768 pt)
 * and pick the matching object. See `06-ui-spec.md` § Экран 3 Visual treatment.
 *
 * Lives in its own module (instead of inline in tokens.ts) so the main
 * tokens file stays under the 300-line cap. Re-exported through `tokens`
 * so callers see a single namespace: `tokens.sizing.moduleCard.regular`.
 */

// --- Module-card sizing ---
const CARD_PAD_COMPACT = 12;
const CARD_PAD_REGULAR = 20;
const CARD_RADIUS_COMPACT = 10;
const CARD_RADIUS_REGULAR = 12;
const GRID_GAP_COMPACT = 14;
const GRID_GAP_REGULAR = 18;

// --- Module-icon sizing ---
const MODULE_ICON_SIZE_COMPACT = 28;
const MODULE_ICON_SIZE_REGULAR = 40;
const MODULE_ICON_RADIUS_COMPACT = 6;
const MODULE_ICON_RADIUS_REGULAR = 8;
const MODULE_ICON_GLYPH_COMPACT = 11;
const MODULE_ICON_GLYPH_REGULAR = 14;
const MODULE_ICON_MB_COMPACT = 8;
const MODULE_ICON_MB_REGULAR = 12;

// --- Module-name typography ---
const MODULE_NAME_SIZE_COMPACT = 12;
const MODULE_NAME_SIZE_REGULAR = 18;

// --- Module-description typography ---
const MODULE_DESC_SIZE_COMPACT = 10;
const MODULE_DESC_SIZE_REGULAR = 14;
const MODULE_DESC_LINE_HEIGHT_COMPACT = 14;
const MODULE_DESC_LINE_HEIGHT_REGULAR = 21; // 14 × 1.5

// --- Coming-soon badge typography ---
const COMING_BADGE_SIZE_COMPACT = 8;
const COMING_BADGE_SIZE_REGULAR = 11;

// --- Header sizing ---
const APP_LOGO_SIZE_COMPACT = 28;
const APP_LOGO_SIZE_REGULAR = 36;
const APP_LOGO_RADIUS_COMPACT = 6;
const APP_LOGO_RADIUS_REGULAR = 8;
const APP_TITLE_SIZE_COMPACT = 16;
const APP_TITLE_SIZE_REGULAR = 22;
const NAV_PILL_LABEL_COMPACT = 12;
const NAV_PILL_LABEL_REGULAR = 16;
const NAV_PILL_PAD_V_COMPACT = 5;
const NAV_PILL_PAD_V_REGULAR = 8;
const NAV_PILL_PAD_H_COMPACT = 10;
const NAV_PILL_PAD_H_REGULAR = 16;
const NAV_PILL_RADIUS_COMPACT = 10;
const NAV_PILL_RADIUS_REGULAR = 12;

/**
 * Header layout breakpoint: below this width the header collapses into two
 * rows and module cards / typography use the compact size set; at/above it,
 * the iPad-regular size set kicks in.
 */
export const BREAKPOINT_REGULAR_HEADER = 768;

export const sizing = {
  moduleCard: {
    compact: {
      padding: CARD_PAD_COMPACT,
      radius: CARD_RADIUS_COMPACT,
      gridGap: GRID_GAP_COMPACT,
      iconSize: MODULE_ICON_SIZE_COMPACT,
      iconRadius: MODULE_ICON_RADIUS_COMPACT,
      iconGlyphSize: MODULE_ICON_GLYPH_COMPACT,
      iconMarginBottom: MODULE_ICON_MB_COMPACT,
      nameSize: MODULE_NAME_SIZE_COMPACT,
      descriptionSize: MODULE_DESC_SIZE_COMPACT,
      descriptionLineHeight: MODULE_DESC_LINE_HEIGHT_COMPACT,
      badgeSize: COMING_BADGE_SIZE_COMPACT,
    },
    regular: {
      padding: CARD_PAD_REGULAR,
      radius: CARD_RADIUS_REGULAR,
      gridGap: GRID_GAP_REGULAR,
      iconSize: MODULE_ICON_SIZE_REGULAR,
      iconRadius: MODULE_ICON_RADIUS_REGULAR,
      iconGlyphSize: MODULE_ICON_GLYPH_REGULAR,
      iconMarginBottom: MODULE_ICON_MB_REGULAR,
      nameSize: MODULE_NAME_SIZE_REGULAR,
      descriptionSize: MODULE_DESC_SIZE_REGULAR,
      descriptionLineHeight: MODULE_DESC_LINE_HEIGHT_REGULAR,
      badgeSize: COMING_BADGE_SIZE_REGULAR,
    },
  },
  header: {
    compact: {
      logoSize: APP_LOGO_SIZE_COMPACT,
      logoRadius: APP_LOGO_RADIUS_COMPACT,
      titleSize: APP_TITLE_SIZE_COMPACT,
      pillLabelSize: NAV_PILL_LABEL_COMPACT,
      pillPaddingV: NAV_PILL_PAD_V_COMPACT,
      pillPaddingH: NAV_PILL_PAD_H_COMPACT,
      pillRadius: NAV_PILL_RADIUS_COMPACT,
    },
    regular: {
      logoSize: APP_LOGO_SIZE_REGULAR,
      logoRadius: APP_LOGO_RADIUS_REGULAR,
      titleSize: APP_TITLE_SIZE_REGULAR,
      pillLabelSize: NAV_PILL_LABEL_REGULAR,
      pillPaddingV: NAV_PILL_PAD_V_REGULAR,
      pillPaddingH: NAV_PILL_PAD_H_REGULAR,
      pillRadius: NAV_PILL_RADIUS_REGULAR,
    },
  },
} as const;
