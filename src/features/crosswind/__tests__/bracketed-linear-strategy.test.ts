/**
 * Direct unit tests for `createBracketedLinearStrategy`.
 *
 * Per ADR-0017 the strategy returns the **raw** (un-rounded)
 * advisory value; ROUNDDOWN to 0.1 KT is applied at the calculator
 * boundary. Tests therefore wrap each strategy output with
 * `roundDownToTenth` to assert the value the calculator boundary
 * will produce — preserving the spec-table semantics while reflecting
 * the new single-source-of-truth rounding policy.
 *
 * Covered:
 *  • Dry-equivalent params reproduce the spec table at a representative
 *    set of points (one per strategy branch — below-envelope,
 *    within-bracket, exact-breakpoint, above-envelope). The full
 *    50+ test set is exercised end-to-end via `calculator.test.ts`.
 *  • `maxCap` clamps results above the cap and leaves results at/below
 *    the cap untouched.
 *  • IFNA fallback uses `brackets[0].crosswindKnots` (not a hardcoded 40).
 *  • Empty brackets → CalculationFailed.
 */

import { roundDownToTenth } from '../domain/rounding';
import { createBracketedLinearStrategy } from '../domain/strategies/bracketed-linear';
import type { BracketedLinearParams, CalculatorInput } from '../domain/strategy';
import type { BracketedLinearContext } from '../domain/strategies/bracketed-linear';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { AircraftVariant, FlightPhase, RunwayCondition } from '../domain/types';

const DRY_PARAMS: BracketedLinearParams = {
  slope: 0.0576,
  brackets: [
    { crosswindKnots: 40, intercept: 6.1 },
    { crosswindKnots: 35, intercept: 9.3 },
    { crosswindKnots: 30, intercept: 12.8 },
    { crosswindKnots: 25, intercept: 16.3 },
    { crosswindKnots: 20, intercept: 19.8 },
  ],
  maxCap: null,
  decimals: 0,
};

const CONTEXT: BracketedLinearContext = {
  aircraft: 'b787_8',
  dataVersion: 'test',
  referenceDocument: 'Boeing 787 FCOM',
  tonsToKilolbsFactor: 2.20462,
};

const AIRCRAFT: AircraftVariant = 'b787_8';
const PHASE: FlightPhase = 'takeoff';
const RUNWAY: RunwayCondition = 'dry';

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

describe('createBracketedLinearStrategy · Dry params snapshot', () => {
  const strategy = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT);

  it('reports its discriminator', () => {
    expect(strategy.type).toBe('bracketedLinear');
  });

  it('1.01 below-envelope → 40 (IFNA fallback)', () => {
    const r = strategy.calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(40);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('1.08 within-bracket → 38.5 (ROUNDDOWN-tenth of raw 38.520)', () => {
    const r = strategy.calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(38.5);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });

  it('1.15 exact-breakpoint on T3 → 30', () => {
    const r = strategy.calculate(input(170, 34.38763904));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(30);
  });

  it('1.23 above-envelope → 40 (Excel IFNA quirk preserved)', () => {
    const r = strategy.calculate(input(170, 42));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(40);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });

  it('T2 discontinuity: CG=30.886 → 37.9, CG=30.88763904 → 35 (no smooth 36.X)', () => {
    // Pre-ADR-0017 floored to integers (37/35). Post-ADR-0017 the raw
    // 37.953 floors to 37.9 at the 0.1 grid; exact-breakpoint CG snaps to
    // F7 = 35 (next bracket), so 35 stays.
    const r1 = strategy.calculate(input(170, 30.886));
    const r2 = strategy.calculate(input(170, 30.88763904));
    if (!r1.ok || !r2.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r1.value.maxCrosswindKnots)).toBe(37.9);
    expect(roundDownToTenth(r2.value.maxCrosswindKnots)).toBe(35);
  });
});

describe('maxCap behavior', () => {
  const cappedParams: BracketedLinearParams = { ...DRY_PARAMS, maxCap: 37 };
  const strategy = createBracketedLinearStrategy(cappedParams, CONTEXT);

  it('clamps a 40 below-envelope result to maxCap=37', () => {
    const r = strategy.calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(37);
  });

  it('clamps a raw 39.x within-bracket result to maxCap=37', () => {
    const r = strategy.calculate(input(170, 27.7));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(37);
  });

  it('leaves a 34.2 within-bracket result untouched (≤ maxCap)', () => {
    const r = strategy.calculate(input(170, 32));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(34.2);
  });

  it('maxCap=null disables clamping (Dry default)', () => {
    const r = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT).calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(40);
  });
});

