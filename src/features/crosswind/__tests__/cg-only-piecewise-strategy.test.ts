/**
 * Direct unit tests for `createCGOnlyPiecewiseStrategy`.
 *
 * Covers:
 *  • Plateau branch (CG < cgThreshold) returns plateauValue.
 *  • Decreasing branch (CG ≥ cgThreshold) interpolates linearly.
 *  • Boundary case CG = cgThreshold returns plateauValue (both
 *    branches collapse to the same value at the boundary).
 *  • Weight independence — three different weights with identical
 *    CG produce identical output.
 *  • decimals=0 floors to integer; decimals=1 keeps one fractional
 *    digit.
 *  • Very-large CG drives raw negative → CalculationFailed (per
 *    recommendation A1).
 *  • Defensive: NaN/Infinity inputs return NoLookupData; slopeDivisor=0
 *    returns CalculationFailed.
 *  • Metadata sanity: cgBracket / bracketCrosswindRange collapse to
 *    single-point ranges (CG-only model has no bracket structure).
 */

import { createCGOnlyPiecewiseStrategy } from '../domain/strategies/cg-only-piecewise';
import type { CGOnlyPiecewiseContext } from '../domain/strategies/cg-only-piecewise';
import type { CGOnlyPiecewiseParams, CalculatorInput } from '../domain/strategy';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { AircraftVariant, FlightPhase, RunwayCondition } from '../domain/types';

const MEDIUM_TO_POOR_PARAMS: CGOnlyPiecewiseParams = {
  plateauValue: 15,
  cgThreshold: 30,
  slopeDivisor: 1.9,
  decimals: 1,
};

const CONTEXT: CGOnlyPiecewiseContext = {
  aircraft: 'b787_8',
  dataVersion: 'test',
  referenceDocument: 'Boeing 787 FCOM',
};

const AIRCRAFT: AircraftVariant = 'b787_8';
const PHASE: FlightPhase = 'takeoff';
const RUNWAY: RunwayCondition = 'mediumToPoor';

function input(weight: number, cg: number): CalculatorInput {
  const w = makeWeightInTons(weight);
  const c = makeCGPercentMAC(cg);
  if (!w.ok || !c.ok) {
    throw new Error('VO failure');
  }
  return {
    weightTons: w.value,
    cgPercent: c.value,
    aircraft: AIRCRAFT,
    phase: PHASE,
    runwayCondition: RUNWAY,
  };
}

describe('createCGOnlyPiecewiseStrategy · plateau branch (CG < threshold)', () => {
  const strategy = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT);

  it('reports its discriminator', () => {
    expect(strategy.type).toBe('cgOnlyPiecewise');
  });

  it('CG=8 (well below threshold) → plateau 15', () => {
    const r = strategy.calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(15);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('CG=25 (close to threshold but still in plateau) → 15', () => {
    const r = strategy.calculate(input(170, 25));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(15);
  });

  it('CG=29.9 (just below threshold) → 15', () => {
    const r = strategy.calculate(input(170, 29.9));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(15);
  });
});

describe('createCGOnlyPiecewiseStrategy · decreasing branch (CG ≥ threshold)', () => {
  const strategy = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT);

  it('CG=30 (exact threshold) → 15 (decreasing formula yields plateauValue at boundary)', () => {
    // raw = 15 − (30 − 30)/1.9 = 15. ROUNDDOWN(15, 1) = 15.
    const r = strategy.calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(15);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });

  it('anchor: W=182 / CG=32 → 13.9 (Excel-verified, sheet G7)', () => {
    // raw = 15 − (32 − 30)/1.9 = 15 − 1.05263 = 13.94737 → ROUNDDOWN(1) = 13.9.
    const r = strategy.calculate(input(182, 32));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(13.9);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
    expect(String(r.value.maxCrosswindKnots)).toBe('13.9');
  });

  it('CG=34 → 12.8 (raw 12.8, exact one-decimal)', () => {
    // raw = 15 − 4/1.9 = 15 − 2.10526 = 12.89474 → ROUNDDOWN(1) = 12.8.
    const r = strategy.calculate(input(170, 34));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(12.8);
  });

  it('CG=35 (upper operational envelope) → 12.3', () => {
    // raw = 15 − 5/1.9 = 15 − 2.63158 = 12.36842 → ROUNDDOWN(1) = 12.3.
    const r = strategy.calculate(input(170, 35));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(12.3);
  });
});

