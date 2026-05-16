/**
 * BracketedLinearStrategy — Excel-equivalent piecewise-linear lookup.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md.
 * Status: active in PR 1 (Dry / RWYCC 6).
 *
 * Excel-equivalent peculiarities replicated here, do NOT "fix":
 *  • IFNA-fallback to `brackets[0].crosswindKnots` (40 KT for Dry) when
 *    XLOOKUP misses on either end. Both below-envelope and
 *    above-envelope route through the same fallback per spec §
 *    "Особенность 1" — preserving the Excel quirk under the
 *    zero-behaviour-change constraint.
 *  • Math.floor() at `params.decimals` precision (ROUNDDOWN equivalent
 *    — always rounds down for positive values; safer for an advisory
 *    limit).
 *  • Discontinuity at bracket boundaries from `E9 = (E8 - E7) / 5`.
 *  • Optional `maxCap`: if set, results above the cap are clamped to it.
 *    PR 1 ships `maxCap: null` for Dry — no cap applied.
 */

import { err, ok } from '../../../../core/result';
import type { Result } from '../../../../core/result';

import type {
  BracketedLinearBracket,
  BracketedLinearParams,
  CalculatorInput,
  CrosswindStrategy,
} from '../strategy';
import type {
  AircraftVariant,
  CalculationMetadata,
  CalculationStrategy,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  CrosswindKnots,
} from '../types';
import { makeCrosswindKnots } from '../valueObjects';

const E9_DIVISOR = 5;
const ROUNDDOWN_DECIMAL_BASE = 10;

/**
 * Tolerance for "CG is exactly on a threshold" detection. The spec test
 * table treats CG values like `34.38763904` as exact matches against the
 * computed threshold `0.0576 × (170 × 2.20462) + 12.8`. With native
 * IEEE-754 doubles, `170 × 2.20462` evaluates to `374.78540000000004`
 * (FP error ≈ 4e-15), so the threshold computes to ≈ 34.387639040000004
 * — a hair above the spec's exact-match value. Without tolerance,
 * exact-breakpoint sub-cases (1.15, 1.19, 1.22, 2.09) classify as
 * "between brackets" and yield the wrong KT value.
 */
const BOUNDARY_EPSILON = 1e-9;

export interface BracketedLinearContext {
  readonly aircraft: AircraftVariant;
  readonly dataVersion: string;
  readonly referenceDocument: string;
  readonly tonsToKilolbsFactor: number;
}

interface Threshold {
  readonly crosswindKnots: number;
  readonly threshold: number;
}

