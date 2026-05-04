/**
 * Unit tests for `getLookupCGRange` against the bundled
 * `b787-8-landing-dry.json` dataset.
 *
 * Threshold values cross-verified with the test-set #1/#2 tables in
 * `02_Specification/05-crosswind-algorithm.md`:
 *   - W = 170 t → T₁ = 27.68763904, T₅ = 41.38763904
 *   - W = 130 t → T₁ = 22.60819456, T₅ = 36.30819456
 */

import { createCrosswindRepository } from '../data/crosswindRepository';
import { getLookupCGRange } from '../domain/lookupRange';
import { makeWeightInTons } from '../domain/valueObjects';
import type { WeightInTons } from '../domain/types';
import type { CrosswindDataFile } from '../data/schema';

const PRECISION_DIGITS = 6;
const W_170 = 170;
const W_130 = 130;
const W_150 = 150;
const W_172 = 172;
const T1_AT_170 = 27.68763904;
const T5_AT_170 = 41.38763904;
const T1_AT_130 = 22.60819456;
const T5_AT_130 = 36.30819456;

function loadData(): CrosswindDataFile {
  const repo = createCrosswindRepository();
  const result = repo.load();
  if (!result.ok) {
    throw new Error('expected bundled JSON to load successfully');
  }
  return result.value;
}

function weight(value: number): WeightInTons {
  const result = makeWeightInTons(value);
  if (!result.ok) {
    throw new Error(`expected valid weight ${value}`);
  }
  return result.value;
}

describe('getLookupCGRange', () => {
  const data = loadData();

  it('returns first/last breakpoint thresholds at W = 170 t', () => {
    const range = getLookupCGRange(data, weight(W_170));
    expect(range.min).toBeCloseTo(T1_AT_170, PRECISION_DIGITS);
    expect(range.max).toBeCloseTo(T5_AT_170, PRECISION_DIGITS);
  });

  it('returns first/last breakpoint thresholds at W = 130 t', () => {
    const range = getLookupCGRange(data, weight(W_130));
    expect(range.min).toBeCloseTo(T1_AT_130, PRECISION_DIGITS);
    expect(range.max).toBeCloseTo(T5_AT_130, PRECISION_DIGITS);
  });

  it('range is monotonic (max > min) at any operationally-realistic weight', () => {
    for (const w of [W_130, W_150, W_170, W_172]) {
      const range = getLookupCGRange(data, weight(w));
      expect(range.max).toBeGreaterThan(range.min);
    }
  });

  it('higher weight shifts both endpoints upward', () => {
    const r130 = getLookupCGRange(data, weight(W_130));
    const r170 = getLookupCGRange(data, weight(W_170));
    expect(r170.min).toBeGreaterThan(r130.min);
    expect(r170.max).toBeGreaterThan(r130.max);
  });

  it('endpoints are offset from each other by the breakpoint intercept span', () => {
    // intercept span = breakpoints[last].intercept - breakpoints[0].intercept
    //                = 19.8 - 6.1 = 13.7 (independent of weight, since slope cancels)
    const expectedSpan = 13.7;
    const range = getLookupCGRange(data, weight(W_150));
    expect(range.max - range.min).toBeCloseTo(expectedSpan, PRECISION_DIGITS);
  });
});
