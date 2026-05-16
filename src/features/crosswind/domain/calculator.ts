/**
 * Public calculator API for the Crosswind module.
 *
 * Thin orchestration only:
 *   • Step 0 — `validateAlgorithmInput` (NaN/Infinity/phase mismatch).
 *   • Step 1 — `resolveStrategy` looks up the per-(aircraft, condition)
 *     dataset and constructs the appropriate `CrosswindStrategy`, or
 *     returns `NoLookupData` for missing combos.
 *   • Step 2 — `strategy.calculate(input)`.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md (algorithm dispatch),
 *       02_Specification/module-contracts/crosswind.md (Public API).
 */

import { err } from '../../../core/result';
import type { Result } from '../../../core/result';

import type { CrosswindDataFile } from '../data/schema';

import { resolveStrategy } from './strategy-resolver';
import type { CalculatorInput } from './strategy';
import type { CrosswindCalculationError, CrosswindCalculationOutput } from './types';
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

  return resolution.strategy.calculate(input);
}

/**
 * Spec-named alias for the takeoff phase. The algorithm is phase-agnostic;
 * MVP bundled data only ships `phase: 'takeoff'`, so this name is
 * documentary — call sites in the takeoff feature should prefer it.
 */
export const calculateMaxCrosswindTakeoff = calculateCrosswindLimit;
