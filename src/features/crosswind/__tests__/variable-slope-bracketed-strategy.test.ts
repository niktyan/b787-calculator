/**
 * Direct unit tests for `createVariableSlopeBracketedStrategy`.
 *
 * Per ADR-0017 the strategy returns the **raw** (un-rounded)
 * advisory value; ROUNDDOWN to 0.1 KT is applied at the calculator
 * boundary. Tests wrap each output with `roundDownToTenth` to assert
 * the value the calculator boundary will produce.
 *
 * Covered:
 *  • Medium-shaped params reproduce the spec anchor (W=182 / CG=20 →
 *    23.9 KT) and a representative point per branch (below-envelope,
 *    within-bracket on the /E9 path, exact-T sub-case, above-envelope).
 *  • Conditional interpolation formula: synthetic params with tight
 *    bracket spacing (E9 < 1) exercise the `·E9` branch; the Medium
 *    anchor exercises the `/E9` branch.
 *  • IFNA fallback uses `brackets[0].crosswindKnots` (not a hardcoded
 *    constant).
 *  • `maxCap: null` leaves output unclamped; `maxCap: <num>` clamps.
 *  • Empty brackets → CalculationFailed.
 */

import { roundDownToTenth } from '../domain/rounding';
import { createVariableSlopeBracketedStrategy } from '../domain/strategies/variable-slope-bracketed';
import type { VariableSlopeBracketedContext } from '../domain/strategies/variable-slope-bracketed';
import type { CalculatorInput, VariableSlopeBracketedParams } from '../domain/strategy';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { AircraftVariant, FlightPhase, RunwayCondition } from '../domain/types';

const MEDIUM_PARAMS: VariableSlopeBracketedParams = {
  brackets: [
    { crosswindKnots: 25, slope: 0.032, intercept: 5.1 },
    { crosswindKnots: 20, slope: 0.0384, intercept: 11.9 },
    { crosswindKnots: 15, slope: 0.0388, intercept: 21.8 },
    { crosswindKnots: 10, slope: 0.044, intercept: 29.8 },
  ],
  maxCap: null,
  decimals: 1,
};

const CONTEXT: VariableSlopeBracketedContext = {
  aircraft: 'b787_8',
  dataVersion: 'test',
  referenceDocument: 'Boeing 787 FCOM',
  tonsToKilolbsFactor: 2.20462,
};

const AIRCRAFT: AircraftVariant = 'b787_8';
const PHASE: FlightPhase = 'takeoff';
const RUNWAY: RunwayCondition = 'medium';

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

describe('createVariableSlopeBracketedStrategy · Medium params snapshot', () => {
  const strategy = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT);

  it('reports its discriminator', () => {
    expect(strategy.type).toBe('variableSlopeBracketed');
  });

  it('anchor (Excel-verified W=182 / CG=20 → 23.9 KT after ROUNDDOWN at boundary)', () => {
    const r = strategy.calculate(input(182, 20));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(23.9);
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });

  it('below-envelope → IFNA fallback brackets[0].crosswindKnots = 25', () => {
    const r = strategy.calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(25);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });

  it('above-envelope → same IFNA fallback (Excel-quirk preserved)', () => {
    const r = strategy.calculate(input(170, 50));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(25);
    expect(r.value.metadata.calculationStrategy).toBe('above-envelope');
  });

  it('exact-T1 sub-case at W=182 (CG = T1 = 17.93970688 → 25)', () => {
    // T1 = 0.032 × 401.24084 + 5.1 = 17.93970688 (8 decimals — 7
    // decimals would drift 2×10⁻⁸ beyond the strategy's 10⁻⁹ EPSILON
    // and miscategorize this as "above T1").
    const r = strategy.calculate(input(182, 17.93970688));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(25);
  });
});

describe('E9 conditional formula', () => {
  it('Medium params hit the /E9 branch (E9 ≈ 1.87 ≥ 1)', () => {
    // W=182 / CG=20 lands in bracket [T1=17.94, T2=27.31]. E9 = 9.37/5
    // = 1.87. raw = 25 − (20-17.94)/1.87 ≈ 23.9003.
    const r = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT).calculate(
      input(182, 20),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(23.9);
  });

  it('tightly-spaced brackets hit the ·E9 branch (E9 < 1, matches BracketedLinear)', () => {
    // Construct params where consecutive thresholds are within ~3
    // %MAC of each other (so E9 = (E8-E7)/5 < 1). Pick weight = 0 to
    // eliminate the slope contribution; thresholds collapse to
    // intercepts: [10, 12, 14] giving E9 = 2/5 = 0.4 in each bracket.
    // CG = 11 lands in bracket [10, 12]; F7 = 30, F8 = 25.
    // raw = F7 − (cg − E7) · E9 = 30 − (11 − 10) · 0.4 = 30 − 0.4 = 29.6
    // (If the strategy mistakenly used /E9 here:
    //   30 − 1/0.4 = 30 − 2.5 = 27.5 — would not match.)
    const tightParams: VariableSlopeBracketedParams = {
      brackets: [
        { crosswindKnots: 30, slope: 0, intercept: 10 },
        { crosswindKnots: 25, slope: 0, intercept: 12 },
        { crosswindKnots: 20, slope: 0, intercept: 14 },
      ],
      maxCap: null,
      decimals: 1,
    };
    const r = createVariableSlopeBracketedStrategy(tightParams, CONTEXT).calculate(input(170, 11));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(29.6);
  });
});

