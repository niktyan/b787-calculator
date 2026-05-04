/**
 * Implementation of the `piecewise-linear-excel-equivalent` strategy.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md.
 *
 * Excel-equivalent peculiarities replicated here, do NOT "fix":
 *  • IFNA-fallback to 40 when XLOOKUP misses on either end (below or
 *    above all thresholds).
 *  • Math.floor() for ROUNDDOWN equivalent (always rounds down for
 *    positive values, including the conservative-toward-safety bias).
 *  • Discontinuity at bracket boundaries from `E9 = (E8 - E7) / 5`.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type {
  CalculationMetadata,
  CalculationStrategy,
  CGPercentMAC,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  CrosswindKnots,
  WeightInTons,
} from './types';
import { makeCrosswindKnots } from './valueObjects';

export interface BreakpointInput {
  readonly crosswindKnots: number;
  readonly intercept: number;
}

export interface ExcelEquivalentData {
  readonly slope: number;
  readonly breakpoints: readonly BreakpointInput[];
  readonly tonsToKilolbsFactor: number;
  readonly dataVersion: string;
  readonly referenceDocument: string;
}

export interface ExcelEquivalentInput {
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}

const FALLBACK_CROSSWIND_KT = 40;
const E9_DIVISOR = 5;

/**
 * Tolerance for "CG is exactly on a threshold" detection. The spec test
 * table treats CG values like `34.38763904` as exact matches against the
 * computed threshold `0.0576 × (170 × 2.20462) + 12.8`. With native
 * IEEE-754 doubles, `170 × 2.20462` evaluates to `374.78540000000004`
 * (FP error ≈ 4e-15), so the threshold computes to ≈ 34.387639040000004
 * — a hair above the spec's exact-match value. Without tolerance,
 * exact-breakpoint sub-cases (1.15, 1.19, 1.22, 2.09) classify as
 * "between brackets" and yield the wrong KT value. Tolerance of 1e-9 is
 * three orders of magnitude smaller than any meaningful CG difference
 * (≥ 0.001 % MAC) and six orders of magnitude larger than the FP error.
 */
const BOUNDARY_EPSILON = 1e-9;

interface Threshold {
  readonly crosswindKnots: number;
  readonly threshold: number;
}

function computeThresholds(weightKilolbs: number, data: ExcelEquivalentData): readonly Threshold[] {
  return data.breakpoints.map((bp) => ({
    crosswindKnots: bp.crosswindKnots,
    threshold: data.slope * weightKilolbs + bp.intercept,
  }));
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= BOUNDARY_EPSILON;
}

function findLowerBound(thresholds: readonly Threshold[], cg: number): Threshold | null {
  let best: Threshold | null = null;
  for (const t of thresholds) {
    const qualifies = t.threshold <= cg || nearlyEqual(t.threshold, cg);
    if (qualifies && (best === null || t.threshold > best.threshold)) {
      best = t;
    }
  }
  return best;
}

function findUpperBound(thresholds: readonly Threshold[], cg: number): Threshold | null {
  let best: Threshold | null = null;
  for (const t of thresholds) {
    const qualifies = t.threshold >= cg || nearlyEqual(t.threshold, cg);
    if (qualifies && (best === null || t.threshold < best.threshold)) {
      best = t;
    }
  }
  return best;
}

interface ComputedResult {
  readonly kind: 'ok';
  readonly value: number;
  readonly strategy: CalculationStrategy;
  readonly cgLower: number;
  readonly cgUpper: number;
  readonly crosswindLower: number;
  readonly crosswindUpper: number;
}

interface FailedResult {
  readonly kind: 'fail';
  readonly reason: string;
}

function applyFormula(lower: Threshold, upper: Threshold, cg: number): { readonly value: number } {
  const e7 = lower.threshold;
  const e8 = upper.threshold;
  const f7 = lower.crosswindKnots;
  const e9 = (e8 - e7) / E9_DIVISOR;
  const resultRaw = f7 - (cg - e7) * e9;
  return { value: Math.floor(resultRaw) };
}

