/**
 * Input validators for Crosswind domain.
 *
 * Three validation flows are defined in spec
 * (02_Specification/04-domain-model.md § "Two distinct envelope concepts"):
 *
 *  1. `validateAlgorithmInput` — defence-in-depth NaN/Infinity & phase
 *     check (Step 0 of the algorithm). Aircraft and runway-condition
 *     availability are now resolved via lookup in `data.byAircraft`,
 *     not via top-level equality checks.
 *  2. `validateWeightEnvelope` — use-case-layer regulatory check for weight.
 *  3. `validateCGEnvelope` — use-case-layer regulatory check for CG.
 *
 * Weight and CG validators are intentionally independent so the UI can
 * surface BOTH violations simultaneously when a pilot enters out-of-envelope
 * values on both axes. Pre-PR `fix/independent-envelope-validators` the
 * single `validateOperationalEnvelope` used early-return and returned only
 * the first violation; that meant a pilot with both weight and CG out of
 * envelope saw only the weight error until weight was corrected.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type {
  AircraftVariant,
  CGPercentMAC,
  CGViolation,
  CrosswindCalculationError,
  FlightPhase,
  OperationalEnvelope,
  RunwayCondition,
  WeightInTons,
  WeightViolation,
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

interface WeightEnvelopeInput {
  readonly weightTons: WeightInTons;
}

export function validateWeightEnvelope(
  input: WeightEnvelopeInput,
  envelope: OperationalEnvelope['weight'],
): Result<void, WeightViolation> {
  const w = input.weightTons as number;
  if (w < envelope.minTons) {
    return err({ kind: 'weight.below', given: w, minTons: envelope.minTons });
  }
  if (w > envelope.maxTons) {
    return err({ kind: 'weight.above', given: w, maxTons: envelope.maxTons });
  }
  return ok(undefined);
}

interface CGEnvelopeInput {
  readonly cgPercent: CGPercentMAC;
}

export function validateCGEnvelope(
  input: CGEnvelopeInput,
  envelope: OperationalEnvelope['cg'],
): Result<void, CGViolation> {
  const cg = input.cgPercent as number;
  if (cg < envelope.minPercent) {
    return err({ kind: 'cg.below', given: cg, minPercent: envelope.minPercent });
  }
  if (cg > envelope.maxPercent) {
    return err({ kind: 'cg.above', given: cg, maxPercent: envelope.maxPercent });
  }
  return ok(undefined);
}