describe('raw output (per ADR-0017, strategy no longer rounds)', () => {
  it('returns identical raw value regardless of params.decimals', () => {
    // params.decimals is parsed by the schema but ignored at runtime.
    // Strategy outputs the same raw float for decimals=0 and decimals=1;
    // ROUNDDOWN to 0.1 KT is applied uniformly at the calculator boundary.
    const decOne = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT).calculate(
      input(182, 20),
    );
    const decZero = createVariableSlopeBracketedStrategy(
      { ...MEDIUM_PARAMS, decimals: 0 },
      CONTEXT,
    ).calculate(input(182, 20));
    if (!decZero.ok || !decOne.ok) throw new Error('expected ok');
    expect(decZero.value.maxCrosswindKnots).toBe(decOne.value.maxCrosswindKnots);
    expect(roundDownToTenth(decZero.value.maxCrosswindKnots)).toBe(23.9);
  });
});

describe('IFNA fallback derived from brackets[0]', () => {
  it('uses brackets[0].crosswindKnots (not hardcoded 40) when CG below all', () => {
    const customParams: VariableSlopeBracketedParams = {
      ...MEDIUM_PARAMS,
      brackets: [
        { crosswindKnots: 18, slope: 0.032, intercept: 5.1 },
        { crosswindKnots: 13, slope: 0.0384, intercept: 11.9 },
        { crosswindKnots: 8, slope: 0.0388, intercept: 21.8 },
        { crosswindKnots: 3, slope: 0.044, intercept: 29.8 },
      ],
    };
    const r = createVariableSlopeBracketedStrategy(customParams, CONTEXT).calculate(input(170, 8));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(18);
    expect(r.value.metadata.calculationStrategy).toBe('below-envelope');
  });
});

describe('maxCap behavior', () => {
  it('maxCap=null leaves raw output unchanged (Medium W=182/CG=20 → 23.9)', () => {
    const r = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT).calculate(
      input(182, 20),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(23.9);
  });

  it('maxCap=15 clamps a raw 23.9 result to 15', () => {
    const cappedParams: VariableSlopeBracketedParams = { ...MEDIUM_PARAMS, maxCap: 15 };
    const r = createVariableSlopeBracketedStrategy(cappedParams, CONTEXT).calculate(input(182, 20));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(15);
  });

  it('maxCap=25 leaves an already-≤cap result alone (23.9 stays 23.9)', () => {
    const cappedParams: VariableSlopeBracketedParams = { ...MEDIUM_PARAMS, maxCap: 25 };
    const r = createVariableSlopeBracketedStrategy(cappedParams, CONTEXT).calculate(input(182, 20));
    if (!r.ok) throw new Error('expected ok');
    expect(roundDownToTenth(r.value.maxCrosswindKnots)).toBe(23.9);
  });
});

describe('Defensive paths', () => {
  it('empty brackets → CalculationFailed', () => {
    const empty: VariableSlopeBracketedParams = { ...MEDIUM_PARAMS, brackets: [] };
    const r = createVariableSlopeBracketedStrategy(empty, CONTEXT).calculate(input(170, 20));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('weight × factor → Infinity yields NoLookupData (defence in depth)', () => {
    const r = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT).calculate({
      weightTons: Number.MAX_VALUE as never,
      cgPercent: 20 as never,
      aircraft: AIRCRAFT,
      phase: PHASE,
      runwayCondition: RUNWAY,
    });
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('NoLookupData');
  });
});

describe('Metadata sanity', () => {
  it('reports calculationStrategy = within-bracket on the /E9 path', () => {
    const r = createVariableSlopeBracketedStrategy(MEDIUM_PARAMS, CONTEXT).calculate(
      input(182, 20),
    );
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
    expect(r.value.metadata.bracketCrosswindRange.lower).toBe(20);
    expect(r.value.metadata.bracketCrosswindRange.upper).toBe(25);
  });
});
