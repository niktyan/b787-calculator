/**
 * Test Set #10 — Poor runway (RWYCC 1) for B787-8 takeoff.
 *
 * Spec: `02_Specification/05-crosswind-algorithm.md` § "Test set #10 ·
 *       Poor (RWYCC 1)".
 *
 * Poor uses the `constant` strategy — the simplest of the four
 * active strategies. Per Excel "Poor 788" sheet G7 (literal value
 * 10) and Q5 user decision (FCOM RWYCC 1 row alternates 15/10;
 * Excel uses 10 as the conservative bound uniformly):
 *
 *     value = 10 KT — for ANY input (weight, CG, …)
 *
 * Defining property: **complete input independence**. No formula,
 * no conditional, no XLOOKUP. Every (weight, CG) pair → 10 KT.
 *
 * After PR 7 ALL 6 RWYCC conditions for B787-8 are active. This
 * file is the last per-condition spec table in the suite.
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
const RUNWAY: RunwayCondition = 'poor';

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

describe('Test Set #10.1 · Poor anchor + sanity', () => {
  // The Excel "Poor 788" sheet G7 returns 10 regardless of inputs.
  // Sample three representative points (heavy/CG=20, mid/CG=30, light/CG=10)
  // — all collapse to 10.
  const cases: readonly Case[] = [
    { id: '10.1.01', weight: 182, cg: 20.0, expected: 10, strategy: 'within-bracket' },
    { id: '10.1.02', weight: 170, cg: 30.0, expected: 10, strategy: 'within-bracket' },
    { id: '10.1.03', weight: 110, cg: 10.0, expected: 10, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #10.2 · Full input-independence matrix (5 weights × 5 CGs)', () => {
  // The defining property of `constant` strategy: every (W, CG) pair
  // produces the same constant value=10. This is the load-bearing
  // iPhone-test scenario.
  it('25 combinations of (W ∈ {110, 130, 150, 170, 200}) × (CG ∈ {10, 20, 30, 40, 50}) all return 10 KT', () => {
    const weights = [110, 130, 150, 170, 200];
    const cgs = [10, 20, 30, 40, 50];
    const outputs: number[] = [];
    for (const w of weights) {
      for (const cg of cgs) {
        const { w: vow, cg: voc } = vo(w, cg);
        const r = calculateCrosswindLimit(
          {
            weightTons: vow,
            cgPercent: voc,
            aircraft: AIRCRAFT,
            phase: PHASE,
            runwayCondition: RUNWAY,
          },
          data,
        );
        if (!r.ok) {
          throw new Error(`unexpected error at W=${w}/CG=${cg}: ${JSON.stringify(r.error)}`);
        }
        outputs.push(r.value.maxCrosswindKnots);
      }
    }
    expect(outputs).toHaveLength(25);
    // Construct expected array via Array.from rather than literal 25-element
    // to keep the test self-evident: every entry is the constant 10.
    expect(outputs).toEqual(Array.from({ length: 25 }, () => 10));
  });
});

describe('Poor · explicit anchor assertion (constant, any input → 10 KT)', () => {
  it('anchor: W=182 t, CG=20 %MAC on Poor runway → 10 KT', () => {
    const { w, cg } = vo(182, 20);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor case unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    expect(r.value.maxCrosswindKnots).toBe(10);
    expect(String(r.value.maxCrosswindKnots)).toBe('10');
  });
});

describe('Cross-condition ordering · Dry ≥ Good ≥ MTG ≥ Medium ≥ MTP ≥ Poor (full 6-condition chain)', () => {
  // Full chain at W=170/CG=30 — every active condition exercised.
  // Note: MediumToPoor at CG=30 is 15 (plateau boundary), NOT 13.9
  // (which is the W=182/CG=32 MediumToPoor anchor — different case).
  it('W=170/CG=30: 37 / 33 / 23 / 18.1 / 15 / 10 (full monotonic chain across all 6 active RWYCC conditions)', () => {
    const { w, cg } = vo(170, 30);
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
    const poor = calculateCrosswindLimit({ ...baseInputs, runwayCondition: 'poor' }, data);
    if (!dry.ok || !good.ok || !mtg.ok || !med.ok || !mtp.ok || !poor.ok) {
      throw new Error('all six should succeed');
    }
    const dryKt = dry.value.maxCrosswindKnots;
    const goodKt = good.value.maxCrosswindKnots;
    const mtgKt = mtg.value.maxCrosswindKnots;
    const medKt = med.value.maxCrosswindKnots;
    const mtpKt = mtp.value.maxCrosswindKnots;
    const poorKt = poor.value.maxCrosswindKnots;
    expect(dryKt).toBe(37);
    expect(goodKt).toBe(33);
    expect(mtgKt).toBe(23);
    expect(medKt).toBe(18.1);
    expect(mtpKt).toBe(15);
    expect(poorKt).toBe(10);
    // Monotonic invariant — load-bearing assertion across the full
    // RWYCC scale. Any future data edit that breaks the ordering
    // fails loudly.
    expect(dryKt).toBeGreaterThanOrEqual(goodKt);
    expect(goodKt).toBeGreaterThanOrEqual(mtgKt);
    expect(mtgKt).toBeGreaterThanOrEqual(medKt);
    expect(medKt).toBeGreaterThanOrEqual(mtpKt);
    expect(mtpKt).toBeGreaterThanOrEqual(poorKt);
  });
});

describe('Poor · metadata sanity', () => {
  it('returns Poor dataset metadata (FCOM reference, dataVersion)', () => {
    const { w, cg } = vo(170, 30);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(r.value.metadata.dataVersion).toBe(data.dataVersion);
  });
});
