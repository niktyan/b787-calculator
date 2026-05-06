/**
 * Lookup-range query for the bundled crosswind dataset.
 *
 * Returns the CG (% MAC) interval at a given weight for which the
 * lookup table produces an interpolated number rather than the
 * IFNA-fallback 40 KT (см. `02_Specification/05-crosswind-algorithm.md`
 * Шаг 3, "lowerBound / upperBound" search). The interval is bounded by
 * the first and last breakpoint thresholds, computed as
 * `slope × weightKilolbs + intercept`.
 *
 * Pure data introspection — no business decisions, no side effects.
 *
 * **Block 5 forward signal:** consumed only by the legacy
 * EnvelopePositionBar, which is deleted in Block 5 alongside this
 * helper. Kept compilable through Block 2/3/4 to keep the rebrand PR
 * a sequence of compiling commits.
 */

import type { AircraftVariant, RunwayCondition, WeightInTons } from './types';
import type { CrosswindDataFile } from '../data/schema';

export interface LookupCGRange {
  readonly min: number;
  readonly max: number;
}

export function getLookupCGRange(
  data: CrosswindDataFile,
  aircraft: AircraftVariant,
  condition: RunwayCondition,
  weightTons: WeightInTons,
): LookupCGRange {
  const aircraftEntry = data.byAircraft[aircraft];
  const dataset = aircraftEntry?.[condition];
  if (dataset === undefined) {
    return {
      min: data.operationalEnvelope.cg.minPercent,
      max: data.operationalEnvelope.cg.maxPercent,
    };
  }
  const weightKilolbs = (weightTons as number) * data.weightConversion.tonsToKilolbsFactor;
  const breakpoints = dataset.interpolation.breakpoints;
  const first = breakpoints[0];
  const last = breakpoints[breakpoints.length - 1];
  if (first === undefined || last === undefined) {
    return {
      min: data.operationalEnvelope.cg.minPercent,
      max: data.operationalEnvelope.cg.maxPercent,
    };
  }
  const slope = dataset.interpolation.slope;
  return {
    min: slope * weightKilolbs + first.intercept,
    max: slope * weightKilolbs + last.intercept,
  };
}