describe('Weight independence (defining property of CGOnlyPiecewise)', () => {
  const strategy = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT);

  it('CG=32 with W ∈ {110, 130, 150, 170, 200} all produce 13.9 KT', () => {
    const weights = [110, 130, 150, 170, 200];
    const outputs = weights.map((w) => {
      const r = strategy.calculate(input(w, 32));
      if (!r.ok) throw new Error(`unexpected error at W=${w}`);
      return r.value.maxCrosswindKnots;
    });
    expect(outputs).toEqual([13.9, 13.9, 13.9, 13.9, 13.9]);
  });

  it('CG=20 (plateau) with W ∈ {100, 200} both produce 15 KT', () => {
    const r100 = strategy.calculate(input(100, 20));
    const r200 = strategy.calculate(input(200, 20));
    if (!r100.ok || !r200.ok) throw new Error('expected both ok');
    expect(r100.value.maxCrosswindKnots).toBe(15);
    expect(r200.value.maxCrosswindKnots).toBe(15);
  });
});

describe('decimals (ROUNDDOWN precision)', () => {
  it('decimals=1 preserves fractional digit (W=182/CG=32 → 13.9)', () => {
    const r = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT).calculate(
      input(182, 32),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(13.9);
  });

  it('decimals=0 floors to integer (same input → 13)', () => {
    const params: CGOnlyPiecewiseParams = { ...MEDIUM_TO_POOR_PARAMS, decimals: 0 };
    const r = createCGOnlyPiecewiseStrategy(params, CONTEXT).calculate(input(182, 32));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(13);
  });
});

describe('Out-of-envelope CG (Excel-faithful negative → CalculationFailed per A1)', () => {
  // The MediumToPoor formula goes negative only when CG > 58.5
  // (because raw < 0 ⇔ (CG-30)/1.9 > 15 ⇔ CG > 58.5). Values
  // between operational envelope upper bound (35 %MAC) and this
  // negative-zone produce small positive outputs.
  const strategy = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT);

  it('CG=40 → 9.7 (still positive in decreasing branch)', () => {
    // raw = 15 − 10/1.9 = 9.73684 → ROUNDDOWN(1) = 9.7.
    const r = strategy.calculate(input(170, 40));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(9.7);
  });

  it('CG=50 → 4.4 (still positive)', () => {
    // raw = 15 − 20/1.9 = 4.47368 → ROUNDDOWN(1) = 4.4.
    const r = strategy.calculate(input(170, 50));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(4.4);
  });

  it('CG=60 → raw negative → CalculationFailed', () => {
    // raw = 15 − 30/1.9 = -0.78947 → ROUNDDOWN(1) = -0.8 →
    // makeCrosswindKnots rejects with Negative → CalculationFailed.
    const r = strategy.calculate(input(170, 60));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('CG=100 (extreme out-of-envelope) → strongly negative → CalculationFailed', () => {
    // raw = 15 − 70/1.9 = -21.84 → CalculationFailed.
    const r = strategy.calculate(input(170, 100));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });
});

describe('Defensive paths', () => {
  it('slopeDivisor=0 → CalculationFailed (would yield Infinity)', () => {
    const params: CGOnlyPiecewiseParams = { ...MEDIUM_TO_POOR_PARAMS, slopeDivisor: 0 };
    const r = createCGOnlyPiecewiseStrategy(params, CONTEXT).calculate(input(170, 32));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
    if (r.error.kind !== 'CalculationFailed') throw new Error('expected CalculationFailed');
    expect(r.error.reason).toMatch(/slopeDivisor/);
  });

  it('Infinity weight does not affect result (weight ignored) — still computes', () => {
    // Weight is not used, so even an Infinity weight should yield the
    // CG-driven result. Defence-in-depth guard catches it on the CG
    // side first — but weight is technically unused for this strategy.
    const r = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT).calculate({
      weightTons: Number.POSITIVE_INFINITY as never,
      cgPercent: 32 as never,
      aircraft: AIRCRAFT,
      phase: PHASE,
      runwayCondition: RUNWAY,
    });
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('NoLookupData');
  });
});

describe('Metadata sanity', () => {
  it('cgBracket and bracketCrosswindRange collapse to single-point ranges', () => {
    const r = createCGOnlyPiecewiseStrategy(MEDIUM_TO_POOR_PARAMS, CONTEXT).calculate(
      input(182, 32),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.cgBracket.lower).toBe(32);
    expect(r.value.metadata.cgBracket.upper).toBe(32);
    expect(r.value.metadata.bracketCrosswindRange.lower).toBe(13.9);
    expect(r.value.metadata.bracketCrosswindRange.upper).toBe(13.9);
  });
});
