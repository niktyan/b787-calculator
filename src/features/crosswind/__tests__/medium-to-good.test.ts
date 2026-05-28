/**
 * Test Set #7 — MediumToGood runway (RWYCC 4) for B787-8 takeoff.
 *
 * Spec: `02_Specification/05-crosswind-algorithm.md` § "Test set #7 ·
 *       MediumToGood (RWYCC 4)".
 *
 * MediumToGood uses the same `bracketedLinear` strategy as Dry and
 * Good but with distinct params per Excel "Medium to Good 788" sheet:
 *   • brackets:    [35, 30, 25, 20, 15, 10]   (max=35 KT, min=10 KT —
 *                                              shifted DOWN vs Dry/Good)
 *   • intercepts:  [2.2, 7.2, 12.2, 17.2, 22.2, 27.2]   (uniform +5)
 *   • slope:       0.0436                     (gentler than Good's 0.06)
 *   • maxCap:      null                       (first non-capped condition;
 *                                              Excel sheet has no G8)
 *   • decimals:    0
 *
 * Because intercepts differ by exactly 5 and consecutive crosswindKnots
 * differ by 5, E9 = (E_(i+1) − E_i)/5 ≡ 1 in every bracket. The formula
 * collapses to `result = F7 − (cg − E7)` — exactly 1 KT drop per 1 %MAC
 * of CG within any bracket.
 *
 * Anchor case (user-verified against Excel sheet G7):
 *   W=175 t, CG=24 %MAC → 30 KT (raw 30.0213, bracket [T1, T2], no cap)
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
const RUNWAY: RunwayCondition = 'mediumToGood';

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

describe('Test Set #7.1 · MediumToGood at W=170 t (heavy)', () => {
  // Thresholds (slope 0.0436, W_kilolbs = 374.7854):
  //   T1=18.541 (35) · T2=23.541 (30) · T3=28.541 (25)
  //   T4=33.541 (20) · T5=38.541 (15) · T6=43.541 (10)
  const cases: readonly Case[] = [
    { id: '7.1.01', weight: 170, cg: 8.0, expected: 35, strategy: 'below-envelope' },
    { id: '7.1.02', weight: 170, cg: 15.0, expected: 35, strategy: 'below-envelope' },
    { id: '7.1.03', weight: 170, cg: 18.54064344, expected: 35, strategy: 'within-bracket' },
    { id: '7.1.04', weight: 170, cg: 20.0, expected: 33.5, strategy: 'within-bracket' },
    { id: '7.1.05', weight: 170, cg: 22.0, expected: 31.5, strategy: 'within-bracket' },
    { id: '7.1.06', weight: 170, cg: 23.54064344, expected: 30, strategy: 'within-bracket' },
    { id: '7.1.07', weight: 170, cg: 25.0, expected: 28.5, strategy: 'within-bracket' },
    { id: '7.1.08', weight: 170, cg: 28.0, expected: 25.5, strategy: 'within-bracket' },
    { id: '7.1.09', weight: 170, cg: 28.54064344, expected: 25, strategy: 'within-bracket' },
    { id: '7.1.10', weight: 170, cg: 30.0, expected: 23.5, strategy: 'within-bracket' },
    { id: '7.1.11', weight: 170, cg: 33.54064344, expected: 20, strategy: 'within-bracket' },
    { id: '7.1.12', weight: 170, cg: 35.0, expected: 18.5, strategy: 'within-bracket' },
    { id: '7.1.13', weight: 170, cg: 38.54064344, expected: 15, strategy: 'within-bracket' },
    { id: '7.1.14', weight: 170, cg: 40.0, expected: 13.5, strategy: 'within-bracket' },
    { id: '7.1.15', weight: 170, cg: 43.54064344, expected: 10, strategy: 'within-bracket' },
    { id: '7.1.16', weight: 170, cg: 45.0, expected: 35, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #7.2 · MediumToGood at W=130 t (medium)', () => {
  // Thresholds (W_kilolbs = 286.6006):
  //   T1=14.696 · T2=19.696 · T3=24.696 · T4=29.696 · T5=34.696 · T6=39.696
  const cases: readonly Case[] = [
    { id: '7.2.01', weight: 130, cg: 8.0, expected: 35, strategy: 'below-envelope' },
    { id: '7.2.02', weight: 130, cg: 14.69578616, expected: 35, strategy: 'within-bracket' },
    { id: '7.2.03', weight: 130, cg: 15.0, expected: 34.6, strategy: 'within-bracket' },
    { id: '7.2.04', weight: 130, cg: 19.69578616, expected: 30, strategy: 'within-bracket' },
    { id: '7.2.05', weight: 130, cg: 22.0, expected: 27.6, strategy: 'within-bracket' },
    { id: '7.2.06', weight: 130, cg: 24.69578616, expected: 25, strategy: 'within-bracket' },
    { id: '7.2.07', weight: 130, cg: 27.0, expected: 22.6, strategy: 'within-bracket' },
    { id: '7.2.08', weight: 130, cg: 29.69578616, expected: 20, strategy: 'within-bracket' },
    { id: '7.2.09', weight: 130, cg: 34.69578616, expected: 15, strategy: 'within-bracket' },
    { id: '7.2.10', weight: 130, cg: 39.69578616, expected: 10, strategy: 'within-bracket' },
    { id: '7.2.11', weight: 130, cg: 40.0, expected: 35, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #7.3 · MediumToGood at W=160 t (mid)', () => {
  // Thresholds (W_kilolbs = 352.7392):
  //   T1=17.579 · T2=22.579 · T3=27.579 · T4=32.579 · T5=37.579 · T6=42.579
  const cases: readonly Case[] = [
    { id: '7.3.01', weight: 160, cg: 15.0, expected: 35, strategy: 'below-envelope' },
    { id: '7.3.02', weight: 160, cg: 17.57942912, expected: 35, strategy: 'within-bracket' },
    { id: '7.3.03', weight: 160, cg: 20.0, expected: 32.5, strategy: 'within-bracket' },
    { id: '7.3.04', weight: 160, cg: 22.57942912, expected: 30, strategy: 'within-bracket' },
    { id: '7.3.05', weight: 160, cg: 25.0, expected: 27.5, strategy: 'within-bracket' },
    { id: '7.3.06', weight: 160, cg: 30.0, expected: 22.5, strategy: 'within-bracket' },
    { id: '7.3.07', weight: 160, cg: 37.57942912, expected: 15, strategy: 'within-bracket' },
    { id: '7.3.08', weight: 160, cg: 42.57942912, expected: 10, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #7.4 · MediumToGood user-anchor + W=175 t coverage', () => {
  // Thresholds (W_kilolbs = 385.8085):
  //   T1=19.021 · T2=24.021 · T3=29.021 · T4=34.021 · T5=39.021 · T6=44.021
  // 7.4.02 is the Excel-verified anchor (W=175, CG=24 → 30 KT, sheet G7).
  // Raw stays at 30.0213 → ROUNDDOWN-tenth = 30; pre-ADR-0017 was also 30.
  const cases: readonly Case[] = [
    { id: '7.4.01', weight: 175, cg: 10.0, expected: 35, strategy: 'below-envelope' },
    { id: '7.4.02', weight: 175, cg: 24.0, expected: 30, strategy: 'within-bracket' },
    { id: '7.4.03', weight: 175, cg: 30.0, expected: 24, strategy: 'within-bracket' },
    { id: '7.4.04', weight: 175, cg: 35.0, expected: 19, strategy: 'within-bracket' },
    { id: '7.4.05', weight: 175, cg: 44.0, expected: 10, strategy: 'within-bracket' },
    { id: '7.4.06', weight: 175, cg: 45.0, expected: 35, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('MediumToGood · explicit anchor assertion (Excel-verified W=175 / CG=24 → 30 KT)', () => {
  // Standalone, named assertion duplicating case 7.4.02. Future
  // maintainers can grep "W=175" / "CG=24" / "Medium to Good 788" to
  // find the user-verified Excel reference point quickly.
  it('anchor: W=175 t, CG=24 %MAC on MediumToGood runway → 30 KT', () => {
    const { w, cg } = vo(175, 24);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor case unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    expect(r.value.maxCrosswindKnots).toBe(30);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });
});

describe('MediumToGood · cap-absence (maxCap=null)', () => {
  // MediumToGood is the first dataset with maxCap=null. Verify the
  // strategy emits the raw IFNA-fallback (brackets[0].crosswindKnots =
  // 35) unchanged at below/above-envelope, NOT an erroneous higher
  // value mistakenly carried over from Dry/Good's cap=37. Within
  // brackets the max output is also ≤ 35 (= F7 of the topmost
  // bracket), so no cap is observable — but null vs 37 is still a
  // meaningful contract guarantee.

  it('IFNA below-envelope returns brackets[0].crosswindKnots=35 unclamped (W=170, CG=10)', () => {
    const { w, cg } = vo(170, 10);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.value.maxCrosswindKnots).toBe(35);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('IFNA above-envelope also returns 35 (W=170, CG=50)', () => {
    const { w, cg } = vo(170, 50);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected ok');
    }
    expect(r.value.maxCrosswindKnots).toBe(35);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });
});

describe('Cross-condition ordering · Dry ≥ Good ≥ MediumToGood at same input', () => {
  // Sanity check that more-degraded RWYCC produces more-conservative
  // (lower-or-equal) advisory limits. Picked W=170/CG=30 because the
  // Dry result for this input lands at the cap (37), Good produces a
  // mid-range value (33), and MediumToGood produces a low value (23)
  // — three distinct outputs that exercise the ordering meaningfully.
  it('W=170/CG=30: Dry → 37, Good → 33, MediumToGood → 23', () => {
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
    if (!dry.ok || !good.ok || !mtg.ok) {
      throw new Error('all three should succeed');
    }
    const dryKt = dry.value.maxCrosswindKnots as number;
    const goodKt = good.value.maxCrosswindKnots as number;
    const mtgKt = mtg.value.maxCrosswindKnots as number;
    expect(dryKt).toBe(37);
    expect(goodKt).toBe(33.7);
    expect(mtgKt).toBe(23.5);
    // Ordering invariant — load-bearing assertion regardless of exact
    // numbers (would catch any future data-edit that broke the
    // monotonicity).
    expect(dryKt).toBeGreaterThanOrEqual(goodKt);
    expect(goodKt).toBeGreaterThanOrEqual(mtgKt);
  });
});

describe('MediumToGood · metadata sanity', () => {
  it('returns MediumToGood dataset metadata (FCOM reference, dataVersion from file)', () => {
    const { w, cg } = vo(175, 24);
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
