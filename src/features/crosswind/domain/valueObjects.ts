/**
 * Value Object factories for Crosswind domain.
 *
 * Spec: 02_Specification/04-domain-model.md § "Value Objects".
 * Each factory returns Result<VO, Error>; never throws.
 *
 * Operational-envelope checks live in `validators.ts`
 * (`validateWeightEnvelope` / `validateCGEnvelope`) — Value Objects only
 * verify "is this a sensible number at all" (Sprint-5 prep change, see
 * commit history).
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import type {
  CGError,
  CGPercentMAC,
  CrosswindError,
  CrosswindKnots,
  WeightError,
  WeightInTons,
} from './types';

const DEMONSTRATED_CROSSWIND = 40;

export function makeWeightInTons(value: number): Result<WeightInTons, WeightError> {
  if (Number.isNaN(value)) {
    return err({ kind: 'NotANumber' });
  }
  if (!Number.isFinite(value)) {
    return err({ kind: 'NotFinite' });
  }
  if (value < 0) {
    return err({ kind: 'Negative', given: value });
  }
  return ok(value as WeightInTons);
}

export function makeCGPercentMAC(value: number): Result<CGPercentMAC, CGError> {
  if (Number.isNaN(value)) {
    return err({ kind: 'NotANumber' });
  }
  if (!Number.isFinite(value)) {
    return err({ kind: 'NotFinite' });
  }
  return ok(value as CGPercentMAC);
}

export function makeCrosswindKnots(value: number): Result<CrosswindKnots, CrosswindError> {
  if (Number.isNaN(value)) {
    return err({ kind: 'NotANumber' });
  }
  if (value < 0) {
    return err({ kind: 'Negative', given: value });
  }
  if (value > DEMONSTRATED_CROSSWIND) {
    return err({
      kind: 'AboveDemonstrated',
      given: value,
      demonstrated: DEMONSTRATED_CROSSWIND,
    });
  }
  return ok(value as CrosswindKnots);
}
