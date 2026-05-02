/**
 * Theme types — public type contract of core/theming.
 *
 * The actual token VALUES are provided by `src/design-system/tokens.ts` (Sprint 2).
 * This file only fixes the SHAPE so that consumers can be type-checked against it.
 */

export const THEME_MODES = ['auto', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export type ResolvedColorScheme = 'light' | 'dark';

/**
 * Token shape stub. Sprint 2 (design-system) extends this with the full palette.
 * Keeping it flat and small here keeps Sprint 1 honest — we don't ship invented tokens.
 */
export interface ColorTokens {
  readonly background: string;
  readonly surface: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly accent: string;
  readonly danger: string;
  readonly warning: string;
  readonly success: string;
}

export interface TypographyTokens {
  readonly fontFamilyBase: string;
  readonly fontFamilyMono: string;
  readonly fontSizeBody: number;
  readonly fontSizeHeading: number;
  readonly fontSizeResult: number;
}

export interface Theme {
  readonly mode: ThemeMode;
  readonly resolved: ResolvedColorScheme;
  readonly colors: ColorTokens;
  readonly typography: TypographyTokens;
}
