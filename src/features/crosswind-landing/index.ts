// Public API of the Crosswind Landing feature module.
// See 02_Specification/module-contracts/crosswind-landing.md and
// 02_Specification/ADR/0014-landing-module-architecture.md.

// Screen
export { CrosswindLandingScreen } from './presentation';

// Domain types
export type {
  CrosswindLandingAppliedAdjustments,
  CrosswindLandingDataUnavailableReason,
  CrosswindLandingError,
  CrosswindLandingInput,
  CrosswindLandingMetadata,
  CrosswindLandingOutput,
  LandingMode,
  YesNo,
} from './domain';
export { LANDING_MODES, YES_NO_VALUES } from './domain';

// Pure calculation function
export { calculateLandingCrosswind } from './domain';

// Repository factory
export { createCrosswindLandingRepository } from './data';
export type { CrosswindLandingRepository, CrosswindLandingRepositoryError } from './data';
