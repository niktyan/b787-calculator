/**
 * Crosswind Landing calculator — Sprint C / ADR-0014.
 *
 * The Landing algorithm is a pure categorical lookup with conditional
 * adjustments. There is no weight / CG dependency and no piecewise-linear
 * interpolation (compare with the Takeoff feature). Steps:
 *
 *   1. Look up the base value: `byAircraft[aircraft].baseTable[condition][mode]`.
 *   2. Branch by `landingMode`:
 *      - `manual` → apply asymmetric-reverse penalty only.
 *      - `auto`   → CAT II-III cap → asym-reverse penalty → ONE ENG INOP cap.
 *
 * Adjustment semantics (FCOM CAUTION transcription):
 *
 *   - CAT II-III cap: if `result > catIIIIICap`, lower to the cap.
 *     Inactive when `result <= cap` (e.g., Poor 15 KT stays at 15 KT
 *     because 15 < 25 cap).
 *   - Asym-reverse penalty: subtract 5 KT when `asymReverse === 'yes'`
 *     AND runway is NOT `dry` (Dry is FCOM-exempt from the penalty).
 *     Applies in both `manual` and `auto`.
 *   - ONE ENG INOP cap: per-aircraft `engineInopAutolandLimit`; if the
 *     limit is below the post-asym result, lower to the limit. Auto only.
 *
 * Result is always an integer KT. The base table and adjustments
 * themselves are integers per FCOM Tab 2.29.3, so no rounding is needed.
 *
 * Pure function. Returns Result; never throws.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type { CrosswindLandingDataFile } from '../data/schema';

import type {
  CrosswindLandingAppliedAdjustments,
  CrosswindLandingError,
  CrosswindLandingInput,
  CrosswindLandingOutput,
} from './types';

const ASYM_REVERSE_PENALTY_KT = 5;

interface CalculationTrace {
  readonly base: number;
  readonly afterCatCap: number;
  readonly afterAsymPenalty: number;
  readonly afterInopCap: number;
  readonly applied: CrosswindLandingAppliedAdjustments;
}

function applyAsymReverse(value: number, input: CrosswindLandingInput): number {
  if (input.asymReverse !== 'yes') return value;
  if (input.runwayCondition === 'dry') return value;
  return value - ASYM_REVERSE_PENALTY_KT;
}

function applyAutoModeAdjustments(
  base: number,
  catCap: number,
  inopLimit: number,
  input: CrosswindLandingInput,
): CalculationTrace {
  const catActive = input.catIIIII === 'yes' && base > catCap;
  const afterCat = catActive ? catCap : base;
  const afterAsym = applyAsymReverse(afterCat, input);
  const inopActive = input.engineInop === 'yes' && inopLimit < afterAsym;
  const afterInop = inopActive ? inopLimit : afterAsym;
  return {
    base,
    afterCatCap: afterCat,
    afterAsymPenalty: afterAsym,
    afterInopCap: afterInop,
    applied: {
      catCap: catActive,
      asymPenalty: afterAsym !== afterCat,
      inopCap: inopActive,
    },
  };
}

function manualTrace(base: number, input: CrosswindLandingInput): CalculationTrace {
  const after = applyAsymReverse(base, input);
  return {
    base,
    afterCatCap: base,
    afterAsymPenalty: after,
    afterInopCap: after,
    applied: {
      catCap: false,
      asymPenalty: after !== base,
      inopCap: false,
    },
  };
}

function buildOutput(
  trace: CalculationTrace,
  input: CrosswindLandingInput,
  data: CrosswindLandingDataFile,
  referenceDocument: string,
): CrosswindLandingOutput {
  return {
    maxCrosswindKnots: trace.afterInopCap,
    metadata: {
      dataVersion: data.dataVersion,
      referenceDocument,
      aircraft: input.aircraft,
      landingMode: input.landingMode,
      appliedAdjustments: trace.applied,
    },
  };
}

function lookupBase(
  input: CrosswindLandingInput,
  data: CrosswindLandingDataFile,
): Result<
  { base: number; catCap: number; inopLimit: number; referenceDocument: string },
  CrosswindLandingError
> {
  const aircraftEntry = data.byAircraft[input.aircraft];
  if (aircraftEntry === undefined) {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      runwayCondition: input.runwayCondition,
      reason: 'aircraft-not-implemented',
    });
  }
  const conditionEntry = aircraftEntry.baseTable[input.runwayCondition];
  if (conditionEntry === undefined) {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      runwayCondition: input.runwayCondition,
      reason: 'condition-not-implemented',
    });
  }
  return ok({
    base: conditionEntry[input.landingMode],
    catCap: data.adjustments.catIIIIICap,
    inopLimit: aircraftEntry.engineInopAutolandLimit,
    referenceDocument: aircraftEntry.metadata.referenceDocument,
  });
}

interface TraceArgs {
  readonly base: number;
  readonly catCap: number;
  readonly inopLimit: number;
  readonly input: CrosswindLandingInput;
}

function traceFor(args: TraceArgs): CalculationTrace {
  const { base, catCap, inopLimit, input } = args;
  if (input.landingMode === 'manual') {
    return manualTrace(base, input);
  }
  return applyAutoModeAdjustments(base, catCap, inopLimit, input);
}

/**
 * Public entry-point. Pure: same inputs → same outputs; never throws.
 */
export function calculateLandingCrosswind(
  input: CrosswindLandingInput,
  data: CrosswindLandingDataFile,
): Result<CrosswindLandingOutput, CrosswindLandingError> {
  const lookup = lookupBase(input, data);
  if (!lookup.ok) {
    return lookup;
  }
  const { base, catCap, inopLimit, referenceDocument } = lookup.value;
  const trace = traceFor({ base, catCap, inopLimit, input });
  return ok(buildOutput(trace, input, data, referenceDocument));
}
