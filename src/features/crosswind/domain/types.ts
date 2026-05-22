/**
 * Domain types for the Crosswind feature module.
 *
 * Spec: 02_Specification/04-domain-model.md.
 * Pure TypeScript: no imports from react-native, expo, or any UI framework.
 *
 * Shared aviation primitives (AircraftVariant / FlightPhase /
 * RunwayCondition / RWYCC) live in `core/aviation` so the landing
 * feature can consume the same types without cross-feature imports
 * (forbidden per 02-architecture.md). Re-exported below for backward
 * compatibility with consumers that already import them from this
 * module's barrel.
 */

import type {
  AircraftVariant,
  FlightPhase,
  RunwayCondition,
  RunwayConditionCode,
} from '../../../core/aviation';

export { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS, RWYCC } from '../../../core/aviation';
export type {
  Aircraft,
  AircraftVariant,
  FlightPhase,
  RunwayCondition,
  RunwayConditionCode,
} from '../../../core/aviation';

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

export type WeightViolation =
  | { readonly kind: 'weight.below'; readonly given: number; readonly minTons: number }
  | { readonly kind: 'weight.above'; readonly given: number; readonly maxTons: number };

export type CGViolation =
  | { readonly kind: 'cg.below'; readonly given: number; readonly minPercent: number }
  | { readonly kind: 'cg.above'; readonly given: number; readonly maxPercent: number };

/**
 * Union of weight and CG envelope violations. Kept as an alias for places
 * that need a generic "any envelope violation" type (e.g., the result-panel
 * warning chip). Independent validation flow: see `validateWeightEnvelope`
 * and `validateCGEnvelope` in `validators.ts` — UI surfaces both axes
 * independently when both inputs are out of envelope.
 */
export type EnvelopeViolation = WeightViolation | CGViolation;

export interface OperationalEnvelope {
  readonly weight: { readonly minTons: number; readonly maxTons: number };
  readonly cg: { readonly minPercent: number; readonly maxPercent: number };
}
