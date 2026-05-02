// Public API of the core module — see 02_Specification/module-contracts/core.md.

// i18n
export { useTranslation, initI18n, setLanguage, getCurrentLanguage } from './i18n';
export type { TranslationKey, SupportedLanguage } from './i18n';

// theming
export { ThemeProvider, useTheme } from './theming';
export type { Theme, ThemeMode, ColorTokens, TypographyTokens } from './theming';

// storage
export { storage } from './storage';
export type { StorageKey } from './storage';

// disclaimer
export { useDisclaimerStatus, acceptDisclaimer } from './disclaimer';

// feature-flags
export { useFeatureFlag } from './feature-flags';
export type { FeatureFlagKey } from './feature-flags';

// logger
export { logger } from './logger';

// result
export { ok, err } from './result';
export type { Result } from './result';
export type { Result as ResultType } from './result';

// coming-soon-modules
export { useComingSoonModules } from './coming-soon-modules';
export type { ComingSoonModule } from './coming-soon-modules';
