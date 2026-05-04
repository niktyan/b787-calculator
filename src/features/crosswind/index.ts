// Public API of the Crosswind feature module.
// See 02_Specification/module-contracts/crosswind.md.

// Screen
export { CrosswindScreen } from './presentation';

// Domain types
export type {
  CrosswindCalculationInput,
  CrosswindCalculationOutput,
  CrosswindCalculationError,
  EnvelopeViolation,
  WeightInTons,
  CGPercentMAC,
  CrosswindKnots,
} from './domain';

// Pure calculation function
export { calculateCrosswindLimit } from './domain';

// Use-case validator
export { validateOperationalEnvelope } from './domain';

// Lookup-range query (drives the envelope-position bar; see module contract)
export { getLookupCGRange } from './domain';
export type { LookupCGRange } from './domain';

// Repository factory
export { createCrosswindRepository } from './data';
export type { CrosswindRepository } from './data';
