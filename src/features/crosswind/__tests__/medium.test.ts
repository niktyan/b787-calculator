/**
 * Test Set #8 — Medium runway (RWYCC 3) for B787-8 takeoff.
 *
 * Spec: `02_Specification/05-crosswind-algorithm.md` § "Test set #8 ·
 *       Medium (RWYCC 3)".
 *
 * Medium is the first condition backed by `variableSlopeBracketed`
 * (rather than `bracketedLinear`). Each of the 4 brackets carries its
 * own slope per Excel "Medium 788" sheet:
 *   • brackets:    crosswindKnots [25, 20, 15, 10]
 *   • slopes:      [0.032, 0.0384, 0.0388, 0.044]
 *   • intercepts:  [5.1, 11.9, 21.8, 29.8]
 *   • maxCap:      null              (Excel sheet has no G8 clamp)
 *   • decimals:    1                 (first sub-integer condition)
 *
 * Interpolation uses the Excel-faithful conditional `G7 = F7 −
 * (CG − E7)/E9` (when E9 ≥ 1; for Medium at in-envelope weights
 * this always holds). The strategy's ·E9 branch is exercised by the
 * synthetic test in `variable-slope-bracketed-strategy.test.ts`.
 *
 * Anchor case (user-verified against Excel sheet G7):
 *   W=182 t, CG=20 %MAC → 23.9 KT
 *   (raw ≈ 23.9003 in bracket [T1=17.94, T2=27.31], no cap)
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import type {
  AircraftVariant,
  CGPercentMAC,
  CalculationStrategy,
  FlightPhase,
  RunwayCondition,
  WeightInTons,
} from '../domain/types';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import bundledData from '../data/b787-takeoff.json';
import { crosswindDataFileSchema } from '../data/schema';
import type { CrosswindDataFile } from '../data/schema';

const data: CrosswindDataFile = crosswindDataFileSchema.parse(bundledData);

const AIRCRAFT: AircraftVariant = 'b787_8';
const PHASE: FlightPhase = 'takeoff';
const RUNWAY: RunwayCondition = 'medium';

interface Case {
  readonly id: string;
  readonly weight: number;
  readonly cg: number;
  readonly expected: number;
  readonly strategy: CalculationStrategy;
}

function vo(weight: number, cg: number): { readonly w: WeightInTons; readonly cg: CGPercentMAC } {
  const wRes = makeWeightInTons(weight);
  const cgRes = makeCGPercentMAC(cg);
  if (!wRes.ok) {
    throw new Error(`weight VO failed: ${JSON.stringify(wRes.error)}`);
  }
  if (!cgRes.ok) {
    throw new Error(`cg VO failed: ${JSON.stringify(cgRes.error)}`);
  }
  return { w: wRes.value, cg: cgRes.value };
}

function runCase(c: Case): void {
  const { w, cg } = vo(c.weight, c.cg);
  const result = calculateCrosswindLimit(
    {
      weightTons: w,
      cgPercent: cg,
      aircraft: AIRCRAFT,
      phase: PHASE,
      runwayCondition: RUNWAY,
    },
    data,
  );
  if (!result.ok) {
    throw new Error(`Case ${c.id} returned error: ${JSON.stringify(result.error)}`);
  }
  expect(result.value.maxCrosswindKnots).toBe(c.expected);
  expect(result.value.metadata.calculationStrategy).toBe(c.strategy);
  expect(result.value.metadata.aircraft).toBe(AIRCRAFT);
}

describe('Test Set #8.1 · Medium at W=170 t (heavy)', () => {
  // W_kilolbs = 374.7854. Per-bracket thresholds (variable slope):
  //   T1 = 0.032 ·374.7854 + 5.1   = 17.093 (25)
  //   T2 = 0.0384·374.7854 + 11.9  = 26.292 (20)
  //   T3 = 0.0388·374.7854 + 21.8  = 36.342 (15)
  //   T4 = 0.044 ·374.7854 + 29.8  = 46.290 (10)
  const cases: readonly Case[] = [
    { id: '8.1.01', weight: 170, cg: 8.0, expected: 25, strategy: 'below-envelope' },
    { id: '8.1.02', weight: 170, cg: 15.0, expected: 25, strategy: 'below-envelope' },
    { id: '8.1.03', weight: 170, cg: 17.0931328, expected: 25, strategy: 'within-bracket' },
    { id: '8.1.04', weight: 170, cg: 18.0, expected: 24.5, strategy: 'within-bracket' },
    { id: '8.1.05', weight: 170, cg: 20.0, expected: 23.4, strategy: 'within-bracket' },
    { id: '8.1.06', weight: 170, cg: 22.0, expected: 22.3, strategy: 'within-bracket' },
    { id: '8.1.07', weight: 170, cg: 26.29175936, expected: 20, strategy: 'within-bracket' },
    { id: '8.1.08', weight: 170, cg: 27.0, expected: 19.6, strategy: 'within-bracket' },
    { id: '8.1.09', weight: 170, cg: 30.0, expected: 18.1, strategy: 'within-bracket' },
    { id: '8.1.10', weight: 170, cg: 36.34167352, expected: 15, strategy: 'within-bracket' },
    { id: '8.1.11', weight: 170, cg: 37.0, expected: 14.6, strategy: 'within-bracket' },
    { id: '8.1.12', weight: 170, cg: 40.0, expected: 13.1, strategy: 'within-bracket' },
    { id: '8.1.13', weight: 170, cg: 46.2905576, expected: 10, strategy: 'within-bracket' },
    { id: '8.1.14', weight: 170, cg: 47.0, expected: 25, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #8.2 · Medium at W=130 t (medium)', () => {
  // W_kilolbs = 286.6006. Thresholds:
  //   T1=14.271 (25) · T2=22.905 (20) · T3=32.920 (15) · T4=42.410 (10)
  const cases: readonly Case[] = [
    { id: '8.2.01', weight: 130, cg: 10.0, expected: 25, strategy: 'below-envelope' },
    { id: '8.2.02', weight: 130, cg: 14.2712192, expected: 25, strategy: 'within-bracket' },
    { id: '8.2.03', weight: 130, cg: 15.0, expected: 24.5, strategy: 'within-bracket' },
    { id: '8.2.04', weight: 130, cg: 20.0, expected: 21.6, strategy: 'within-bracket' },
    { id: '8.2.05', weight: 130, cg: 22.90546304, expected: 20, strategy: 'within-bracket' },
    { id: '8.2.06', weight: 130, cg: 25.0, expected: 18.9, strategy: 'within-bracket' },
    { id: '8.2.07', weight: 130, cg: 30.0, expected: 16.4, strategy: 'within-bracket' },
    { id: '8.2.08', weight: 130, cg: 32.92010328, expected: 15, strategy: 'within-bracket' },
    { id: '8.2.09', weight: 130, cg: 35.0, expected: 13.9, strategy: 'within-bracket' },
    { id: '8.2.10', weight: 130, cg: 42.4104264, expected: 10, strategy: 'within-bracket' },
    { id: '8.2.11', weight: 130, cg: 45.0, expected: 25, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #8.3 · Medium at W=160 t (mid)', () => {
  // W_kilolbs = 352.7392. Thresholds:
  //   T1=16.388 (25) · T2=25.445 (20) · T3=35.486 (15) · T4=45.321 (10)
  const cases: readonly Case[] = [
    { id: '8.3.01', weight: 160, cg: 15.0, expected: 25, strategy: 'below-envelope' },
    { id: '8.3.02', weight: 160, cg: 16.3876544, expected: 25, strategy: 'within-bracket' },
    { id: '8.3.03', weight: 160, cg: 20.0, expected: 23.0, strategy: 'within-bracket' },
    { id: '8.3.04', weight: 160, cg: 25.44518528, expected: 20, strategy: 'within-bracket' },
    { id: '8.3.05', weight: 160, cg: 30.0, expected: 17.7, strategy: 'within-bracket' },
    { id: '8.3.06', weight: 160, cg: 35.48628096, expected: 15, strategy: 'within-bracket' },
    { id: '8.3.07', weight: 160, cg: 40.0, expected: 12.7, strategy: 'within-bracket' },
    { id: '8.3.08', weight: 160, cg: 45.3205248, expected: 10, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #8.4 · Medium user-anchor (W=182 t)', () => {
  // W_kilolbs = 401.2408. Thresholds:
  //   T1=17.940 (25) · T2=27.308 (20) · T3=37.368 (15) · T4=47.455 (10)
  // 8.4.02 is the Excel-verified anchor (sheet G7 → 23.9 KT).
  const cases: readonly Case[] = [
    { id: '8.4.01', weight: 182, cg: 10.0, expected: 25, strategy: 'below-envelope' },
    { id: '8.4.02', weight: 182, cg: 20.0, expected: 23.9, strategy: 'within-bracket' },
    { id: '8.4.03', weight: 182, cg: 25.0, expected: 21.2, strategy: 'within-bracket' },
    { id: '8.4.04', weight: 182, cg: 30.0, expected: 18.6, strategy: 'within-bracket' },
    { id: '8.4.05', weight: 182, cg: 35.0, expected: 16.1, strategy: 'within-bracket' },
    { id: '8.4.06', weight: 182, cg: 48.0, expected: 25, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Medium · explicit anchor assertion (Excel-verified W=182 / CG=20 → 23.9 KT)', () => {
  it('anchor: W=182 t, CG=20 %MAC on Medium runway → 23.9 KT', () => {
    const { w, cg } = vo(182, 20);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor case unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    expect(r.value.maxCrosswindKnots).toBe(23.9);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
    // String coercion (used by ResultPanel) must show the decimal.
    expect(String(r.value.maxCrosswindKnots)).toBe('23.9');
  });
});

describe('Medium · 1-decimal precision regression', () => {
  it('ROUNDDOWN keeps the fractional digit (W=170/CG=20 → 23.4, not 23 or 23.5)', () => {
    // raw ≈ 23.4205 → floor·10/10 = 234/10 = 23.4. Verifies the
    // ROUNDDOWN-at-decimals=1 path produces a non-integer value
    // observable to the UI layer.
    const { w, cg } = vo(170, 20);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(23.4);
    expect(String(r.value.maxCrosswindKnots)).toBe('23.4');
  });
});

describe('Medium · cap-absence (maxCap=null)', () => {
  it('IFNA below-envelope returns brackets[0].crosswindKnots=25 unclamped (W=170, CG=8)', () => {
    const { w, cg } = vo(170, 8);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(25);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('IFNA above-envelope returns 25 (W=170, CG=50)', () => {
    const { w, cg } = vo(170, 50);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(25);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });
});

describe('Cross-condition ordering · Dry ≥ Good ≥ MediumToGood ≥ Medium', () => {
  it('W=170/CG=30 after ADR-0017: Dry → 37, Good → 33.7, MediumToGood → 23.5, Medium → 18.1', () => {
    const { w, cg } = vo(170, 30);
    const inputs = {
      weightTons: w,
      cgPercent: cg,
      aircraft: AIRCRAFT,
      phase: PHASE,
    } as const;
    const dry = calculateCrosswindLimit({ ...inputs, runwayCondition: 'dry' }, data);
    const good = calculateCrosswindLimit({ ...inputs, runwayCondition: 'good' }, data);
    const mtg = calculateCrosswindLimit({ ...inputs, runwayCondition: 'mediumToGood' }, data);
    const med = calculateCrosswindLimit({ ...inputs, runwayCondition: 'medium' }, data);
    if (!dry.ok || !good.ok || !mtg.ok || !med.ok) {
      throw new Error('all four should succeed');
    }
    const dryKt = dry.value.maxCrosswindKnots as number;
    const goodKt = good.value.maxCrosswindKnots as number;
    const mtgKt = mtg.value.maxCrosswindKnots as number;
    const medKt = med.value.maxCrosswindKnots as number;
    expect(dryKt).toBe(37);
    expect(goodKt).toBe(33.7);
    expect(mtgKt).toBe(23.5);
    expect(medKt).toBe(18.1);
    // Monotonic invariant.
    expect(dryKt).toBeGreaterThanOrEqual(goodKt);
    expect(goodKt).toBeGreaterThanOrEqual(mtgKt);
    expect(mtgKt).toBeGreaterThanOrEqual(medKt);
  });
});

describe('Medium · metadata sanity', () => {
  it('returns Medium dataset metadata (FCOM reference, dataVersion from file)', () => {
    const { w, cg } = vo(182, 20);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(r.value.metadata.dataVersion).toBe(data.dataVersion);
  });
});
