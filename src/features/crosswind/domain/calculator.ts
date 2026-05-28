/**
 * Public calculator API for the Crosswind module.
 *
 * Thin orchestration only:
 *   • Step 0 — `validateAlgorithmInput` (NaN/Infinity/phase mismatch).
 *   • Step 1 — `resolveStrategy` looks up the per-(aircraft, condition)
 *     dataset and constructs the appropriate `CrosswindStrategy`, or
 *     returns `NoLookupData` for missing combos.
 *   • Step 2 — `strategy.calculate(input)` returns the raw (un-rounded)
 *     advisory value.
 *   • Step 3 — `roundDownToTenth` applied at this single boundary
 *     (ADR-0017). Every strategy benefits uniformly; the policy is not
 *     scattered across strategy implementations.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md (algorithm dispatch),
 *       02_Specification/module-contracts/crosswind.md (Public API),
 *       02_Specification/ADR/0017-crosswind-output-rounding-policy.md.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type { CrosswindDataFile } from '../data/schema';

import { roundDownToTenth } from './rounding';
import { resolveStrategy } from './strategy-resolver';
import type { CalculatorInput } from './strategy';
import type {
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  CrosswindKnots,
} from './types';
import { validateAlgorithmInput } from './validators';

export type { CalculatorInput } from './strategy';

export function calculateCrosswindLimit(
  input: CalculatorInput,
  data: CrosswindDataFile,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const validation = validateAlgorithmInput(input, data);
  if (!validation.ok) {
    return validation;
  }

  const resolution = resolveStrategy(input.aircraft, input.runwayCondition, data);
  if (resolution.kind === 'no-lookup-data') {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      condition: input.runwayCondition,
      reason: resolution.reason,
    });
  }

  const raw = resolution.strategy.calculate(input);
  if (!raw.ok) {
    return raw;
  }
  return ok(applyRoundingPolicy(raw.value));
}

function applyRoundingPolicy(output: CrosswindCalculationOutput): CrosswindCalculationOutput {
  // Strategy guarantees `maxCrosswindKnots ∈ [0, 40]` via
  // `makeCrosswindKnots` at its own boundary. `roundDownToTenth`
  // floors toward zero, so the rounded value stays in [0, 40] and
  // remains a valid `CrosswindKnots` — no re-validation needed.
  const rounded = roundDownToTenth(output.maxCrosswindKnots) as CrosswindKnots;
  return {
    maxCrosswindKnots: rounded,
    metadata: output.metadata,
  };
}

/**
 * Spec-named alias for the takeoff phase. The algorithm is phase-agnostic;
 * MVP bundled data only ships `phase: 'takeoff'`, so this name is
 * documentary — call sites in the takeoff feature should prefer it.
 */
export const calculateMaxCrosswindTakeoff = calculateCrosswindLimit;
