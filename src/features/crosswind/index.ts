// Public API of the Crosswind feature module.
// See 02_Specification/module-contracts/crosswind.md.

// Screen
export { CrosswindScreen } from './presentation';

// Domain types
export type {
  Aircraft,
  CrosswindCalculationInput,
  CrosswindCalculationOutput,
  CrosswindCalculationError,
  CrosswindTakeoffInput,
  EnvelopeViolation,
  WeightInTons,
  CGPercentMAC,
  CrosswindKnots,
} from './domain';

// Pure calculation function
export { calculateCrosswindLimit, calculateMaxCrosswindTakeoff } from './domain';

// Use-case validator
export { validateOperationalEnvelope } from './domain';

// Lookup-range query (Block-5 forward signal: removed alongside EnvelopePositionBar).
export { getLookupCGRange } from './domain';
export type { LookupCGRange } from './domain';

// Repository factory
export { createCrosswindRepository } from './data';
export type { CrosswindRepository } from './data';
