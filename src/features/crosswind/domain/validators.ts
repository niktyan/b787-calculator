/**
 * Input validators for Crosswind domain.
 *
 * Two validation flows are defined in spec
 * (02_Specification/04-domain-model.md § "Two distinct envelope concepts"):
 *
 *  1. `validateAlgorithmInput` — defence-in-depth NaN/Infinity & phase
 *     check (Step 0 of the algorithm). Aircraft and runway-condition
 *     availability are now resolved via lookup in `data.byAircraft`,
 *     not via top-level equality checks.
 *  2. `validateOperationalEnvelope` — use-case-layer regulatory check.
 *     UI shows the algorithm's number anyway and surfaces an
 *     `EnvelopeViolation` as a warning chip alongside it.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type {
  AircraftVariant,
  CGPercentMAC,
  CrosswindCalculationError,
  EnvelopeViolation,
  FlightPhase,
  OperationalEnvelope,
  RunwayCondition,
  WeightInTons,
} from './types';

interface AlgorithmInputCheck {
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}

interface AlgorithmDataCheck {
  readonly phase: FlightPhase;
}

export function validateAlgorithmInput(
  input: AlgorithmInputCheck,
  data: AlgorithmDataCheck,
): Result<void, CrosswindCalculationError> {
  if (input.phase !== data.phase) {
    return err({
      kind: 'DataNotAvailable',
      aircraft: input.aircraft,
      condition: input.runwayCondition,
      reason: 'phase-mismatch',
    });
  }
  if (Number.isNaN(input.weightTons) || Number.isNaN(input.cgPercent)) {
    return err({ kind: 'NoLookupData', reason: 'NaN' });
  }
  if (!Number.isFinite(input.weightTons) || !Number.isFinite(input.cgPercent)) {
    return err({ kind: 'NoLookupData', reason: 'NotFinite' });
  }
  return ok(undefined);
}

interface EnvelopeInput {
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
}

export function validateOperationalEnvelope(
  input: EnvelopeInput,
  envelope: OperationalEnvelope,
): Result<void, EnvelopeViolation> {
  const w = input.weightTons as number;
  const cg = input.cgPercent as number;
  if (w < envelope.weight.minTons) {
    return err({ kind: 'weight.below', given: w, minTons: envelope.weight.minTons });
  }
  if (w > envelope.weight.maxTons) {
    return err({ kind: 'weight.above', given: w, maxTons: envelope.weight.maxTons });
  }
  if (cg < envelope.cg.minPercent) {
    return err({ kind: 'cg.below', given: cg, minPercent: envelope.cg.minPercent });
  }
  if (cg > envelope.cg.maxPercent) {
    return err({ kind: 'cg.above', given: cg, maxPercent: envelope.cg.maxPercent });
  }
  return ok(undefined);
}
