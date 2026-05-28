/**
 * Domain types for the Crosswind Landing feature module (Sprint C / ADR-0014).
 *
 * Pure TypeScript — no React Native, Expo, or other runtime dependencies.
 *
 * Shared aviation primitives (`AircraftVariant`, `LandingRunwayCondition`,
 * `FlightPhase`) come from `core/aviation` — the same source that the
 * takeoff feature consumes for its own `RunwayCondition`. The two
 * runway-condition unions deliberately diverge (ADR-0018): takeoff uses
 * 6 categories, landing uses 7 because AFM Rev. 20 splits Good.
 * Landing-specific dimensions (`LandingMode`, `YesNo`) live in this
 * module.
 *
 * Unlike Takeoff, Landing does not depend on weight or CG: the algorithm
 * is a categorical lookup with conditional adjustments
 * (`02_Specification/05-crosswind-algorithm.md` — landing extension; see
 * the module contract for the algorithm narrative). No Value Objects for
 * physical quantities, no operational envelope, no piecewise-linear
 * interpolation.
 */

import type { AircraftVariant, LandingRunwayCondition } from '../../../core/aviation';

export const LANDING_MODES = ['manual', 'auto'] as const;
export type LandingMode = (typeof LANDING_MODES)[number];

export const YES_NO_VALUES = ['no', 'yes'] as const;
export type YesNo = (typeof YES_NO_VALUES)[number];

/**
 * Six categorical inputs. Every combination is admissible — the only
 * `DataNotAvailable` paths come from the bundled JSON not shipping an
 * entry for the requested aircraft or runway condition. CAT II-III and
 * ONE ENG INOP are evaluated only in `auto` mode; in `manual` they are
 * ignored (the UI hides those toggles entirely).
 *
 * `runwayCondition` uses the 7-value landing taxonomy from ADR-0018,
 * not the 6-value takeoff `RunwayCondition`. The two unions diverge
 * because the underlying AFM tables diverge.
 */
export interface CrosswindLandingInput {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: LandingRunwayCondition;
  readonly landingMode: LandingMode;
  readonly asymReverse: YesNo;
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
}

/**
 * `appliedAdjustments` records which conditional adjustments fired during
 * the calculation. Not surfaced in the MVP UI (see ADR-0014); reserved
 * for future debug panel / verification overlay use cases.
 */
export interface CrosswindLandingAppliedAdjustments {
  readonly catCap: boolean;
  readonly asymPenalty: boolean;
  readonly inopCap: boolean;
}

export interface CrosswindLandingMetadata {
  readonly dataVersion: string;
  readonly referenceDocument: string;
  readonly aircraft: AircraftVariant;
  readonly landingMode: LandingMode;
  readonly appliedAdjustments: CrosswindLandingAppliedAdjustments;
}

export interface CrosswindLandingOutput {
  readonly maxCrosswindKnots: number;
  readonly metadata: CrosswindLandingMetadata;
}

export type CrosswindLandingDataUnavailableReason =
  | 'aircraft-not-implemented'
  | 'condition-not-implemented'
  | 'mode-not-implemented';

export type CrosswindLandingError =
  | {
      readonly kind: 'DataNotAvailable';
      readonly aircraft: AircraftVariant;
      readonly runwayCondition: LandingRunwayCondition;
      readonly reason: CrosswindLandingDataUnavailableReason;
    }
  | { readonly kind: 'CorruptedDataBundle'; readonly details: string };