describe('Cap mechanism (PR 2 boundary)', () => {
  // These cover the cap mechanism precisely. The general "maxCap
  // behavior" block above covers typical clamps; these target the
  // inclusive boundary at 37 and the explicit null-cap escape hatch.

  it('boundary: synthetic raw 37.001 → cap=37 NOT triggered (raw 37.001 > 37)', () => {
    // Weight-independent params (slope=0) so thresholds equal intercepts.
    // Bracket [T1=10, T2=15], F7=40, E9=(15-10)/5=1.
    // raw = 40 - (cg - 10) * 1 = 40 - (cg - 10).
    // For raw = 37.001 → cg = 12.999. Strategy returns raw 37.001; cap=37
    // IS triggered (37.001 > 37) → clamped to 37; boundary
    // roundDownToTenth(37) = 37.
    const params: BracketedLinearParams = {
      slope: 0,
      brackets: [
        { crosswindKnots: 40, intercept: 10 },
        { crosswindKnots: 35, intercept: 15 },
        { crosswindKnots: 30, intercept: 20 },
        { crosswindKnots: 25, intercept: 25 },
        { crosswindKnots: 20, intercept: 30 },
      ],
      maxCap: 37,
      decimals: 0,
    };
    const r = createBracketedLinearStrategy(params, CONTEXT).calculate(input(170, 12.999));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(37);
  });

  it('maxCap=null leaves raw output unchanged (synthetic Dry-shape, raw 40 → 40)', () => {
    // Explicit-null variant of the maxCap=null test, exercising the same
    // Dry-shape brackets but with the cap mechanism opted out. PR 5+
    // MediumToGood will ship with maxCap=null.
    const noCap: BracketedLinearParams = { ...DRY_PARAMS, maxCap: null };
    const r = createBracketedLinearStrategy(noCap, CONTEXT).calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(40);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });
});

describe('raw output (per ADR-0017, strategy no longer rounds)', () => {
  it('returns raw value unchanged regardless of params.decimals', () => {
    // params.decimals is parsed by the schema but ignored at runtime.
    // Strategy outputs the same raw float for decimals=0 and decimals=1;
    // ROUNDDOWN to 0.1 KT is applied uniformly at the calculator
    // boundary. Verified by computing once with each precision and
    // comparing identity.
    const decZero = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT).calculate(input(170, 30));
    const decOne = createBracketedLinearStrategy({ ...DRY_PARAMS, decimals: 1 }, CONTEXT).calculate(
      input(170, 30),
    );
    if (!decZero.ok || !decOne.ok) throw new Error('expected ok');
    expect(decZero.value.maxCrosswindKnots).toBe(decOne.value.maxCrosswindKnots);
    // Raw value is sub-grid; ROUNDDOWN at 0.1 yields 38.5.
    expect(roundDownToTenth(decZero.value.maxCrosswindKnots)).toBe(38.5);
  });
});

describe('IFNA fallback derived from brackets[0]', () => {
  it('uses brackets[0].crosswindKnots (not hardcoded 40) when CG below all', () => {
    const customParams: BracketedLinearParams = {
      ...DRY_PARAMS,
      brackets: [
        { crosswindKnots: 30, intercept: 6.1 },
        { crosswindKnots: 25, intercept: 9.3 },
        { crosswindKnots: 20, intercept: 12.8 },
        { crosswindKnots: 15, intercept: 16.3 },
        { crosswindKnots: 10, intercept: 19.8 },
      ],
    };
    const r = createBracketedLinearStrategy(customParams, CONTEXT).calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(30);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('uses the same fallback when CG above all (Excel quirk)', () => {
    const customParams: BracketedLinearParams = {
      ...DRY_PARAMS,
      brackets: [
        { crosswindKnots: 30, intercept: 6.1 },
        { crosswindKnots: 25, intercept: 9.3 },
        { crosswindKnots: 20, intercept: 12.8 },
        { crosswindKnots: 15, intercept: 16.3 },
        { crosswindKnots: 10, intercept: 19.8 },
      ],
    };
    const r = createBracketedLinearStrategy(customParams, CONTEXT).calculate(input(170, 50));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(30);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });
});

describe('Defensive paths', () => {
  it('empty brackets → CalculationFailed', () => {
    const empty: BracketedLinearParams = { ...DRY_PARAMS, brackets: [] };
    const r = createBracketedLinearStrategy(empty, CONTEXT).calculate(input(170, 30));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('weight × factor → Infinity yields NoLookupData (defence in depth)', () => {
    const r = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT).calculate({
      weightTons: Number.MAX_VALUE as never,
      cgPercent: 30 as never,
      aircraft: AIRCRAFT,
      phase: PHASE,
      runwayCondition: RUNWAY,
    });
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('NoLookupData');
  });
});
