/**
 * Authoritative test cases from `02_Specification/05-crosswind-algorithm.md`
 * Test Sets #1, #2, #3. Each row in the spec table → one `it` block.
 *
 * Per ADR-0017, output rounding is uniform ROUNDDOWN to 0.1 KT applied
 * at the calculator boundary (was per-condition `decimals: 0 | 1`).
 * Expected values below are recomputed from the same raw formula
 * outputs using the new uniform 0.1-grid floor. Cases that snap to a
 * bracket label (IFNA fallback, exact-T breakpoints) or that clamp to
 * the integer `maxCap=37` remain integer-valued; only sub-grid
 * formula outputs gain a fractional digit (e.g. 33 → 33.5, 34 → 34.9).
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
const RUNWAY: RunwayCondition = 'dry';

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

describe('Test Set #1 · Weight = 170 t', () => {
  // Thresholds: T1=27.6876, T2=30.8876, T3=34.3876, T4=37.8876, T5=41.3876
  // Cases whose raw result > 37 are clamped to 37 by Dry maxCap (PR 2,
  // per FCOM Tab 2.29.2a; Excel G8: =IF(G7>37,37,G7)).
  const cases: readonly Case[] = [
    { id: '1.01', weight: 170, cg: 8.0, expected: 37, strategy: 'below-envelope' },
    { id: '1.02', weight: 170, cg: 15.0, expected: 37, strategy: 'below-envelope' },
    { id: '1.03', weight: 170, cg: 25.0, expected: 37, strategy: 'below-envelope' },
    { id: '1.04', weight: 170, cg: 27.0, expected: 37, strategy: 'below-envelope' },
    { id: '1.05', weight: 170, cg: 27.68763904, expected: 37, strategy: 'within-bracket' },
    { id: '1.06', weight: 170, cg: 27.7, expected: 37, strategy: 'within-bracket' },
    { id: '1.07', weight: 170, cg: 28.0, expected: 37, strategy: 'within-bracket' },
    { id: '1.08', weight: 170, cg: 30.0, expected: 37, strategy: 'within-bracket' },
    { id: '1.09', weight: 170, cg: 30.886, expected: 37, strategy: 'within-bracket' },
    { id: '1.10', weight: 170, cg: 30.88763904, expected: 35, strategy: 'within-bracket' },
    { id: '1.11', weight: 170, cg: 31.0, expected: 34.9, strategy: 'within-bracket' },
    { id: '1.12', weight: 170, cg: 32.0, expected: 34.2, strategy: 'within-bracket' },
    { id: '1.13', weight: 170, cg: 33.0, expected: 33.5, strategy: 'within-bracket' },
    { id: '1.14', weight: 170, cg: 34.387, expected: 32.5, strategy: 'within-bracket' },
    { id: '1.15', weight: 170, cg: 34.38763904, expected: 30, strategy: 'within-bracket' },
    { id: '1.16', weight: 170, cg: 34.4, expected: 29.9, strategy: 'within-bracket' },
    { id: '1.17', weight: 170, cg: 35.0, expected: 29.5, strategy: 'within-bracket' },
    { id: '1.18', weight: 170, cg: 36.0, expected: 28.8, strategy: 'within-bracket' },
    { id: '1.19', weight: 170, cg: 37.88763904, expected: 25, strategy: 'within-bracket' },
    { id: '1.20', weight: 170, cg: 38.0, expected: 24.9, strategy: 'within-bracket' },
    { id: '1.21', weight: 170, cg: 40.0, expected: 23.5, strategy: 'within-bracket' },
    { id: '1.22', weight: 170, cg: 41.38763904, expected: 20, strategy: 'within-bracket' },
    { id: '1.23', weight: 170, cg: 42.0, expected: 37, strategy: 'above-envelope' },
    { id: '1.24', weight: 170, cg: 50.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #2 · Weight = 130 t', () => {
  // Thresholds: T1=22.6082, T2=25.8082, T3=29.3082, T4=32.8082, T5=36.3082
  // Cases whose raw result > 37 are clamped to 37 by Dry maxCap (PR 2).
  const cases: readonly Case[] = [
    { id: '2.01', weight: 130, cg: 10.0, expected: 37, strategy: 'below-envelope' },
    { id: '2.02', weight: 130, cg: 22.6, expected: 37, strategy: 'below-envelope' },
    { id: '2.03', weight: 130, cg: 22.60819456, expected: 37, strategy: 'within-bracket' },
    { id: '2.04', weight: 130, cg: 23.0, expected: 37, strategy: 'within-bracket' },
    { id: '2.05', weight: 130, cg: 25.0, expected: 37, strategy: 'within-bracket' },
    { id: '2.06', weight: 130, cg: 27.0, expected: 34.1, strategy: 'within-bracket' },
    { id: '2.07', weight: 130, cg: 30.0, expected: 29.5, strategy: 'within-bracket' },
    { id: '2.08', weight: 130, cg: 35.0, expected: 23.4, strategy: 'within-bracket' },
    { id: '2.09', weight: 130, cg: 36.30819456, expected: 20, strategy: 'within-bracket' },
    { id: '2.10', weight: 130, cg: 38.0, expected: 37, strategy: 'above-envelope' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Test Set #3 · Weight = 160 t', () => {
  // Thresholds: T1=26.4178, T2=29.6178, T3=33.1178, T4=36.6178, T5=40.1178
  // Cases whose raw result > 37 are clamped to 37 by Dry maxCap (PR 2).
  const cases: readonly Case[] = [
    { id: '3.01', weight: 160, cg: 20.0, expected: 37, strategy: 'below-envelope' },
    { id: '3.02', weight: 160, cg: 26.41777792, expected: 37, strategy: 'within-bracket' },
    { id: '3.03', weight: 160, cg: 27.0, expected: 37, strategy: 'within-bracket' },
    { id: '3.04', weight: 160, cg: 30.0, expected: 34.7, strategy: 'within-bracket' },
    { id: '3.05', weight: 160, cg: 33.0, expected: 32.6, strategy: 'within-bracket' },
    { id: '3.06', weight: 160, cg: 35.0, expected: 28.6, strategy: 'within-bracket' },
    { id: '3.07', weight: 160, cg: 40.0, expected: 22.6, strategy: 'within-bracket' },
  ];
  cases.forEach((c) => {
    it(`case ${c.id}: W=${c.weight}, CG=${c.cg} → ${c.expected} KT (${c.strategy})`, () => {
      runCase(c);
    });
  });
});

describe('Excel-equivalent peculiarities (regression)', () => {
  it('1.09 vs 1.10 — discontinuity at bracket boundary (37 → 35, no smooth 36)', () => {
    const justBefore = vo(170, 30.886);
    const exactBoundary = vo(170, 30.88763904);
    const r1 = calculateCrosswindLimit(
      {
        weightTons: justBefore.w,
        cgPercent: justBefore.cg,
        aircraft: AIRCRAFT,
        phase: PHASE,
        runwayCondition: RUNWAY,
      },
      data,
    );
    const r2 = calculateCrosswindLimit(
      {
        weightTons: exactBoundary.w,
        cgPercent: exactBoundary.cg,
        aircraft: AIRCRAFT,
        phase: PHASE,
        runwayCondition: RUNWAY,
      },
      data,
    );
    if (!r1.ok || !r2.ok) {
      throw new Error('expected both to succeed');
    }
    // Pre-cap raw: 37.95 → 37 vs exactly 35. Post-cap (≤37) unchanged.
    expect(r1.value.maxCrosswindKnots).toBe(37);
    expect(r2.value.maxCrosswindKnots).toBe(35);
  });

  it('1.23 — IFNA-fallback above all thresholds returns brackets[0] (40), then capped to 37', () => {
    const { w, cg } = vo(170, 42.0);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected success');
    }
    // IFNA-fallback raw is 40 (brackets[0].crosswindKnots), clamped to
    // maxCap=37 per FCOM Tab 2.29.2a. calculationStrategy still reports
    // 'above-envelope' (cap is applied post-strategy, does not change
    // the branch label).
    expect(r.value.maxCrosswindKnots).toBe(37);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });

  it('uses Math.floor at 0.1 (ADR-0017) — raw 33.521 → 33.5 not 33.6', () => {
    // W=170, CG=33: raw ≈ 33.521. Per ADR-0017 the boundary applies
    // roundDownToTenth (Math.floor(value * 10) / 10) = 33.5 — strictly
    // below the raw, never rounding up. cap=37 doesn't trigger
    // (33.5 ≤ 37), so the 0.1-floor behavior is observable.
    const { w, cg } = vo(170, 33.0);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected success');
    }
    expect(r.value.maxCrosswindKnots).toBe(33.5);
  });
});

describe('maxCap mechanism · Dry cap=37 (PR 2)', () => {
  // Integration check that the bundled Dry maxCap=37 clamps a real-Dry
  // case at an Excel-verified point. Boundary semantics (raw 37.001 →
  // 37 inclusive) and null-cap escape hatch are covered by direct unit
  // tests in `bracketed-linear-strategy.test.ts` → describe `Cap
  // mechanism (PR 2 boundary)`.

  it('Excel-verified Dry case: W=170, CG=28 → raw 39 (floored) → cap clamps to 37', () => {
    // Pre-PR 2 this case produced 39 (case 1.07 raw ≈ 39.800). Post-cap:
    // floor 39 > 37 → clamped to 37, mirroring Excel formula G8 behavior
    // on a real production input. The 'within-bracket' branch label is
    // preserved — cap is applied post-strategy.
    const { w, cg } = vo(170, 28);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected success');
    }
    expect(r.value.maxCrosswindKnots).toBe(37);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });
});

describe('Calculator metadata', () => {
  it('returns referenceDocument and dataVersion from the JSON', () => {
    const { w, cg } = vo(170, 32);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: AIRCRAFT, phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error('expected success');
    }
    expect(r.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(r.value.metadata.dataVersion).toBe(data.dataVersion);
  });

  it('returns a computed result for b787_9 (activated in Sprint B / ADR-0013)', () => {
    // Before Sprint B this case asserted DataNotAvailable.
    // aircraft-not-implemented; the variant is now fully shipped
    // (envelope + 6/6 RWYCC), so the assertion flips to success.
    const { w, cg } = vo(170, 32);
    const r = calculateCrosswindLimit(
      { weightTons: w, cgPercent: cg, aircraft: 'b787_9', phase: PHASE, runwayCondition: RUNWAY },
      data,
    );
    if (!r.ok) {
      throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
    }
    expect(r.value.metadata.aircraft).toBe('b787_9');
    expect(r.value.maxCrosswindKnots).toBeGreaterThan(0);
  });

  it('returns DataNotAvailable.phase-mismatch when phase differs from data', () => {
    const { w, cg } = vo(170, 32);
    const r = calculateCrosswindLimit(
      {
        weightTons: w,
        cgPercent: cg,
        aircraft: AIRCRAFT,
        phase: 'landing',
        runwayCondition: RUNWAY,
      },
      data,
    );
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('DataNotAvailable');
    if (r.error.kind !== 'DataNotAvailable') {
      throw new Error('expected DataNotAvailable');
    }
    expect(r.error.reason).toBe('phase-mismatch');
  });

  it('all 6 active RWYCC conditions return a computed result for valid B787-8 inputs (PR 7 cross-cutting)', () => {
    // Replaces the now-empty "non-active condition" it.each loop
    // (former list `['poor']` became empty when PR 7 promoted Poor).
    // Converts the negative assertion into a positive cross-cutting
    // one: every condition in the active RWYCC scale must resolve
    // to a calculation success — no `DataNotAvailable` leakage.
    // RWYCC 0 is intentionally absent from the union (it's handled
    // as an operational prohibition outside the bundled byAircraft
    // map; user direction: do not add a runway-condition literal
    // for it in PR 7).
    const conditions: readonly RunwayCondition[] = [
      'dry',
      'good',
      'mediumToGood',
      'medium',
      'mediumToPoor',
      'poor',
    ];
    const { w, cg } = vo(170, 30);
    for (const condition of conditions) {
      const r = calculateCrosswindLimit(
        {
          weightTons: w,
          cgPercent: cg,
          aircraft: AIRCRAFT,
          phase: PHASE,
          runwayCondition: condition,
        },
        data,
      );
      if (!r.ok) {
        throw new Error(`condition ${condition} unexpectedly errored: ${JSON.stringify(r.error)}`);
      }
      // Verify the result reports the correct aircraft so the
      // assertion isn't just "didn't throw" — it's "produced a
      // properly-attributed value".
      expect(r.value.metadata.aircraft).toBe(AIRCRAFT);
    }
  });
});
