/**
 * Direct unit tests for `createConstantStrategy`.
 *
 * Covers:
 *  • Returns `params.value` regardless of input. Asserted via a
 *    3×3 weight×CG matrix (9 combos, all → same value).
 *  • Discriminator reporting.
 *  • Multiple synthetic param instances (value=5/10/15) each
 *    return their own value.
 *  • Metadata sanity (single-point ranges; calculationStrategy
 *    reuses 'within-bracket' per PR 6 convention).
 *  • Defensive: invalid value (e.g., negative, > demonstrated)
 *    surfaces as `CalculationFailed` via `makeCrosswindKnots`.
 */

import { createConstantStrategy } from '../domain/strategies/constant';
import type { ConstantContext } from '../domain/strategies/constant';
import type { CalculatorInput, ConstantParams } from '../domain/strategy';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { AircraftVariant, FlightPhase, RunwayCondition } from '../domain/types';

const POOR_PARAMS: ConstantParams = { value: 10 };

const CONTEXT: ConstantContext = {
  aircraft: 'b787_8',
  dataVersion: 'test',
  referenceDocument: 'Boeing 787 FCOM',
};

const AIRCRAFT: AircraftVariant = 'b787_8';
const PHASE: FlightPhase = 'takeoff';
const RUNWAY: RunwayCondition = 'poor';

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

describe('createConstantStrategy · Poor params snapshot', () => {
  const strategy = createConstantStrategy(POOR_PARAMS, CONTEXT);

  it('reports its discriminator', () => {
    expect(strategy.type).toBe('constant');
  });

  it('input-independence: 3×3 W×CG matrix all return value=10', () => {
    const weights = [110, 170, 200];
    const cgs = [10, 30, 50];
    const outputs: number[] = [];
    for (const w of weights) {
      for (const cg of cgs) {
        const r = strategy.calculate(input(w, cg));
        if (!r.ok) {
          throw new Error(`unexpected error at W=${w}/CG=${cg}: ${JSON.stringify(r.error)}`);
        }
        outputs.push(r.value.maxCrosswindKnots);
      }
    }
    // All 9 outputs equal 10 — no input drives variation.
    expect(outputs).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10]);
  });

  it('metadata.calculationStrategy = within-bracket (PR 6 enum-stretch convention)', () => {
    const r = strategy.calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.calculationStrategy).toBe('within-bracket');
  });

  it('metadata cgBracket and bracketCrosswindRange collapse to single-point ranges', () => {
    const r = strategy.calculate(input(170, 30));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.metadata.cgBracket.lower).toBe(30);
    expect(r.value.metadata.cgBracket.upper).toBe(30);
    expect(r.value.metadata.bracketCrosswindRange.lower).toBe(10);
    expect(r.value.metadata.bracketCrosswindRange.upper).toBe(10);
  });
});

describe('createConstantStrategy · synthetic value variations', () => {
  it.each([5, 10, 15, 20])(
    'value=%i returns %i regardless of input (sampled at W=170, CG=30)',
    (value) => {
      const strategy = createConstantStrategy({ value }, CONTEXT);
      const r = strategy.calculate(input(170, 30));
      if (!r.ok) throw new Error('expected ok');
      expect(r.value.maxCrosswindKnots).toBe(value);
    },
  );
});

describe('createConstantStrategy · defensive paths', () => {
  it('negative value → CalculationFailed (CrosswindKnots rejects negative)', () => {
    const strategy = createConstantStrategy({ value: -1 }, CONTEXT);
    const r = strategy.calculate(input(170, 30));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('value > 40 (Boeing demonstrated) → CalculationFailed', () => {
    // makeCrosswindKnots rejects values above DEMONSTRATED_CROSSWIND.
    const strategy = createConstantStrategy({ value: 50 }, CONTEXT);
    const r = strategy.calculate(input(170, 30));
    if (r.ok) throw new Error('expected error');
    expect(r.error.kind).toBe('CalculationFailed');
  });
});
