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

// Pure calculation function (thin orchestrator → strategy)
export { calculateCrosswindLimit, calculateMaxCrosswindTakeoff } from './domain';

// Strategy pattern surface (Phase D PR 1 — see ADR-0010)
export type {
  BracketedLinearBracket,
  BracketedLinearParams,
  CalculatorInput,
  CrosswindStrategy,
  NoLookupData,
  StrategyResolution,
  StrategyType,
} from './domain';
export { STRATEGY_TYPES, createBracketedLinearStrategy, resolveStrategy } from './domain';

// Use-case validator
export { validateOperationalEnvelope } from './domain';

// Repository factory
export { createCrosswindRepository } from './data';
export type { CrosswindRepository } from './data';
