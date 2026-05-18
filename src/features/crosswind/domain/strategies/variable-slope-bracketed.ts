/**
 * VariableSlopeBracketedStrategy — piecewise-linear lookup with a
 * per-bracket slope.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md § "VariableSlopeBracketedStrategy".
 * Status: active in PR 5 (Medium / RWYCC 3).
 *
 * Differences vs `BracketedLinearStrategy` (which Dry/Good/MediumToGood use):
 *  • Each bracket carries its own `slope` (not shared across brackets).
 *    Threshold D[i] = brackets[i].slope · W_kilolbs + brackets[i].intercept.
 *  • Interpolation formula is the Excel-faithful conditional:
 *      G7 = F7 − (CG − E7)/E9   when E9 ≥ 1   ← true linear interpolation
 *      G7 = F7 − (CG − E7)·E9   when E9 < 1   ← BracketedLinear-equivalent
 *    where E9 = (E8 − E7)/5 (same divisor as BracketedLinear).
 *
 *    For Medium params at all in-envelope weights, E9 > 1, so the
 *    division branch is exercised. The multiplication branch is kept
 *    for forward-compat with potential future VariableSlope datasets
 *    that have tightly-spaced brackets (E9 < 1).
 *
 * Excel-equivalent behaviors preserved (matches BracketedLinear):
 *  • IFNA-fallback to `brackets[0].crosswindKnots` (25 KT for Medium)
 *    on both below-envelope and above-envelope CG.
 *  • ROUNDDOWN at `params.decimals` precision via `Math.floor`. Medium
 *    uses decimals=1 — the first 1-decimal-precision condition.
 *  • Optional `maxCap` clamps results above the cap. Medium ships
 *    `maxCap: null` (no clamp).
 *
 * Implementation note: helpers are duplicated from `bracketed-linear.ts`
 * (e.g. `nearlyEqual`, `findLowerBound`, `findUpperBound`, `roundDown`,
 * `buildMetadata`-shaped logic). Sharing them would require modifying
 * BracketedLinearStrategy, which is out of scope for PR 5. Future PRs
 * may consolidate to a shared utilities module if the pattern matures.
 */

import { err, ok } from '../../../../core/result';
import type { Result } from '../../../../core/result';

import type { CalculatorInput, CrosswindStrategy, VariableSlopeBracketedParams } from '../strategy';
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
const E9_FORMULA_THRESHOLD = 1;

/**
 * Tolerance for "CG is exactly on a threshold" detection. Mirrors the
 * BracketedLinear strategy's EPSILON — see that file's commentary for
 * the IEEE-754 rationale. The tolerance applies to per-bracket
 * thresholds computed as `slope_i × W_kilolbs + intercept_i`.
 */
const BOUNDARY_EPSILON = 1e-9;

export interface VariableSlopeBracketedContext {
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
  brackets: VariableSlopeBracketedParams['brackets'],
): readonly Threshold[] {
  return brackets.map((bp) => ({
    crosswindKnots: bp.crosswindKnots,
    threshold: bp.slope * weightKilolbs + bp.intercept,
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

function roundDown(value: number, decimals: 0 | 1): number {
  const factor = ROUNDDOWN_DECIMAL_BASE ** decimals;
  return Math.floor(value * factor) / factor;
}

function interpolate(lower: Threshold, upper: Threshold, cg: number): number {
  // E9 = (E8 − E7) / 5. The Excel conditional preserves BracketedLinear-
  // style "·E9" behavior when brackets are tightly spaced (E9 < 1) and
  // switches to true linear interpolation ("/E9") for the
  // Medium-style spread (E9 ≥ 1).
  const e7 = lower.threshold;
  const e8 = upper.threshold;
  const f7 = lower.crosswindKnots;
  const e9 = (e8 - e7) / E9_DIVISOR;
  if (e9 >= E9_FORMULA_THRESHOLD) {
    return f7 - (cg - e7) / e9;
  }
  return f7 - (cg - e7) * e9;
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

  const resultRaw = interpolate(lower, upper, cg);
  return {
    kind: 'ok',
    value: roundDown(resultRaw, decimals),
    strategy: 'within-bracket',
    cgLower: lower.threshold,
    cgUpper: upper.threshold,
    crosswindLower: upper.crosswindKnots,
    crosswindUpper: lower.crosswindKnots,
  };
}

interface BuildMetadataArgs {
  readonly context: VariableSlopeBracketedContext;
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
  params: VariableSlopeBracketedParams,
  context: VariableSlopeBracketedContext,
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

  const thresholds = computeThresholds(weightKilolbs, params.brackets);
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
 * Constructs a `CrosswindStrategy` for the variable-slope bracketed
 * model bound to the given params and dataset context. The returned
 * strategy's `calculate(input)` is a pure function of `input` (params
 * + context captured in the closure).
 */
export function createVariableSlopeBracketedStrategy(
  params: VariableSlopeBracketedParams,
  context: VariableSlopeBracketedContext,
): CrosswindStrategy {
  return {
    type: 'variableSlopeBracketed',
    calculate(input) {
      return calculate(input, params, context);
    },
  };
}
