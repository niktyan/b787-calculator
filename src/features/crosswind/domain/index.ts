// Public API of the Crosswind domain layer.

export type {
  Aircraft,
  AircraftVariant,
  CalculationMetadata,
  CalculationStrategy,
  CGError,
  CGPercentMAC,
  CrosswindCalculationError,
  CrosswindCalculationInput,
  CrosswindCalculationOutput,
  CrosswindError,
  CrosswindKnots,
  CrosswindTakeoffInput,
  DataUnavailableReason,
  CGViolation,
  EnvelopeViolation,
  FlightPhase,
  OperationalEnvelope,
  RunwayCondition,
  RunwayConditionCode,
  WeightError,
  WeightInTons,
  WeightViolation,
} from './types';
export { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS, RWYCC } from './types';

export { makeCGPercentMAC, makeCrosswindKnots, makeWeightInTons } from './valueObjects';

export { validateAlgorithmInput, validateOperationalEnvelope } from './validators';

export { calculateCrosswindLimit, calculateMaxCrosswindTakeoff } from './calculator';

export type {
  BracketedLinearBracket,
  BracketedLinearParams,
  CalculatorInput,
  CrosswindStrategy,
  NoLookupData,
  StrategyResolution,
  StrategyType,
} from './strategy';
export { STRATEGY_TYPES } from './strategy';

export { resolveStrategy } from './strategy-resolver';

export { createBracketedLinearStrategy } from './strategies/bracketed-linear';
export type { BracketedLinearContext } from './strategies/bracketed-linear';
