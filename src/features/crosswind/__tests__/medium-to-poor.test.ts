/**
 * Test Set #9 — MediumToPoor runway (RWYCC 2) for B787-8 takeoff.
 *
 * Spec: `02_Specification/05-crosswind-algorithm.md` § "Test set #9 ·
 *       MediumToPoor (RWYCC 2)".
 *
 * MediumToPoor uses the new `cgOnlyPiecewise` strategy. Single
 * conditional formula per Excel "Medium to Poor 788" sheet G7:
 *
 *     ROUNDDOWN(IF(CG ≥ 30, 15 − (CG − 30)/1.9, 15), 1)
 *
 * Defining properties exercised by this suite:
 *  • **Weight-independent.** Same CG produces the same output across
 *    all in-envelope and out-of-envelope weights.
 *  • Plateau of 15 KT for CG ≤ 30 %MAC.
 *  • Linear decrease above 30 — exactly 1 KT per 1.9 %MAC of CG.
 *  • For CG > ~58.5 %MAC raw goes negative → `CalculationFailed`
 *    (recommendation A1; in practice deep beyond operational envelope).
 *
 * Anchor case (user-verified against Excel sheet G7):
 *   W=182 t, CG=32 %MAC → 13.9 KT
 *   (raw = 13.94737 → ROUNDDOWN(1) = 13.9)
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
const RUNWAY: RunwayCondition = 'mediumToPoor';

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

describe('Test Set #9.1 · MediumToPoor plateau branch (CG ≤ 30)', () => {
  // The plateau branch always returns plateauValue=15 regardless of
  // weight. We sample multiple CGs and weights to verify the plateau
  // is flat and weight-independent.
  const cases: readonly Case[] = [
    { id: '9.1.01', weight: 110, cg: 8.0, expected: 15, strategy: 'below-envelope' },
    { id: '9.1.02', weight: 130, cg: 15.0, expected: 15, strategy: 'below-envelope' },
    { id: '9.1.03', weight: 150, cg: 20.0, expected: 15, strategy: 'below-envelope' },
    { id: '9.1.04', weight: 170, cg: 25.0, expected: 15, strategy: 'below-envelope' },
    { id: '9.1.05', weight: 172, cg: 29.9, expected: 15, strategy: 'below-envelope' },
    { id: '9.1.06', weight: 182, cg: 30.0, expected: 15, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #9.2 · MediumToPoor decreasing branch (CG > 30)', () => {
  // Linear decrease at 1 KT per 1.9 %MAC. raw drops 0.5263 KT per
  // 1 %MAC increase in CG above the threshold.
  const cases: readonly Case[] = [
    { id: '9.2.01', weight: 170, cg: 30.1, expected: 14.9, strategy: 'within-bracket' },
    { id: '9.2.02', weight: 170, cg: 31.0, expected: 14.4, strategy: 'within-bracket' },
    { id: '9.2.03', weight: 170, cg: 32.0, expected: 13.9, strategy: 'within-bracket' },
    { id: '9.2.04', weight: 170, cg: 33.0, expected: 13.4, strategy: 'within-bracket' },
    { id: '9.2.05', weight: 170, cg: 34.0, expected: 12.8, strategy: 'within-bracket' },
    { id: '9.2.06', weight: 170, cg: 35.0, expected: 12.3, strategy: 'within-bracket' },
    { id: '9.2.07', weight: 170, cg: 36.9, expected: 11.3, strategy: 'within-bracket' },
    { id: '9.2.08', weight: 170, cg: 40.0, expected: 9.7, strategy: 'within-bracket' },
    { id: '9.2.09', weight: 170, cg: 50.0, expected: 4.4, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #9.3 · MediumToPoor user-anchor (W=182 t)', () => {
  // 9.3.02 is the Excel-verified anchor (sheet G7 → 13.9 KT).
  const cases: readonly Case[] = [
    { id: '9.3.01', weight: 182, cg: 30.0, expected: 15, strategy: 'within-bracket' },
    { id: '9.3.02', weight: 182, cg: 32.0, expected: 13.9, strategy: 'within-bracket' },
    { id: '9.3.03', weight: 182, cg: 35.0, expected: 12.3, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('MediumToPoor · explicit anchor assertion (Excel-verified W=182 / CG=32 → 13.9 KT)', () => {
  it('anchor: W=182 t, CG=32 %MAC on MediumToPoor runway → 13.9 KT', () => {
    const { w, cg } = vo(182, 32);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor case unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    expect(r.value.maxCrosswindKnots).toBe(13.9);
    expect(String(r.value.maxCrosswindKnots)).toBe('13.9');
  });
});

describe('MediumToPoor · weight independence (defining property)', () => {
  // The defining property of cgOnlyPiecewise: weight does not enter
  // the formula. Same CG produces the same output across all weights.
  // This is the load-bearing iPhone-test scenario.
  it('CG=32 with W ∈ {110, 130, 150, 170, 182} all produce 13.9 KT', () => {
    const weights = [110, 130, 150, 170, 182];
    const outputs = weights.map((w) => {
      const { w: vow, cg } = vo(w, 32);
      const r = calculateCrosswindLimit(
        {
          weightTons: vow,
          cgPercent: cg,
          aircraft: AIRCRAFT,
          phase: PHASE,
          runwayCondition: RUNWAY,
        },
        data,
      );
      if (!r.ok) throw new Error(`expected ok at W=${w}`);
      return r.value.maxCrosswindKnots;
    });
    expect(outputs).toEqual([13.9, 13.9, 13.9, 13.9, 13.9]);
  });

  it('CG=25 (plateau) with multiple weights all produce 15 KT', () => {
    const weights = [110, 150, 200];
    const outputs = weights.map((w) => {
      const { w: vow, cg } = vo(w, 25);
      const r = calculateCrosswindLimit(
        {
          weightTons: vow,
          cgPercent: cg,
          aircraft: AIRCRAFT,
          phase: PHASE,
          runwayCondition: RUNWAY,
        },
        data,
      );
      if (!r.ok) throw new Error(`expected ok at W=${w}`);
      return r.value.maxCrosswindKnots;
    });
    expect(outputs).toEqual([15, 15, 15]);
  });
});

describe('MediumToPoor · out-of-envelope CG (negative raw → CalculationFailed per A1)', () => {
  it('CG=60 → raw negative → CalculationFailed', () => {
    // raw = 15 − 30/1.9 = -0.789 → makeCrosswindKnots rejects.
    const { w, cg } = vo(170, 60);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('CG=50 (still positive raw=4.4) → ok', () => {
    const { w, cg } = vo(170, 50);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(4.4);
  });
});

describe('Cross-condition ordering · Dry ≥ Good ≥ MediumToGood ≥ Medium ≥ MediumToPoor', () => {
  // Full 5-condition chain at W=170/CG=32. Computed values (not the
  // approximations in the PR prompt) per user direction:
  //   Dry          → 34   (case 1.12: raw 34.221 → floor 34; cap=37 not triggered)
  //   Good         → 32   (case 6.1.11: raw 32.189 → floor 32)
  //   MediumToGood → 21   (bracket [T3=28.54, T4=33.54]; raw 21.541 → floor 21)
  //   Medium       → 17.1 (bracket [T2=26.29, T3=36.34]; raw 17.160 → ROUNDDOWN(1) 17.1)
  //   MediumToPoor → 13.9 (CG>30; raw 13.947 → ROUNDDOWN(1) 13.9)
  it('W=170/CG=32: 34 / 32 / 21 / 17.1 / 13.9 (full monotonic chain)', () => {
    const { w, cg } = vo(170, 32);
    const baseInputs = {
      weightTons: w,
      cgPercent: cg,
      aircraft: AIRCRAFT,
      phase: PHASE,
    } as const;
    const dry = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'dry' }, data);
    const good = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'good' }, data);
    const mtg = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'mediumToGood' }, data);
    const med = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'medium' }, data);
    const mtp = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'mediumToPoor' }, data);
    if (!dry.ok || !good.ok || !mtg.ok || !med.ok || !mtp.ok) {
      throw new Error('all five should succeed');
    }
    const dryKt = dry.value.maxCrosswindKnots as unknown as number;
    const goodKt = good.value.maxCrosswindKnots as unknown as number;
    const mtgKt = mtg.value.maxCrosswindKnots as unknown as number;
    const medKt = med.value.maxCrosswindKnots as unknown as number;
    const mtpKt = mtp.value.maxCrosswindKnots as unknown as number;
    expect(dryKt).toBe(34);
    expect(goodKt).toBe(32);
    expect(mtgKt).toBe(21);
    expect(medKt).toBe(17.1);
    expect(mtpKt).toBe(13.9);
    // Monotonic invariant — load-bearing assertion.
    expect(dryKt).toBeGreaterThanOrEqual(goodKt);
    expect(goodKt).toBeGreaterThanOrEqual(mtgKt);
    expect(mtgKt).toBeGreaterThanOrEqual(medKt);
    expect(medKt).toBeGreaterThanOrEqual(mtpKt);
  });
});

describe('MediumToPoor · metadata sanity', () => {
  it('returns MediumToPoor dataset metadata (FCOM reference, dataVersion)', () => {
    const { w, cg } = vo(182, 32);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(r.value.metadata.dataVersion).toBe(data.dataVersion);
  });
});
