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

// haptics
export { useHapticFeedback } from './haptics';
export type { HapticFeedback } from './haptics';

// logger
export { logger } from './logger';

// result
export { ok, err } from './result';
export type { Result } from './result';
export type { Result as ResultType } from './result';

// modules (active + coming-soon registry, visibility preferences)
export { useComingSoonModules, useModules, useModuleVisibility } from './modules';
export type {
  ActiveModule,
  ComingSoonModule,
  InactiveModule,
  Module,
  ModuleVisibility,
  UseModuleVisibilityResult,
} from './modules';

// aviation — shared domain primitives (aircraft variant, flight phase,
// runway condition). Consumed by both crosswind takeoff and landing
// features so they do not need to cross-import each other.
export { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS, RWYCC } from './aviation';
export type {
  Aircraft,
  AircraftVariant,
  FlightPhase,
  RunwayCondition,
  RunwayConditionCode,
} from './aviation';