function computeThresholds(
  weightKilolbs: number,
  slope: number,
  brackets: readonly BracketedLinearBracket[],
): readonly Threshold[] {
  return brackets.map((bp) => ({
    crosswindKnots: bp.crosswindKnots,
    threshold: slope * weightKilolbs + bp.intercept,
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

/**
 * ROUNDDOWN-equivalent to `decimals` precision. Always floors for
 * positive values; matches Excel ROUNDDOWN(value, decimals).
 */
function roundDown(value: number, decimals: 0 | 1): number {
  const factor = ROUNDDOWN_DECIMAL_BASE ** decimals;
  return Math.floor(value * factor) / factor;
}

function applyFormula(
  lower: Threshold,
  upper: Threshold,
  cg: number,
  decimals: 0 | 1,
): { readonly value: number } {
  const e7 = lower.threshold;
  const e8 = upper.threshold;
  const f7 = lower.crosswindKnots;
  const e9 = (e8 - e7) / E9_DIVISOR;
  const resultRaw = f7 - (cg - e7) * e9;
  return { value: roundDown(resultRaw, decimals) };
}

interface ResolveArgs {
  readonly thresholds: readonly Threshold[];
  readonly cg: number;
  readonly decimals: 0 | 1;
  readonly fallbackCrosswindKnots: number;
}

function resolveResult(args: ResolveArgs): ComputedResult | FailedResult {
  const { thresholds, cg, decimals, fallbackCrosswindKnots } = args;
  const bottom = thresholds[0];
  const top = thresholds[thresholds.length - 1];
  if (bottom === undefined || top === undefined) {
    return { kind: 'fail', reason: 'empty brackets' };
  }
  const lower = findLowerBound(thresholds, cg);
  const upper = findUpperBound(thresholds, cg);

  if (lower === null) {
    return {
      kind: 'ok',
      value: fallbackCrosswindKnots,
      strategy: 'below-envelope',
      cgLower: bottom.threshold,
      cgUpper: bottom.threshold,
      crosswindLower: fallbackCrosswindKnots,
      crosswindUpper: fallbackCrosswindKnots,
    };
  }
  if (upper === null) {
    return {
      kind: 'ok',
      value: fallbackCrosswindKnots,
      strategy: 'above-envelope',
      cgLower: top.threshold,
      cgUpper: top.threshold,
      crosswindLower: fallbackCrosswindKnots,
      crosswindUpper: fallbackCrosswindKnots,
    };
  }

  const { value } = applyFormula(lower, upper, cg, decimals);
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
  readonly context: BracketedLinearContext;
  readonly weightTons: number;
  readonly computed: ComputedResult;
  readonly bracketLower: CrosswindKnots;
  readonly bracketUpper: CrosswindKnots;
}

function buildMetadata(args: BuildMetadataArgs): CalculationMetadata {
  const { context, weightTons, computed, bracketLower, bracketUpper } = args;
  return {
    dataVersion: context.dataVersion,
    referenceDocument: context.referenceDocument,
    aircraft: context.aircraft,
    weightBracket: { lower: weightTons, upper: weightTons },
    cgBracket: { lower: computed.cgLower, upper: computed.cgUpper },
    bracketCrosswindRange: { lower: bracketLower, upper: bracketUpper },
    calculationStrategy: computed.strategy,
  };
}

function calculate(
  input: CalculatorInput,
  params: BracketedLinearParams,
  context: BracketedLinearContext,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const weightTons = input.weightTons as number;
  const cgPercent = input.cgPercent as number;
  const weightKilolbs = weightTons * context.tonsToKilolbsFactor;

  if (!Number.isFinite(weightKilolbs)) {
    return err({ kind: 'NoLookupData', reason: 'NotFinite' });
  }

  const firstBracket = params.brackets[0];
  if (firstBracket === undefined) {
    return err({ kind: 'CalculationFailed', reason: 'empty brackets' });
  }
  const fallbackCrosswindKnots = firstBracket.crosswindKnots;

  const thresholds = computeThresholds(weightKilolbs, params.slope, params.brackets);
  const computed = resolveResult({
    thresholds,
    cg: cgPercent,
    decimals: params.decimals,
    fallbackCrosswindKnots,
  });
  if (computed.kind === 'fail') {
    return err({ kind: 'CalculationFailed', reason: computed.reason });
  }

  const cappedValue =
    params.maxCap !== null && computed.value > params.maxCap ? params.maxCap : computed.value;

  const knotsResult = makeCrosswindKnots(cappedValue);
  if (!knotsResult.ok) {
    return err({ kind: 'CalculationFailed', reason: `invalid knots: ${cappedValue}` });
  }

  const lowerKnots = makeCrosswindKnots(computed.crosswindLower);
  const upperKnots = makeCrosswindKnots(computed.crosswindUpper);
  if (!lowerKnots.ok || !upperKnots.ok) {
    return err({ kind: 'CalculationFailed', reason: 'invalid bracket crosswind values' });
  }

  return ok({
    maxCrosswindKnots: knotsResult.value,
    metadata: buildMetadata({
      context,
      weightTons,
      computed: { ...computed, value: cappedValue },
      bracketLower: lowerKnots.value,
      bracketUpper: upperKnots.value,
    }),
  });
}

/**
 * Constructs a `CrosswindStrategy` for the bracketed-linear model bound
 * to the given params and dataset context. The returned strategy's
 * `calculate(input)` is a pure function of `input` (the params and
 * context are captured in the closure).
 */
export function createBracketedLinearStrategy(
  params: BracketedLinearParams,
  context: BracketedLinearContext,
): CrosswindStrategy {
  return {
    type: 'bracketedLinear',
    calculate(input) {
      return calculate(input, params, context);
    },
  };
}
