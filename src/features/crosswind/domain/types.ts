/**
 * Domain types for the Crosswind feature module.
 *
 * Spec: 02_Specification/04-domain-model.md.
 * Pure TypeScript: no imports from react-native, expo, or any UI framework.
 */

export const AIRCRAFT_VARIANTS = ['b787_8', 'b787_9'] as const;
export type AircraftVariant = (typeof AIRCRAFT_VARIANTS)[number];
/** Public name of the aircraft dimension (alias of AircraftVariant). */
export type Aircraft = AircraftVariant;

export const FLIGHT_PHASES = ['takeoff', 'landing'] as const;
export type FlightPhase = (typeof FLIGHT_PHASES)[number];

export const RUNWAY_CONDITIONS = [
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
] as const;
export type RunwayCondition = (typeof RUNWAY_CONDITIONS)[number];

/**
 * ICAO Runway Condition Code (1–6). Each `RunwayCondition` maps to a
 * single RWYCC value per the FCOM landing/takeoff performance table:
 *   dry          → 6
 *   good         → 5
 *   mediumToGood → 4
 *   medium       → 3
 *   mediumToPoor → 2
 *   poor         → 1
 */
// eslint-disable-next-line no-magic-numbers
export type RunwayConditionCode = 1 | 2 | 3 | 4 | 5 | 6;

export const RWYCC: Readonly<Record<RunwayCondition, RunwayConditionCode>> = {
  dry: 6,
  good: 5,
  mediumToGood: 4,
  medium: 3,
  mediumToPoor: 2,
  poor: 1,
};

// --- Branded Value Objects ---

declare const WeightInTonsBrand: unique symbol;
declare const CGPercentMACBrand: unique symbol;
declare const CrosswindKnotsBrand: unique symbol;

export type WeightInTons = number & { readonly [WeightInTonsBrand]: 'WeightInTons' };
export type CGPercentMAC = number & { readonly [CGPercentMACBrand]: 'CGPercentMAC' };
export type CrosswindKnots = number & { readonly [CrosswindKnotsBrand]: 'CrosswindKnots' };

// --- Value Object errors ---

export type WeightError =
  | { readonly kind: 'NotANumber' }
  | { readonly kind: 'NotFinite' }
  | { readonly kind: 'Negative'; readonly given: number };

export type CGError = { readonly kind: 'NotANumber' } | { readonly kind: 'NotFinite' };

export type CrosswindError =
  | { readonly kind: 'NotANumber' }
  | { readonly kind: 'Negative'; readonly given: number }
  | { readonly kind: 'AboveDemonstrated'; readonly given: number; readonly demonstrated: number };

// --- Calculation input/output ---

export interface CrosswindCalculationInput {
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
  readonly rwyccCode?: RunwayConditionCode;
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}

/**
 * Convenience alias for the takeoff-phase calculation input. Matches the
 * spec name `CrosswindTakeoffInput`. The shared `CrosswindCalculationInput`
 * already holds `phase` so a single shape covers both phases.
 */
export type CrosswindTakeoffInput = CrosswindCalculationInput;

export type CalculationStrategy = 'within-bracket' | 'below-envelope' | 'above-envelope';

export interface CalculationMetadata {
  readonly dataVersion: string;
  readonly referenceDocument: string;
  readonly aircraft: AircraftVariant;
  readonly weightBracket: { readonly lower: number; readonly upper: number };
  readonly cgBracket: { readonly lower: number; readonly upper: number };
  readonly bracketCrosswindRange: {
    readonly lower: CrosswindKnots;
    readonly upper: CrosswindKnots;
  };
  readonly calculationStrategy: CalculationStrategy;
}

export interface CrosswindCalculationOutput {
  readonly maxCrosswindKnots: CrosswindKnots;
  readonly metadata: CalculationMetadata;
}

// --- Calculation errors ---

export type DataUnavailableReason =
  | 'aircraft-not-implemented'
  | 'condition-not-implemented'
  | 'phase-mismatch';

export type CrosswindCalculationError =
  | { readonly kind: 'NoLookupData'; readonly reason: 'NaN' | 'NotFinite' | 'OutsideLookupBounds' }
  | {
      readonly kind: 'DataNotAvailable';
      readonly aircraft: AircraftVariant;
      readonly condition: RunwayCondition;
      readonly reason: DataUnavailableReason;
    }
  | { readonly kind: 'CorruptedDataBundle'; readonly details: string }
  | { readonly kind: 'CalculationFailed'; readonly reason: string };

// --- Operational-envelope validator ---

export type EnvelopeViolation =
  | { readonly kind: 'weight.below'; readonly given: number; readonly minTons: number }
  | { readonly kind: 'weight.above'; readonly given: number; readonly maxTons: number }
  | { readonly kind: 'cg.below'; readonly given: number; readonly minPercent: number }
  | { readonly kind: 'cg.above'; readonly given: number; readonly maxPercent: number };

export interface OperationalEnvelope {
  readonly weight: { readonly minTons: number; readonly maxTons: number };
  readonly cg: { readonly minPercent: number; readonly maxPercent: number };
}
