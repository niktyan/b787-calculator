/**
 * Test Set #4 from `02_Specification/05-crosswind-algorithm.md`.
 *
 * Cases #4.01–#4.04 → `validateOperationalEnvelope` (use-case layer).
 * Cases #4.05–#4.07 → Value Object factories (NaN / Infinity / negative).
 */

import { validateOperationalEnvelope } from '../domain/validators';
import * as vobjects from '../domain/valueObjects';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { OperationalEnvelope, WeightInTons, CGPercentMAC } from '../domain/types';

const ENVELOPE: OperationalEnvelope = {
  weight: { minTons: 110, maxTons: 172 },
  cg: { minPercent: 8, maxPercent: 35 },
};

function vo(weight: number, cg: number): { readonly w: WeightInTons; readonly cg: CGPercentMAC } {
  const wRes = makeWeightInTons(weight);
  const cgRes = makeCGPercentMAC(cg);
  if (!wRes.ok || !cgRes.ok) {
    throw new Error('expected VO factories to succeed for in-range values');
  }
  return { w: wRes.value, cg: cgRes.value };
}

describe('validateOperationalEnvelope', () => {
  it('case 4.01: weight below minimum → weight.below', () => {
    const { w, cg } = vo(100, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'weight.below', given: 100, minTons: 110 });
  });

  it('case 4.02: weight above maximum → weight.above', () => {
    const { w, cg } = vo(200, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'weight.above', given: 200, maxTons: 172 });
  });

  it('case 4.03: cg below minimum → cg.below', () => {
    const { w, cg } = vo(150, 5);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'cg.below', given: 5, minPercent: 8 });
  });

  it('case 4.04: cg above maximum → cg.above', () => {
    const { w, cg } = vo(150, 40);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'cg.above', given: 40, maxPercent: 35 });
  });

  it('inside operational envelope → ok', () => {
    const { w, cg } = vo(150, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('exact min boundary is inside envelope (inclusive)', () => {
    const { w, cg } = vo(110, 8);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('exact max boundary is inside envelope (inclusive)', () => {
    const { w, cg } = vo(172, 35);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });
});

describe('Value Object factories', () => {
  it('case 4.05: cg = NaN → CGError.NotANumber', () => {
    const r = makeCGPercentMAC(Number.NaN);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NotANumber');
  });

  it('case 4.06: weight = NaN → WeightError.NotANumber', () => {
    const r = makeWeightInTons(Number.NaN);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NotANumber');
  });

  it('case 4.07: weight = -5 → WeightError.Negative', () => {
    const r = makeWeightInTons(-5);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'Negative', given: -5 });
  });

  it('weight = Infinity → WeightError.NotFinite', () => {
    const r = makeWeightInTons(Number.POSITIVE_INFINITY);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NotFinite');
  });

  it('cg = Infinity → CGError.NotFinite', () => {
    const r = makeCGPercentMAC(Number.POSITIVE_INFINITY);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NotFinite');
  });

  it('valid weight passes', () => {
    const r = makeWeightInTons(170);
    expect(r.ok).toBe(true);
  });

  it('valid cg passes', () => {
    const r = makeCGPercentMAC(25.5);
    expect(r.ok).toBe(true);
  });
});

describe('makeCrosswindKnots edge cases', () => {
  // Coverage for the third Value Object factory.
  it('rejects NaN', () => {
    const fn = vobjects;
    const r = fn.makeCrosswindKnots(Number.NaN);
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error.kind).toBe('NotANumber');
  });

  it('rejects negative', () => {
    const fn = vobjects;
    const r = fn.makeCrosswindKnots(-1);
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error.kind).toBe('Negative');
  });

  it('rejects above demonstrated (>40)', () => {
    const fn = vobjects;
    const r = fn.makeCrosswindKnots(45);
    expect(r.ok).toBe(false);
    if (r.ok) {
      return;
    }
    expect(r.error.kind).toBe('AboveDemonstrated');
  });

  it('accepts boundary 40', () => {
    const fn = vobjects;
    const r = fn.makeCrosswindKnots(40);
    expect(r.ok).toBe(true);
  });

  it('accepts 0', () => {
    const fn = vobjects;
    const r = fn.makeCrosswindKnots(0);
    expect(r.ok).toBe(true);
  });
});
