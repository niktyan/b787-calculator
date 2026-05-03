/**
 * Edge-case coverage tests — exercise paths not reachable through the
 * standard test sets:
 *   • Strategy dispatch fall-through (unknown interpolation model).
 *   • Defensive NaN/Infinity guards in the algorithm input validator.
 *   • Empty-breakpoints defensive paths inside the strategy.
 *   • Runtime const arrays (AIRCRAFT_VARIANTS, etc.).
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import { calculateExcelEquivalent } from '../domain/strategies';
import { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS } from '../domain/types';
import type { CGPercentMAC, WeightInTons } from '../domain/types';
import { validateAlgorithmInput } from '../domain/validators';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import bundled from '../data/b787-8-landing-dry.json';
import { crosswindDataFileSchema } from '../data/schema';
import type { CrosswindDataFile } from '../data/schema';

const data: CrosswindDataFile = crosswindDataFileSchema.parse(bundled);

function vo(weight: number, cg: number): { readonly w: WeightInTons; readonly cg: CGPercentMAC } {
  const wRes = makeWeightInTons(weight);
  const cgRes = makeCGPercentMAC(cg);
  if (!wRes.ok || !cgRes.ok) {
    throw new Error('VO failure');
  }
  return { w: wRes.value, cg: cgRes.value };
}

describe('Calculator edge cases', () => {
  it('returns CalculationFailed for unknown interpolation.model', () => {
    const corruptedData = {
      ...data,
      interpolation: { ...data.interpolation, model: 'some-future-model' as never },
    } as unknown as CrosswindDataFile;
    const { w, cg } = vo(170, 32);
    const r = calculateCrosswindLimit(
      {
        weightTons: w,
        cgPercent: cg,
        aircraft: 'b787_8',
        phase: 'landing',
        runwayCondition: 'dry',
      },
      corruptedData,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });
});

describe('Strategy edge cases', () => {
  it('returns CalculationFailed for empty breakpoints array', () => {
    const { w, cg } = vo(170, 32);
    const r = calculateExcelEquivalent(
      { weightTons: w, cgPercent: cg },
      {
        slope: 0.0576,
        breakpoints: [],
        tonsToKilolbsFactor: 2.20462,
        dataVersion: 'test',
        referenceDocument: 'test',
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('returns CalculationFailed when computed value > demonstrated 40', () => {
    // First breakpoint at crosswindKnots = 50; cg just above T1 yields
    // resultRaw close to 50, which makeCrosswindKnots rejects. Guards
    // the `!knotsResult.ok` branch.
    const { w } = vo(170, 32);
    const r = calculateExcelEquivalent(
      { weightTons: w, cgPercent: 27.7 as CGPercentMAC },
      {
        slope: 0.0576,
        breakpoints: [
          { crosswindKnots: 50, intercept: 6.1 },
          { crosswindKnots: 35, intercept: 9.3 },
          { crosswindKnots: 30, intercept: 12.8 },
          { crosswindKnots: 25, intercept: 16.3 },
          { crosswindKnots: 20, intercept: 19.8 },
        ],
        tonsToKilolbsFactor: 2.20462,
        dataVersion: 'test',
        referenceDocument: 'test',
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('returns CalculationFailed when bracket-label crosswind > 40 even though value ≤ 40', () => {
    // Wide first bracket (intercepts 6.1 → 26.1) so the formula yields
    // a value ≤ 40 while lower.crosswindKnots = 50 — exercises the
    // bracket-label guard distinct from the result-value guard.
    const { w } = vo(170, 32);
    const r = calculateExcelEquivalent(
      { weightTons: w, cgPercent: 30 as CGPercentMAC },
      {
        slope: 0.0576,
        breakpoints: [
          { crosswindKnots: 50, intercept: 6.1 },
          { crosswindKnots: 35, intercept: 26.1 },
          { crosswindKnots: 30, intercept: 27 },
          { crosswindKnots: 25, intercept: 28 },
          { crosswindKnots: 20, intercept: 29 },
        ],
        tonsToKilolbsFactor: 2.20462,
        dataVersion: 'test',
        referenceDocument: 'test',
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('returns NoLookupData when weight × factor overflows to Infinity', () => {
    // Choose weight large enough that weight × factor exceeds Number.MAX_VALUE.
    // Number.MAX_VALUE / 2.20462 ≈ 8.16e307. Slightly above that overflows.
    const w = Number.MAX_VALUE as WeightInTons;
    const r = calculateExcelEquivalent(
      { weightTons: w, cgPercent: 32 as CGPercentMAC },
      {
        slope: 0.0576,
        breakpoints: data.interpolation.breakpoints,
        tonsToKilolbsFactor: 2.20462,
        dataVersion: 'test',
        referenceDocument: 'test',
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NoLookupData');
  });
});

describe('Algorithm input validator defence-in-depth', () => {
  // Value Object factories reject NaN/Infinity at the boundary, so the
  // validator's checks at Step 0 are belt-and-suspenders. These tests
  // exercise them by passing branded values directly (bypassing the
  // factories' guards).
  const dataAvail = {
    aircraft: 'b787_8' as const,
    phase: 'landing' as const,
    runwayCondition: 'dry' as const,
  };

  it('NaN weight → NoLookupData reason NaN', () => {
    const r = validateAlgorithmInput(
      {
        ...dataAvail,
        weightTons: Number.NaN as WeightInTons,
        cgPercent: 25 as CGPercentMAC,
      },
      dataAvail,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NoLookupData');
    if (r.error.kind !== 'NoLookupData') {
      throw new Error('expected NoLookupData');
    }
    expect(r.error.reason).toBe('NaN');
  });

  it('Infinity cg → NoLookupData reason NotFinite', () => {
    const r = validateAlgorithmInput(
      {
        ...dataAvail,
        weightTons: 170 as WeightInTons,
        cgPercent: Number.POSITIVE_INFINITY as CGPercentMAC,
      },
      dataAvail,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NoLookupData');
    if (r.error.kind !== 'NoLookupData') {
      throw new Error('expected NoLookupData');
    }
    expect(r.error.reason).toBe('NotFinite');
  });
});

describe('Runtime const arrays (types.ts)', () => {
  it('exports AIRCRAFT_VARIANTS', () => {
    expect(AIRCRAFT_VARIANTS).toEqual(['b787_8', 'b787_9']);
  });

  it('exports FLIGHT_PHASES', () => {
    expect(FLIGHT_PHASES).toEqual(['takeoff', 'landing']);
  });

  it('exports RUNWAY_CONDITIONS', () => {
    expect(RUNWAY_CONDITIONS).toEqual(['dry', 'wet', 'contaminated']);
  });
});
