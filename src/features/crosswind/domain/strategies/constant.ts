/**
 * ConstantStrategy — returns a fixed crosswind limit regardless of
 * input.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md § "ConstantStrategy".
 * Status: active in PR 7 (Poor / RWYCC 1).
 *
 * Smallest of the four strategy implementations. Per Excel "Poor 788"
 * sheet G7 (literal value 10) and Q5 user decision: the formula has
 * no computation — every input maps to the same constant.
 *
 * `input.weightTons`, `input.cgPercent`, and the other input fields
 * are accepted for interface uniformity but never read. The strategy
 * is a degenerate piecewise-linear function — a horizontal line.
 *
 * `calculationStrategy` metadata semantic stretch (matching PR 6
 * convention): reuses `'within-bracket'` as the most neutral
 * existing value. The enum is not expanded — a future cleanup PR
 * may add `'constant'` if labels prove misleading.
 */

import { err, ok } from '../../../../core/result';
import type { Result } from '../../../../core/result';

import type { CalculatorInput, ConstantParams, CrosswindStrategy } from '../strategy';
import type {
  AircraftVariant,
  CalculationMetadata,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  CrosswindKnots,
} from '../types';
import { makeCrosswindKnots } from '../valueObjects';

export interface ConstantContext {
  readonly aircraft: AircraftVariant;
  readonly dataVersion: string;
  readonly referenceDocument: string;
}

function buildMetadata(
  context: ConstantContext,
  weightTons: number,
  cgPercent: number,
  valueKnots: CrosswindKnots,
): CalculationMetadata {
  // No bracket structure for a constant: collapse all range
  // metadata to single-point ranges containing the input/output.
  return {
    dataVersion: context.dataVersion,
    referenceDocument: context.referenceDocument,
    aircraft: context.aircraft,
    weightBracket: { lower: weightTons, upper: weightTons },
    cgBracket: { lower: cgPercent, upper: cgPercent },
    bracketCrosswindRange: { lower: valueKnots, upper: valueKnots },
    calculationStrategy: 'within-bracket',
  };
}

function calculate(
  input: CalculatorInput,
  params: ConstantParams,
  context: ConstantContext,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const weightTons = input.weightTons as number;
  const cgPercent = input.cgPercent as number;

  const knotsResult = makeCrosswindKnots(params.value);
  if (!knotsResult.ok) {
    return err({
      kind: 'CalculationFailed',
      reason: `invalid constant value: ${params.value}`,
    });
  }

  return ok({
    maxCrosswindKnots: knotsResult.value,
    metadata: buildMetadata(context, weightTons, cgPercent, knotsResult.value),
  });
}

/**
 * Constructs a `CrosswindStrategy` for the constant model bound to
 * the given value. The returned strategy's `calculate(input)` is a
 * pure function of `params` (input is ignored except for metadata
 * pass-through).
 */
export function createConstantStrategy(
  params: ConstantParams,
  context: ConstantContext,
): CrosswindStrategy {
  return {
    type: 'constant',
    calculate(input) {
      return calculate(input, params, context);
    },
  };
}
