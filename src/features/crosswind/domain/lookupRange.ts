/**
 * Lookup-range query for the bundled crosswind dataset.
 *
 * Returns the CG (% MAC) interval at a given landing weight for which
 * the lookup table produces an interpolated number rather than the
 * IFNA-fallback 40 KT (см. `02_Specification/05-crosswind-algorithm.md`
 * Шаг 3, "lowerBound / upperBound" search). The interval is bounded by
 * the first and last breakpoint thresholds, computed as
 * `slope × weightKilolbs + intercept`.
 *
 * Pure data introspection — no business decisions, no side effects.
 * Used by the presentation layer to drive the `EnvelopePositionBar`
 * zones; not consumed by `calculateCrosswindLimit` itself.
 *
 * The bundled JSON schema requires `breakpoints.length === 5`, so the
 * defensive fallbacks below are unreachable in production and exist
 * solely to satisfy `noUncheckedIndexedAccess`.
 */

import type { CrosswindDataFile } from '../data/schema';

import type { WeightInTons } from './types';

export interface LookupCGRange {
  readonly min: number;
  readonly max: number;
}

export function getLookupCGRange(data: CrosswindDataFile, weightTons: WeightInTons): LookupCGRange {
  const weightKilolbs = (weightTons as number) * data.weightConversion.tonsToKilolbsFactor;
  const breakpoints = data.interpolation.breakpoints;
  const first = breakpoints[0];
  const last = breakpoints[breakpoints.length - 1];
  if (first === undefined || last === undefined) {
    return {
      min: data.operationalEnvelope.cg.minPercent,
      max: data.operationalEnvelope.cg.maxPercent,
    };
  }
  const slope = data.interpolation.slope;
  return {
    min: slope * weightKilolbs + first.intercept,
    max: slope * weightKilolbs + last.intercept,
  };
}
