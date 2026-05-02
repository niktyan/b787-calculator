/**
 * Design tokens — single source of truth for visual constants.
 *
 * Components consume tokens by:
 *   1. Reading `theme.resolved` from `useTheme()` (`'light' | 'dark'`).
 *   2. Selecting `tokens.colors[resolved]` for the palette.
 *   3. Using theme-independent tokens (spacing, radii, typography, shadows) directly.
 *
 * Color values come from `03_Mockups/index.html` `:root`/`.light` definitions.
 */

import type { TextStyle, ViewStyle } from 'react-native';

// --- Spacing scale (4 / 8 / 12 / 16 / 24 / 32 / 48) ---
const SPACING_XS = 4;
const SPACING_SM = 8;
const SPACING_MD = 12;
const SPACING_LG = 16;
const SPACING_XL = 24;
const SPACING_XXL = 32;
const SPACING_XXXL = 48;

// --- Radii ---
const RADIUS_SM = 4;
const RADIUS_MD = 8;
const RADIUS_LG = 12;
const RADIUS_XL = 16;

// --- Typography sizes (subset of 12 / 14 / 16 / 22 / 28 / 36 / 48 / 64
// from the design-system contract, picked to match `03_Mockups/index.html`). ---
const FONT_SIZE_LABEL = 12;
const FONT_SIZE_CAPTION = 12;
const FONT_SIZE_BODY = 16;
const FONT_SIZE_HEADING_2 = 22;
const FONT_SIZE_HEADING_1 = 28;
const FONT_SIZE_DISPLAY = 48;

// --- Line heights ---
const LINE_HEIGHT_LABEL = 16;
const LINE_HEIGHT_CAPTION = 16;
const LINE_HEIGHT_BODY = 22;
const LINE_HEIGHT_HEADING_2 = 28;
const LINE_HEIGHT_HEADING_1 = 34;
const LINE_HEIGHT_DISPLAY = 56;

// --- Letter spacing ---
const LETTER_SPACING_TIGHT = -0.5;
const LETTER_SPACING_NORMAL = 0;
const LETTER_SPACING_LOOSE = 0.6;

// --- Breakpoints (compact phone, regular tablet) ---
const BREAKPOINT_COMPACT = 480;
const BREAKPOINT_REGULAR = 1024;

// --- Shadow tuning (kept minimal / flat) ---
const SHADOW_OPACITY_SM = 0.08;
const SHADOW_OPACITY_MD = 0.16;
const SHADOW_RADIUS_SM = 4;
const SHADOW_RADIUS_MD = 8;
const SHADOW_OFFSET_Y_SM = 1;
const SHADOW_OFFSET_Y_MD = 2;
const ELEVATION_SM = 1;
const ELEVATION_MD = 3;

// --- Touch target floor ---
const MIN_TOUCH_TARGET = 44;

export interface ColorPalette {
  readonly bgPage: string;
  readonly bgScreen: string;
  readonly bgCard: string;
  readonly bgInput: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly textOnAccent: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly warn: string;
  readonly warnSoft: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly success: string;
  readonly overlay: string;
}

const DARK_PALETTE: ColorPalette = {
  bgPage: '#0A0E14',
  bgScreen: '#0D1117',
  bgCard: '#11161F',
  bgInput: '#11161F',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  textOnAccent: '#001A17',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  accent: '#00C2A8',
  accentSoft: '#003C36',
  warn: '#FFB020',
  warnSoft: 'rgba(255, 176, 32, 0.12)',
  danger: '#E5484D',
  dangerSoft: 'rgba(229, 72, 77, 0.12)',
  success: '#46A758',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

const LIGHT_PALETTE: ColorPalette = {
  bgPage: '#F4F6F9',
  bgScreen: '#F4F6F9',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textOnAccent: '#001A17',
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',
  accent: '#00C2A8',
  accentSoft: '#DEF7F3',
  warn: '#9A6700',
  warnSoft: '#FEF6E7',
  danger: '#E5484D',
  dangerSoft: 'rgba(229, 72, 77, 0.10)',
  success: '#46A758',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

export interface ColorTokens {
  readonly light: ColorPalette;
  readonly dark: ColorPalette;
}

const colors: ColorTokens = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
};

const fontFamilySans = 'System';
const fontFamilyMono = 'Menlo';

export interface TypographyVariant {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: TextStyle['fontWeight'];
  readonly letterSpacing: number;
}

const typography = {
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
      letterSpacing: LETTER_SPACING_TIGHT,
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
    body: {
      fontFamily: fontFamilySans,
      fontSize: FONT_SIZE_BODY,
      lineHeight: LINE_HEIGHT_BODY,
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
    mono: {
      fontFamily: fontFamilyMono,
      fontSize: FONT_SIZE_BODY,
      lineHeight: LINE_HEIGHT_BODY,
      fontWeight: '500',
      letterSpacing: LETTER_SPACING_NORMAL,
    },
  } satisfies Record<string, TypographyVariant>,
} as const;

const spacing = {
  xs: SPACING_XS,
  sm: SPACING_SM,
  md: SPACING_MD,
  lg: SPACING_LG,
  xl: SPACING_XL,
  xxl: SPACING_XXL,
  xxxl: SPACING_XXXL,
} as const;

const radii = {
  sm: RADIUS_SM,
  md: RADIUS_MD,
  lg: RADIUS_LG,
  xl: RADIUS_XL,
} as const;

const shadows: Record<'none' | 'sm' | 'md', ViewStyle> = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: SHADOW_OFFSET_Y_SM },
    shadowOpacity: SHADOW_OPACITY_SM,
    shadowRadius: SHADOW_RADIUS_SM,
    elevation: ELEVATION_SM,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: SHADOW_OFFSET_Y_MD },
    shadowOpacity: SHADOW_OPACITY_MD,
    shadowRadius: SHADOW_RADIUS_MD,
    elevation: ELEVATION_MD,
  },
};

const breakpoints = {
  compact: BREAKPOINT_COMPACT,
  regular: BREAKPOINT_REGULAR,
} as const;

const layout = {
  minTouchTarget: MIN_TOUCH_TARGET,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  breakpoints,
  layout,
} as const;

export type ColorToken = keyof ColorPalette;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type TypographyToken = keyof typeof typography.variants;
export type ShadowToken = keyof typeof shadows;
export type BreakpointToken = keyof typeof breakpoints;
