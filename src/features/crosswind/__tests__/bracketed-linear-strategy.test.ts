/**
 * Direct unit tests for `createBracketedLinearStrategy`.
 *
 * These cover behavior of the strategy as a standalone unit:
 *  • Dry-equivalent params reproduce the spec table at a representative
 *    set of points (one per strategy branch — below-envelope,
 *    within-bracket, exact-breakpoint, above-envelope). The full
 *    50+ test set is exercised end-to-end via `calculator.test.ts`.
 *  • `maxCap` clamps results above the cap and leaves results at/below
 *    the cap untouched.
 *  • `decimals = 1` keeps one fractional digit, ROUNDDOWN style.
 *  • IFNA fallback uses `brackets[0].crosswindKnots` (not a hardcoded 40).
 *  • Empty brackets → CalculationFailed.
 */

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

  it('1.08 within-bracket → 38 (ROUNDDOWN of 38.520)', () => {
    const r = strategy.calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(38);
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

  it('T2 discontinuity: CG=30.886 → 37, CG=30.88763904 → 35 (no smooth 36)', () => {
    const r1 = strategy.calculate(input(170, 30.886));
    const r2 = strategy.calculate(input(170, 30.88763904));
    if (!r1.ok || !r2.ok) throw new Error('expected ok');
    expect(r1.value.maxCrosswindKnots).toBe(37);
    expect(r2.value.maxCrosswindKnots).toBe(35);
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

  it('clamps a 39 within-bracket result to maxCap=37', () => {
    const r = strategy.calculate(input(170, 27.7));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(37);
  });

  it('leaves a 34 within-bracket result untouched (≤ maxCap)', () => {
    const r = strategy.calculate(input(170, 32));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(34);
  });

  it('maxCap=null disables clamping (Dry default)', () => {
    const r = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT).calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(40);
  });
});

describe('decimals (ROUNDDOWN precision)', () => {
  it('decimals=0 floors to integer (W=170, CG=30 → 38, raw ≈ 38.520)', () => {
    const r = createBracketedLinearStrategy(DRY_PARAMS, CONTEXT).calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(38);
  });

  it('decimals=1 floors to one decimal (W=170, CG=30 → 38.5, raw ≈ 38.520)', () => {
    const params: BracketedLinearParams = { ...DRY_PARAMS, decimals: 1 };
    const r = createBracketedLinearStrategy(params, CONTEXT).calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.maxCrosswindKnots).toBe(38.5);
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
