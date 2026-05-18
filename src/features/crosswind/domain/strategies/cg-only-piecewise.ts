/**
 * CGOnlyPiecewiseStrategy — plateau-then-linear-decreasing lookup,
 * weight-independent.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md § "CGOnlyPiecewiseStrategy".
 * Status: active in PR 6 (MediumToPoor / RWYCC 2).
 *
 * Excel formula in "Medium to Poor 788" sheet G7:
 *     ROUNDDOWN(IF(B5 >= cgThreshold,
 *                  plateauValue - (B5 - cgThreshold) / slopeDivisor,
 *                  plateauValue),
 *               decimals)
 *
 * Dramatically simpler than BracketedLinear / VariableSlopeBracketed:
 *  • No brackets, no XLOOKUP, no IFNA — single conditional formula.
 *  • No weight dependency — `input.weightTons` is ignored entirely.
 *  • No maxCap — formula self-caps at `plateauValue` for CG ≤ threshold.
 *  • For very large CG, raw output is negative; `makeCrosswindKnots`
 *    rejects that with `CrosswindError.Negative`, surfacing as
 *    `CalculationFailed`. Recommendation A1 per PR 6 design: this is
 *    the correct fail-safe signal — by the time the formula goes
 *    negative the input is deep beyond operational envelope and
 *    `validateOperationalEnvelope` has already flagged it upstream.
 *
 * `calculationStrategy` metadata semantic stretch (MVP):
 *  • Plateau branch (CG < cgThreshold) → reuses `'below-envelope'`.
 *  • Decreasing branch (CG ≥ cgThreshold) → reuses `'within-bracket'`.
 *  • Above-envelope branch is unreachable — the formula has no upper
 *    bound on CG.
 * The enum union is not expanded for PR 6 (per user direction); a
 * future cleanup PR may introduce `'piecewise-plateau'` /
 * `'piecewise-decreasing'` values if the metadata labels feel
 * misleading in user-facing contexts.
 */

import { err, ok } from '../../../../core/result';
import type { Result } from '../../../../core/result';

import type { CGOnlyPiecewiseParams, CalculatorInput, CrosswindStrategy } from '../strategy';
import type {
  AircraftVariant,
  CalculationMetadata,
  CalculationStrategy,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  CrosswindKnots,
} from '../types';
import { makeCrosswindKnots } from '../valueObjects';

const ROUNDDOWN_DECIMAL_BASE = 10;

export interface CGOnlyPiecewiseContext {
  readonly aircraft: AircraftVariant;
  readonly dataVersion: string;
  readonly referenceDocument: string;
}

function roundDown(value: number, decimals: 0 | 1): number {
  const factor = ROUNDDOWN_DECIMAL_BASE ** decimals;
  return Math.floor(value * factor) / factor;
}

interface Computation {
  readonly value: number;
  readonly strategy: CalculationStrategy;
}

function compute(cg: number, params: CGOnlyPiecewiseParams): Computation {
  const { plateauValue, cgThreshold, slopeDivisor, decimals } = params;
  if (cg < cgThreshold) {
    return { value: roundDown(plateauValue, decimals), strategy: 'below-envelope' };
  }
  const raw = plateauValue - (cg - cgThreshold) / slopeDivisor;
  return { value: roundDown(raw, decimals), strategy: 'within-bracket' };
}

interface BuildMetadataArgs {
  readonly context: CGOnlyPiecewiseContext;
  readonly weightTons: number;
  readonly cgPercent: number;
  readonly computed: Computation;
  readonly valueKnots: CrosswindKnots;
}

function buildMetadata(args: BuildMetadataArgs): CalculationMetadata {
  // Brackets aren't meaningful for the CG-only model. The metadata
  // shape requires them anyway (it's a strategy-agnostic interface),
  // so we surface degenerate single-point bracket info: the cg
  // bracket is `[cgPercent, cgPercent]` (the input point itself) and
  // the crosswind bracket is `[value, value]` (the output value
  // doubled). Future metadata refactors may add a strategy-typed
  // discriminator for this; current shape is C4-adequate.
  const { context, weightTons, cgPercent, computed, valueKnots } = args;
  return {
    dataVersion: context.dataVersion,
    referenceDocument: context.referenceDocument,
    aircraft: context.aircraft,
    weightBracket: { lower: weightTons, upper: weightTons },
    cgBracket: { lower: cgPercent, upper: cgPercent },
    bracketCrosswindRange: { lower: valueKnots, upper: valueKnots },
    calculationStrategy: computed.strategy,
  };
}

function calculate(
  input: CalculatorInput,
  params: CGOnlyPiecewiseParams,
  context: CGOnlyPiecewiseContext,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const weightTons = input.weightTons as number;
  const cgPercent = input.cgPercent as number;

  // Defence in depth — Value Object factories already reject these,
  // but the strategy guards independently in case it's ever called
  // bypassing the VO path.
  if (!Number.isFinite(cgPercent) || !Number.isFinite(weightTons)) {
    return err({ kind: 'NoLookupData', reason: 'NotFinite' });
  }
  if (params.slopeDivisor === 0) {
    return err({ kind: 'CalculationFailed', reason: 'slopeDivisor must be non-zero' });
  }

  const computed = compute(cgPercent, params);

  const knotsResult = makeCrosswindKnots(computed.value);
  if (!knotsResult.ok) {
    // The most common cause here is a very large CG that drives raw
    // negative (recommendation A1). Surface as CalculationFailed —
    // the algorithm cannot produce a valid advisory limit.
    return err({
      kind: 'CalculationFailed',
      reason: `invalid knots (CG=${cgPercent} likely out of envelope): ${computed.value}`,
    });
  }

  return ok({
    maxCrosswindKnots: knotsResult.value,
    metadata: buildMetadata({
      context,
      weightTons,
      cgPercent,
      computed,
      valueKnots: knotsResult.value,
    }),
  });
}

/**
 * Constructs a `CrosswindStrategy` for the CG-only piecewise model
 * bound to the given params and dataset context. The returned
 * strategy's `calculate(input)` is a pure function of `input`
 * (params + context captured in the closure). Weight is accepted
 * for interface uniformity but ignored in computation.
 */
export function createCGOnlyPiecewiseStrategy(
  params: CGOnlyPiecewiseParams,
  context: CGOnlyPiecewiseContext,
): CrosswindStrategy {
  return {
    type: 'cgOnlyPiecewise',
    calculate(input) {
      return calculate(input, params, context);
    },
  };
}
