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

import type { ViewStyle } from 'react-native';

import { BREAKPOINT_REGULAR_HEADER, sizing } from './sizing';
import { typography } from './typography';

export type { TypographyVariant } from './typography';

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

// --- Press-feedback motion ---
//
// Subtle scale + opacity animation applied to interactive surfaces (Button,
// NavPills, module cards). See `02_Specification/06-ui-spec.md` § Анимации.
// Driven by `useScaleOnPress` hook, which respects Reduce Motion.
const PRESS_SCALE_FROM = 1;
const PRESS_SCALE_TO = 0.97;
const PRESS_OPACITY_FROM = 1;
const PRESS_OPACITY_TO = 0.85;
const PRESS_DURATION_IN_MS = 100;
const PRESS_DURATION_OUT_MS = 150;

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
  /**
   * Theme-aware foreground variant of the brand accent, intended for
   * **text and icon foregrounds** that must read on the page/card surface
   * (e.g. result-status label, active NavPill label, Back-arrow text,
   * NavigableSettingsRow → accent value + chevron, picker ✓).
   *
   * Dark theme: `#00C2A8` — identical to `accent`. Brand teal reads
   * cleanly on the dark page (8:1+).
   *
   * Light theme: `#006B5E` — darker variant of the brand teal. Required
   * because `#00C2A8` is only 2.09:1 on `#F4F6F9` (fails WCAG SC 1.4.3
   * AA for body text). `#006B5E` is ~5.9:1 on `bgScreen` / 6.4:1 on
   * `bgCard` (white), passes AA and AAA.
   *
   * Use this token whenever `accent` would otherwise be rendered as text
   * or as a foreground icon glyph. Keep `accent` itself for decorative
   * surfaces (button fills, segment backgrounds, active borders, focus
   * rings, gradients) where contrast is not a body-text concern.
   *
   * See ADR-0009 and `08-quality-gates.md` § Audit findings.
   */
  readonly accentText: string;
  /**
   * Foreground color for content drawn on a `accent`-colored background
   * (e.g., active segmented-control segment, primary button label, gradient
   * active-card icon glyph). Identical in both themes (`#001A17`) for
   * WCAG-AA contrast on the teal accent. See `06-ui-spec.md` § Экран 3.1
   * Coming Soon Modal Visual treatment.
   */
  readonly accentOnAccent: string;
  /**
   * 20%-alpha accent ring used as the focus-state outer glow on
   * `NumericInput` (mirrors mockup `box-shadow: 0 0 0 2px rgba(0, 194,
   * 168, 0.2)`). Identical in both themes — the teal ring reads
   * correctly on both dark and light input surfaces, verified for WCAG
   * AA contrast against the focused border. See `06-ui-spec.md` §
   * Экран 4 Visual treatment "Focus state".
   */
  readonly accentRing: string;
  readonly warn: string;
  readonly warnSoft: string;
  readonly warnBorder: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly success: string;
  readonly overlay: string;
}

const ACCENT_ON_ACCENT = '#001A17';
const ACCENT_RING = 'rgba(0, 194, 168, 0.2)';
const ACCENT_TEXT_DARK = '#00C2A8';
const ACCENT_TEXT_LIGHT = '#006B5E';

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
  accentText: ACCENT_TEXT_DARK,
  accentOnAccent: ACCENT_ON_ACCENT,
  accentRing: ACCENT_RING,
  warn: '#FFB020',
  warnSoft: 'rgba(255, 176, 32, 0.08)',
  warnBorder: 'rgba(255, 176, 32, 0.3)',
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
  accentText: ACCENT_TEXT_LIGHT,
  accentOnAccent: ACCENT_ON_ACCENT,
  accentRing: ACCENT_RING,
  warn: '#9A6700',
  warnSoft: '#FEF6E7',
  warnBorder: '#F0C674',
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
  /**
   * Threshold (≥ 768 pt) above which the Main Menu uses the iPad-regular
   * size set: larger module cards/icons/typography and a single-row header.
   * Matches iPad-mini portrait width — anything narrower is considered a
   * compact phone layout.
   */
  regularHeader: BREAKPOINT_REGULAR_HEADER,
} as const;

const layout = {
  minTouchTarget: MIN_TOUCH_TARGET,
} as const;

const motion = {
  press: {
    scaleFrom: PRESS_SCALE_FROM,
    scaleTo: PRESS_SCALE_TO,
    opacityFrom: PRESS_OPACITY_FROM,
    opacityTo: PRESS_OPACITY_TO,
    durationInMs: PRESS_DURATION_IN_MS,
    durationOutMs: PRESS_DURATION_OUT_MS,
  },
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  breakpoints,
  layout,
  motion,
  sizing,
} as const;

export type ColorToken = keyof ColorPalette;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type TypographyToken = keyof typeof typography.variants;
export type ShadowToken = keyof typeof shadows;
export type BreakpointToken = keyof typeof breakpoints;