function resolveResult(
  thresholds: readonly Threshold[],
  cg: number,
): ComputedResult | FailedResult {
  const bottom = thresholds[0];
  const top = thresholds[thresholds.length - 1];
  if (bottom === undefined || top === undefined) {
    return { kind: 'fail', reason: 'empty breakpoints' };
  }
  const lower = findLowerBound(thresholds, cg);
  const upper = findUpperBound(thresholds, cg);

  if (lower === null) {
    return {
      kind: 'ok',
      value: FALLBACK_CROSSWIND_KT,
      strategy: 'below-envelope',
      cgLower: bottom.threshold,
      cgUpper: bottom.threshold,
      crosswindLower: FALLBACK_CROSSWIND_KT,
      crosswindUpper: FALLBACK_CROSSWIND_KT,
    };
  }
  if (upper === null) {
    return {
      kind: 'ok',
      value: FALLBACK_CROSSWIND_KT,
      strategy: 'above-envelope',
      cgLower: top.threshold,
      cgUpper: top.threshold,
      crosswindLower: FALLBACK_CROSSWIND_KT,
      crosswindUpper: FALLBACK_CROSSWIND_KT,
    };
  }

  const { value } = applyFormula(lower, upper, cg);
  return {
    kind: 'ok',
    value,
    strategy: 'within-bracket',
    cgLower: lower.threshold,
    cgUpper: upper.threshold,
    crosswindLower: upper.crosswindKnots,
    crosswindUpper: lower.crosswindKnots,
  };
}

interface BuildMetadataArgs {
  readonly data: ExcelEquivalentData;
  readonly weightTons: number;
  readonly computed: ComputedResult;
  readonly bracketLower: CrosswindKnots;
  readonly bracketUpper: CrosswindKnots;
}

function buildMetadata(args: BuildMetadataArgs): CalculationMetadata {
  const { data, weightTons, computed, bracketLower, bracketUpper } = args;
  return {
    dataVersion: data.dataVersion,
    referenceDocument: data.referenceDocument,
    weightBracket: { lower: weightTons, upper: weightTons },
    cgBracket: { lower: computed.cgLower, upper: computed.cgUpper },
    bracketCrosswindRange: { lower: bracketLower, upper: bracketUpper },
    calculationStrategy: computed.strategy,
  };
}

export function calculateExcelEquivalent(
  input: ExcelEquivalentInput,
  data: ExcelEquivalentData,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const weightTons = input.weightTons as number;
  const cgPercent = input.cgPercent as number;
  const weightKilolbs = weightTons * data.tonsToKilolbsFactor;

  if (!Number.isFinite(weightKilolbs)) {
    return err({ kind: 'NoLookupData', reason: 'NotFinite' });
  }

  const thresholds = computeThresholds(weightKilolbs, data);
  const computed = resolveResult(thresholds, cgPercent);
  if (computed.kind === 'fail') {
    return err({ kind: 'CalculationFailed', reason: computed.reason });
  }

  const knotsResult = makeCrosswindKnots(computed.value);
  if (!knotsResult.ok) {
    return err({ kind: 'CalculationFailed', reason: `invalid knots: ${computed.value}` });
  }

  const lowerKnots = makeCrosswindKnots(computed.crosswindLower);
  const upperKnots = makeCrosswindKnots(computed.crosswindUpper);
  if (!lowerKnots.ok || !upperKnots.ok) {
    return err({ kind: 'CalculationFailed', reason: 'invalid bracket crosswind values' });
  }

  return ok({
    maxCrosswindKnots: knotsResult.value,
    metadata: buildMetadata({
      data,
      weightTons,
      computed,
      bracketLower: lowerKnots.value,
      bracketUpper: upperKnots.value,
    }),
  });
}
