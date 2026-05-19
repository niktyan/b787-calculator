/**
 * Test Set #4 from `02_Specification/05-crosswind-algorithm.md`.
 *
 * Cases #4.01–#4.04 → `validateOperationalEnvelope` (use-case layer).
 * Cases #4.05–#4.07 → Value Object factories (NaN / Infinity / negative).
 *
 * Envelope bounds reflect the FCOM / Type Certificate B787-8 values
 * applied in PR fix/envelope-bounds-and-menu-order: weight 104.1–227.93 t,
 * CG 6–39.5 %MAC. The earlier conservative MVP estimate (110–172 / 8–35)
 * is superseded.
 */

import { validateOperationalEnvelope } from '../domain/validators';
import * as vobjects from '../domain/valueObjects';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { OperationalEnvelope, WeightInTons, CGPercentMAC } from '../domain/types';

const ENVELOPE: OperationalEnvelope = {
  weight: { minTons: 104.1, maxTons: 227.93 },
  cg: { minPercent: 6, maxPercent: 39.5 },
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
    // W=100 was below-envelope under old bounds (100<110); still below
    // under FCOM bounds (100<104.1). Classification stable; only minTons
    // assertion shifts.
    const { w, cg } = vo(100, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'weight.below', given: 100, minTons: 104.1 });
  });

  it('case 4.02: weight above maximum → weight.above', () => {
    // W=200 was above-envelope under old max (200>172); now WITHIN under
    // FCOM max (200<227.93). To preserve above-envelope coverage on the
    // weight.above branch, the input shifts to W=230 (>227.93).
    const { w, cg } = vo(230, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'weight.above', given: 230, maxTons: 227.93 });
  });

  it('case 4.03: cg below minimum → cg.below', () => {
    // CG=5 was below-envelope under old min (5<8); still below under FCOM
    // min (5<6). Classification stable; minPercent assertion shifts 8→6.
    const { w, cg } = vo(150, 5);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'cg.below', given: 5, minPercent: 6 });
  });

  it('case 4.04: cg above maximum → cg.above', () => {
    // CG=40 was above-envelope under old max (40>35); still above under
    // FCOM max (40>39.5). Classification stable; maxPercent assertion
    // shifts 35→39.5.
    const { w, cg } = vo(150, 40);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error).toEqual({ kind: 'cg.above', given: 40, maxPercent: 39.5 });
  });

  it('inside operational envelope → ok', () => {
    const { w, cg } = vo(150, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('exact min boundary is inside envelope (inclusive)', () => {
    const { w, cg } = vo(104.1, 6);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('exact max boundary is inside envelope (inclusive)', () => {
    const { w, cg } = vo(227.93, 39.5);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });
});

describe('validateOperationalEnvelope — boundary edges (FCOM B787-8 bounds)', () => {
  // Eight tests pinning behavior at the new envelope edges. These guard
  // against silent off-by-one drift if min/max values change without
  // intent. Each test pair targets the four edges (weight min/max,
  // CG min/max) with one just-inside and one just-outside input.

  it('W=104.0 (just below min 104.1) → weight.below', () => {
    const { w, cg } = vo(104, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('weight.below');
  });

  it('W=104.1 (exact min) → ok', () => {
    const { w, cg } = vo(104.1, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('W=227.93 (exact max) → ok', () => {
    const { w, cg } = vo(227.93, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('W=227.94 (just above max 227.93) → weight.above', () => {
    const { w, cg } = vo(227.94, 25);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('weight.above');
  });

  it('CG=5.9 (just below min 6) → cg.below', () => {
    const { w, cg } = vo(150, 5.9);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('cg.below');
  });

  it('CG=6.0 (exact min) → ok', () => {
    const { w, cg } = vo(150, 6);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('CG=39.5 (exact max) → ok', () => {
    const { w, cg } = vo(150, 39.5);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(true);
  });

  it('CG=39.6 (just above max 39.5) → cg.above', () => {
    const { w, cg } = vo(150, 39.6);
    const r = validateOperationalEnvelope({ weightTons: w, cgPercent: cg }, ENVELOPE);
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('cg.above');
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
