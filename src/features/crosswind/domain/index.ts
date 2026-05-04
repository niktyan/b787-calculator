// Public API of the Crosswind domain layer.

export type {
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
  EnvelopeViolation,
  FlightPhase,
  OperationalEnvelope,
  RunwayCondition,
  RunwayConditionCode,
  WeightError,
  WeightInTons,
} from './types';
export { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS } from './types';

export { makeCGPercentMAC, makeCrosswindKnots, makeWeightInTons } from './valueObjects';

export { validateAlgorithmInput, validateOperationalEnvelope } from './validators';

export { calculateCrosswindLimit } from './calculator';
export type { CalculatorInput } from './calculator';

export { getLookupCGRange } from './lookupRange';
export type { LookupCGRange } from './lookupRange';
