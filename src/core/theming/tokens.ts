import type { ColorTokens, ResolvedColorScheme, TypographyTokens } from './types';

/**
 * Stub token values used by Sprint 1 ThemeProvider so the app can render before
 * the full design system lands in Sprint 2. Values are taken from the mockup palette
 * (see 02_Specification/06-ui-spec.md "Темы и design tokens") and will be replaced
 * by `src/design-system/tokens.ts` in Sprint 2.
 */

const FONT_SIZE_BODY = 16;
const FONT_SIZE_HEADING = 22;
const FONT_SIZE_RESULT = 56;

const SHARED_TYPOGRAPHY: TypographyTokens = {
  fontFamilyBase: 'System',
  fontFamilyMono: 'Menlo',
  fontSizeBody: FONT_SIZE_BODY,
  fontSizeHeading: FONT_SIZE_HEADING,
  fontSizeResult: FONT_SIZE_RESULT,
};

const DARK_COLORS: ColorTokens = {
  background: '#0A0E14',
  surface: '#11161F',
  textPrimary: '#E6EDF3',
  textSecondary: '#9DA9B7',
  accent: '#00C2A8',
  danger: '#E5484D',
  warning: '#FFB020',
  success: '#46A758',
};

const LIGHT_COLORS: ColorTokens = {
  background: '#F7F9FB',
  surface: '#FFFFFF',
  textPrimary: '#0A0E14',
  textSecondary: '#4A5563',
  accent: '#003C36',
  danger: '#E5484D',
  warning: '#FFB020',
  success: '#46A758',
};

export function colorsFor(resolved: ResolvedColorScheme): ColorTokens {
  return resolved === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

export const typography: TypographyTokens = SHARED_TYPOGRAPHY;
