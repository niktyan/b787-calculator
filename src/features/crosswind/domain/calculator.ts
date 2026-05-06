/**
 * Public calculator API for the Crosswind module.
 *
 * Looks up the per-(aircraft, runwayCondition) dataset inside
 * `data.byAircraft` and dispatches to the strategy named in the
 * dataset's `interpolation.model`. In MVP only `b787_8 / dry` is
 * populated; everything else surfaces as `DataNotAvailable` with an
 * explanatory `reason`.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md.
 */

import { err } from '../../../core/result';
import type { Result } from '../../../core/result';

import type { CrosswindDataFile } from '../data/schema';

import { calculateExcelEquivalent } from './strategies';
import type {
  AircraftVariant,
  CGPercentMAC,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  FlightPhase,
  RunwayCondition,
  WeightInTons,
} from './types';
import { validateAlgorithmInput } from './validators';

export interface CalculatorInput {
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
}

export function calculateCrosswindLimit(
  input: CalculatorInput,
  data: CrosswindDataFile,
): Result<CrosswindCalculationOutput, CrosswindCalculationError> {
  const validation = validateAlgorithmInput(input, data);
  if (!validation.ok) {
    return validation;
  }

  const aircraftEntry = data.byAircraft[input.aircraft];
  if (aircraftEntry === undefined) {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      condition: input.runwayCondition,
      reason: 'aircraft-not-implemented',
    });
  }
  const dataset = aircraftEntry[input.runwayCondition];
  if (dataset === undefined) {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      condition: input.runwayCondition,
      reason: 'condition-not-implemented',
    });
  }

  if (dataset.interpolation.model === 'piecewise-linear-excel-equivalent') {
    return calculateExcelEquivalent(
      { weightTons: input.weightTons, cgPercent: input.cgPercent },
      {
        slope: dataset.interpolation.slope,
        breakpoints: dataset.interpolation.breakpoints,
        tonsToKilolbsFactor: data.weightConversion.tonsToKilolbsFactor,
        dataVersion: data.dataVersion,
        referenceDocument: dataset.metadata.referenceDocument,
        aircraft: input.aircraft,
      },
    );
  }

  return err({
    kind: 'CalculationFailed',
    reason: `Unknown interpolation model`,
  });
}

/**
 * Spec-named alias for the takeoff phase. The algorithm is phase-agnostic;
 * MVP bundled data only ships `phase: 'takeoff'`, so this name is
 * documentary — call sites in the takeoff feature should prefer it.
 */
export const calculateMaxCrosswindTakeoff = calculateCrosswindLimit;
