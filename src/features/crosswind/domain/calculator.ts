/**
 * Public calculator API for the Crosswind module.
 *
 * Dispatches to the strategy named in `data.interpolation.model`.
 * In MVP only `'piecewise-linear-excel-equivalent'` exists; future
 * models add a new branch here without touching call sites.
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

  if (data.interpolation.model === 'piecewise-linear-excel-equivalent') {
    return calculateExcelEquivalent(
      { weightTons: input.weightTons, cgPercent: input.cgPercent },
      {
        slope: data.interpolation.slope,
        breakpoints: data.interpolation.breakpoints,
        tonsToKilolbsFactor: data.weightConversion.tonsToKilolbsFactor,
        dataVersion: data.dataVersion,
        referenceDocument: data.metadata.referenceDocument,
      },
    );
  }

  return err({
    kind: 'CalculationFailed',
    reason: `Unknown interpolation model`,
  });
}
