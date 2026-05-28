/**
 * Test Set #6 — Good runway (RWYCC 5) for B787-8 takeoff.
 *
 * Spec: `02_Specification/05-crosswind-algorithm.md` § "Test set #6 ·
 *       Good (RWYCC 5)".
 *
 * Good uses the same `bracketedLinear` strategy as Dry but with 6
 * brackets (added crosswindKnots=15 endpoint). Excel-equivalent params
 * per "Good 788" sheet:
 *   • brackets:    [40, 35, 30, 25, 20, 15]
 *   • intercepts:  [ 2,  6, 10, 14, 18, 22]   (uniform +4 step)
 *   • slope:       0.06                       (uniform across brackets)
 *   • maxCap:      37                         (FCOM Tab 2.29.2a)
 *   • decimals:    0                          (ROUNDDOWN to integer)
 *
 * Anchor case (user-verified against Excel):
 *   W=150 t, CG=26 %MAC → 34 KT (raw 34.873, bracket [T2, T3], no cap)
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
const RUNWAY: RunwayCondition = 'good';

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

describe('Test Set #6.1 · Good at W=170 t (heavy)', () => {
  // Thresholds (slope 0.06, W_kilolbs = 374.7854):
  //   T1=24.487 (40) · T2=28.487 (35) · T3=32.487 (30)
  //   T4=36.487 (25) · T5=40.487 (20) · T6=44.487 (15)
  // Many low-CG cases hit cap=37 (raw output > 37 → clamped).
  const cases: readonly Case[] = [
    { id: '6.1.01', weight: 170, cg: 8.0, expected: 37, strategy: 'below-envelope' },
    { id: '6.1.02', weight: 170, cg: 20.0, expected: 37, strategy: 'below-envelope' },
    { id: '6.1.03', weight: 170, cg: 24.487124, expected: 37, strategy: 'within-bracket' },
    { id: '6.1.04', weight: 170, cg: 26.0, expected: 37, strategy: 'within-bracket' },
    { id: '6.1.05', weight: 170, cg: 27.0, expected: 37, strategy: 'within-bracket' },
    { id: '6.1.06', weight: 170, cg: 28.0, expected: 37, strategy: 'within-bracket' },
    { id: '6.1.07', weight: 170, cg: 28.487124, expected: 35, strategy: 'within-bracket' },
    { id: '6.1.08', weight: 170, cg: 29.0, expected: 34.5, strategy: 'within-bracket' },
    { id: '6.1.09', weight: 170, cg: 30.0, expected: 33.7, strategy: 'within-bracket' },
    { id: '6.1.10', weight: 170, cg: 31.0, expected: 32.9, strategy: 'within-bracket' },
    { id: '6.1.11', weight: 170, cg: 32.0, expected: 32.1, strategy: 'within-bracket' },
    { id: '6.1.12', weight: 170, cg: 32.487124, expected: 30, strategy: 'within-bracket' },
    { id: '6.1.13', weight: 170, cg: 34.0, expected: 28.7, strategy: 'within-bracket' },
    { id: '6.1.14', weight: 170, cg: 36.487124, expected: 25, strategy: 'within-bracket' },
    { id: '6.1.15', weight: 170, cg: 40.487124, expected: 20, strategy: 'within-bracket' },
    { id: '6.1.16', weight: 170, cg: 44.487124, expected: 15, strategy: 'within-bracket' },
    { id: '6.1.17', weight: 170, cg: 45.0, expected: 37, strategy: 'above-envelope' },
    { id: '6.1.18', weight: 170, cg: 50.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #6.2 · Good at W=130 t (medium)', () => {
  // Thresholds (W_kilolbs = 286.6006):
  //   T1=19.196 · T2=23.196 · T3=27.196 · T4=31.196 · T5=35.196 · T6=39.196
  const cases: readonly Case[] = [
    { id: '6.2.01', weight: 130, cg: 10.0, expected: 37, strategy: 'below-envelope' },
    { id: '6.2.02', weight: 130, cg: 19.196036, expected: 37, strategy: 'within-bracket' },
    { id: '6.2.03', weight: 130, cg: 20.0, expected: 37, strategy: 'within-bracket' },
    { id: '6.2.04', weight: 130, cg: 23.196036, expected: 35, strategy: 'within-bracket' },
    { id: '6.2.05', weight: 130, cg: 25.0, expected: 33.5, strategy: 'within-bracket' },
    { id: '6.2.06', weight: 130, cg: 27.196036, expected: 30, strategy: 'within-bracket' },
    { id: '6.2.07', weight: 130, cg: 30.0, expected: 27.7, strategy: 'within-bracket' },
    { id: '6.2.08', weight: 130, cg: 35.0, expected: 21.9, strategy: 'within-bracket' },
    { id: '6.2.09', weight: 130, cg: 39.196036, expected: 15, strategy: 'within-bracket' },
    { id: '6.2.10', weight: 130, cg: 40.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #6.3 · Good at W=160 t (mid)', () => {
  // Thresholds (W_kilolbs = 352.7392):
  //   T1=23.164 · T2=27.164 · T3=31.164 · T4=35.164 · T5=39.164 · T6=43.164
  const cases: readonly Case[] = [
    { id: '6.3.01', weight: 160, cg: 20.0, expected: 37, strategy: 'below-envelope' },
    { id: '6.3.02', weight: 160, cg: 23.164352, expected: 37, strategy: 'within-bracket' },
    { id: '6.3.03', weight: 160, cg: 24.0, expected: 37, strategy: 'within-bracket' },
    { id: '6.3.04', weight: 160, cg: 28.0, expected: 34.3, strategy: 'within-bracket' },
    { id: '6.3.05', weight: 160, cg: 32.0, expected: 29.3, strategy: 'within-bracket' },
    { id: '6.3.06', weight: 160, cg: 35.164352, expected: 25, strategy: 'within-bracket' },
    { id: '6.3.07', weight: 160, cg: 40.0, expected: 19.3, strategy: 'within-bracket' },
    { id: '6.3.08', weight: 160, cg: 44.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #6.4 · Good user-anchor + W=150 t coverage', () => {
  // Thresholds (W_kilolbs = 330.693):
  //   T1=21.842 · T2=25.842 · T3=29.842 · T4=33.842 · T5=37.842 · T6=41.842
  // 6.4.02 is the Excel-verified anchor case (W=150, CG=26 → 34 KT).
  const cases: readonly Case[] = [
    { id: '6.4.01', weight: 150, cg: 10.0, expected: 37, strategy: 'below-envelope' },
    { id: '6.4.02', weight: 150, cg: 26.0, expected: 34.8, strategy: 'within-bracket' },
    { id: '6.4.03', weight: 150, cg: 30.0, expected: 29.8, strategy: 'within-bracket' },
    { id: '6.4.04', weight: 150, cg: 35.0, expected: 24, strategy: 'within-bracket' },
    { id: '6.4.05', weight: 150, cg: 42.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Good · explicit anchor assertion (Excel-verified W=150 / CG=26 → 34 KT)', () => {
  // Standalone, named assertion duplicating case 6.4.02. Future
  // maintainers can grep "W=150" / "CG=26" to find the user-verified
  // reference point quickly, independent of the table-driven loop.
  it('anchor: W=150 t, CG=26 %MAC on Good runway → 34.8 KT (ADR-0017)', () => {
    const { w, cg } = vo(150, 26);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor case unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    // raw 34.873; ROUNDDOWN at 0.1 boundary = 34.8.
    expect(r.value.maxCrosswindKnots).toBe(34.8);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });
});

describe('Good · cap mechanism (shared maxCap=37 with Dry)', () => {
  it('low CG with high uncapped result is clamped to 37 (W=170, CG=20 → raw 40 → cap 37)', () => {
    const { w, cg } = vo(170, 20);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.value.maxCrosswindKnots).toBe(37);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('above-envelope IFNA fallback is also capped (W=170, CG=50 → 40 → 37)', () => {
    const { w, cg } = vo(170, 50);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.value.maxCrosswindKnots).toBe(37);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });
});

describe('Good · metadata sanity', () => {
  it('returns Good dataset metadata (FCOM reference, dataVersion from file)', () => {
    const { w, cg } = vo(150, 26);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(r.value.metadata.dataVersion).toBe(data.dataVersion);
  });
});
