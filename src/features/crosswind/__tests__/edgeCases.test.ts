/**
 * Edge-case coverage tests — exercise paths not reachable through the
 * standard test sets:
 *   • Strategy dispatch fall-through (unknown interpolation model).
 *   • Defensive NaN/Infinity guards in the algorithm input validator.
 *   • Empty-breakpoints defensive paths inside the strategy.
 *   • Runtime const arrays (AIRCRAFT_VARIANTS, etc.).
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import { createBracketedLinearStrategy } from '../domain/strategies/bracketed-linear';
import { AIRCRAFT_VARIANTS, FLIGHT_PHASES, RUNWAY_CONDITIONS, RWYCC } from '../domain/types';
import type { CGPercentMAC, WeightInTons } from '../domain/types';
import { validateAlgorithmInput } from '../domain/validators';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import bundled from '../data/b787-takeoff.json';
import { crosswindDataFileSchema } from '../data/schema';
import type { CrosswindDataFile } from '../data/schema';

const SYNTHETIC_CONTEXT = {
  aircraft: 'b787_8' as const,
  dataVersion: 'test',
  referenceDocument: 'test',
  tonsToKilolbsFactor: 2.20462,
};

const data: CrosswindDataFile = crosswindDataFileSchema.parse(bundled);

function vo(weight: number, cg: number): { readonly w: WeightInTons; readonly cg: CGPercentMAC } {
  const wRes = makeWeightInTons(weight);
  const cgRes = makeCGPercentMAC(cg);
  if (!wRes.ok || !cgRes.ok) {
    throw new Error('VO failure');
  }
  return { w: wRes.value, cg: cgRes.value };
}

describe('Calculator edge cases', () => {
  it('returns DataNotAvailable.condition-not-implemented for an unimplemented strategyType (future-PR fall-through)', () => {
    const corruptedData = JSON.parse(JSON.stringify(data)) as CrosswindDataFile;
    const aircraftEntry = corruptedData.byAircraft.b787_8;
    if (aircraftEntry === undefined) {
      throw new Error('expected b787_8 entry to exist');
    }
    const dataset = aircraftEntry.dry;
    if (dataset === undefined) {
      throw new Error('expected dry dataset');
    }
    (dataset as { strategyType: string }).strategyType = 'constant';
    const { w, cg } = vo(170, 32);
    const r = calculateCrosswindLimit(
      {
        weightTons: w,
        cgPercent: cg,
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
      },
      corruptedData,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('DataNotAvailable');
    if (r.error.kind !== 'DataNotAvailable') {
      throw new Error('expected DataNotAvailable');
    }
    expect(r.error.reason).toBe('condition-not-implemented');
  });
});

describe('Strategy edge cases — bracket labels beyond demonstrated 40 KT', () => {
  // These guard against corrupted lookup data where a bracket label
  // exceeds the 40-KT demonstrated maximum. `makeCrosswindKnots` rejects
  // values above 40, so the strategy must surface CalculationFailed
  // rather than silently returning the bogus number. Both
  // `bracketed-linear-strategy.test.ts` and `repository.test.ts` cover
  // the well-formed-but-invalid paths; this block exercises strategy
  // construction with deliberately-out-of-bounds synthetic params.

  it('CalculationFailed when computed value > 40 (bracket label 50 used as F7)', () => {
    const r = createBracketedLinearStrategy(
      {
        slope: 0.0576,
        brackets: [
          { crosswindKnots: 50, intercept: 6.1 },
          { crosswindKnots: 35, intercept: 9.3 },
          { crosswindKnots: 30, intercept: 12.8 },
          { crosswindKnots: 25, intercept: 16.3 },
          { crosswindKnots: 20, intercept: 19.8 },
        ],
        maxCap: null,
        decimals: 0,
      },
      SYNTHETIC_CONTEXT,
    ).calculate({
      weightTons: 170 as WeightInTons,
      cgPercent: 27.7 as CGPercentMAC,
      aircraft: 'b787_8',
      phase: 'takeoff',
      runwayCondition: 'dry',
    });
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });

  it('CalculationFailed when bracket-label crosswind > 40 even though value ≤ 40', () => {
    const r = createBracketedLinearStrategy(
      {
        slope: 0.0576,
        brackets: [
          { crosswindKnots: 50, intercept: 6.1 },
          { crosswindKnots: 35, intercept: 26.1 },
          { crosswindKnots: 30, intercept: 27 },
          { crosswindKnots: 25, intercept: 28 },
          { crosswindKnots: 20, intercept: 29 },
        ],
        maxCap: null,
        decimals: 0,
      },
      SYNTHETIC_CONTEXT,
    ).calculate({
      weightTons: 170 as WeightInTons,
      cgPercent: 30 as CGPercentMAC,
      aircraft: 'b787_8',
      phase: 'takeoff',
      runwayCondition: 'dry',
    });
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CalculationFailed');
  });
});

describe('Algorithm input validator defence-in-depth', () => {
  // Value Object factories reject NaN/Infinity at the boundary, so the
  // validator's checks at Step 0 are belt-and-suspenders. These tests
  // exercise them by passing branded values directly (bypassing the
  // factories' guards).
  const dataPhase = { phase: 'takeoff' as const };

  it('NaN weight → NoLookupData reason NaN', () => {
    const r = validateAlgorithmInput(
      {
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
        weightTons: Number.NaN as WeightInTons,
        cgPercent: 25 as CGPercentMAC,
      },
      dataPhase,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NoLookupData');
    if (r.error.kind !== 'NoLookupData') {
      throw new Error('expected NoLookupData');
    }
    expect(r.error.reason).toBe('NaN');
  });

  it('Infinity cg → NoLookupData reason NotFinite', () => {
    const r = validateAlgorithmInput(
      {
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
        weightTons: 170 as WeightInTons,
        cgPercent: Number.POSITIVE_INFINITY as CGPercentMAC,
      },
      dataPhase,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('NoLookupData');
    if (r.error.kind !== 'NoLookupData') {
      throw new Error('expected NoLookupData');
    }
    expect(r.error.reason).toBe('NotFinite');
  });

  it('phase mismatch → DataNotAvailable.phase-mismatch', () => {
    const r = validateAlgorithmInput(
      {
        aircraft: 'b787_8',
        phase: 'landing',
        runwayCondition: 'dry',
        weightTons: 170 as WeightInTons,
        cgPercent: 25 as CGPercentMAC,
      },
      dataPhase,
    );
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('DataNotAvailable');
    if (r.error.kind !== 'DataNotAvailable') {
      throw new Error('expected DataNotAvailable');
    }
    expect(r.error.reason).toBe('phase-mismatch');
  });
});

describe('Runtime const arrays (types.ts)', () => {
  it('exports AIRCRAFT_VARIANTS', () => {
    expect(AIRCRAFT_VARIANTS).toEqual(['b787_8', 'b787_9']);
  });

  it('exports FLIGHT_PHASES', () => {
    expect(FLIGHT_PHASES).toEqual(['takeoff', 'landing']);
  });

  it('exports RUNWAY_CONDITIONS as the 6-state RWYCC scale', () => {
    expect(RUNWAY_CONDITIONS).toEqual([
      'dry',
      'good',
      'mediumToGood',
      'medium',
      'mediumToPoor',
      'poor',
    ]);
  });

  it('RWYCC maps each runway condition to its ICAO numeric code', () => {
    expect(RWYCC).toEqual({
      dry: 6,
      good: 5,
      mediumToGood: 4,
      medium: 3,
      mediumToPoor: 2,
      poor: 1,
    });
  });
});
