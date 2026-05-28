/**
 * Integration smoke test for the uniform-ROUNDDOWN-tenth policy
 * (ADR-0017).
 *
 * For every (aircraft × runway-condition) combination shipped in the
 * bundled JSON, we drive the calculator with representative inputs
 * (below-envelope, within-bracket × 3, exact-T, plateau, decreasing)
 * and assert the module-wide invariant:
 *
 *     result === Math.floor(result * 10) / 10
 *
 * i.e., every successful calculator output lies exactly on the 0.1
 * grid. This covers all four active strategies (bracketedLinear,
 * variableSlopeBracketed, cgOnlyPiecewise, constant) without
 * hard-coding per-condition expected values.
 *
 * The 7 curator-verified anchor cases are pinned alongside the
 * invariant to lock in the exact ROUNDDOWN-tenth values.
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import { roundDownToTenth } from '../domain/rounding';
import type { AircraftVariant, CGPercentMAC, RunwayCondition, WeightInTons } from '../domain/types';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import bundledData from '../data/b787-takeoff.json';
import { crosswindDataFileSchema } from '../data/schema';
import type { CrosswindDataFile } from '../data/schema';

const data: CrosswindDataFile = crosswindDataFileSchema.parse(bundledData);

function vo(weight: number, cg: number): { readonly w: WeightInTons; readonly cg: CGPercentMAC } {
  const w = makeWeightInTons(weight);
  const c = makeCGPercentMAC(cg);
  if (!w.ok || !c.ok) {
    throw new Error('VO failure');
  }
  return { w: w.value, cg: c.value };
}

const CONDITIONS: readonly RunwayCondition[] = [
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
];

const AIRCRAFT: readonly AircraftVariant[] = ['b787_8', 'b787_9'];

// Inputs chosen to land in operationally-plausible positions for both
// aircraft envelopes — kept inside the shared [110, 250] t weight
// range and [10, 36] %MAC CG range so every combination produces a
// successful result.
const SMOKE_INPUTS: readonly { readonly weight: number; readonly cg: number }[] = [
  { weight: 130, cg: 12 }, // light, low CG (below or near T1)
  { weight: 150, cg: 22 }, // mid, low-mid CG
  { weight: 170, cg: 27 }, // mid-heavy, mid CG
  { weight: 180, cg: 30 }, // heavy, CG = MtP plateau boundary
  { weight: 200, cg: 33 }, // heavier, CG in MtP decreasing branch
  { weight: 220, cg: 35 }, // very heavy, high CG
];

describe('Rounding invariant · result === Math.floor(result × 10) / 10', () => {
  for (const aircraft of AIRCRAFT) {
    for (const condition of CONDITIONS) {
      for (const { weight, cg } of SMOKE_INPUTS) {
        it(`${aircraft} · ${condition} · W=${weight} t · CG=${cg} %MAC → 0.1-grid`, () => {
          const { w, cg: c } = vo(weight, cg);
          const r = calculateCrosswindLimit(
            {
              weightTons: w,
              cgPercent: c,
              aircraft,
              phase: 'takeoff',
              runwayCondition: condition,
            },
            data,
          );
          // Some combinations may legitimately error (e.g. extreme CG
          // driving cgOnlyPiecewise raw negative); we only assert the
          // invariant for successful results — failure paths are
          // covered by other test suites.
          if (!r.ok) {
            return;
          }
          const value = r.value.maxCrosswindKnots as unknown as number;
          expect(value).toBe(roundDownToTenth(value));
        });
      }
    }
  }
});

describe('ADR-0017 curator-verified anchors (post-rounding)', () => {
  // Pinned values from the curator's xlsm cross-check (B787-8 (1).xlsm
  // / B787-9 (1).xlsm). Re-deriving these in the test suite asserts
  // both the boundary rounding policy AND the underlying slope/
  // intercept coefficients remain in spec.
  const ANCHORS: readonly {
    readonly label: string;
    readonly aircraft: AircraftVariant;
    readonly condition: RunwayCondition;
    readonly weight: number;
    readonly cg: number;
    readonly expected: number;
  }[] = [
    {
      label: 'B787-9 / Dry / W=140 / CG=30',
      aircraft: 'b787_9',
      condition: 'dry',
      weight: 140,
      cg: 30,
      expected: 34.7,
    },
    {
      label: 'B787-9 / MediumToGood / W=205 / CG=26',
      aircraft: 'b787_9',
      condition: 'mediumToGood',
      weight: 205,
      cg: 26,
      expected: 30.5,
    },
    {
      label: 'B787-9 / Good / W=140 / CG=30',
      aircraft: 'b787_9',
      condition: 'good',
      weight: 140,
      cg: 30,
      expected: 28.9,
    },
    {
      label: 'B787-8 / MediumToPoor / CG=32',
      aircraft: 'b787_8',
      condition: 'mediumToPoor',
      weight: 170,
      cg: 32,
      expected: 13.9,
    },
    {
      label: 'B787-9 / MediumToPoor / CG=33.75',
      aircraft: 'b787_9',
      condition: 'mediumToPoor',
      weight: 200,
      cg: 33.75,
      expected: 12.5,
    },
    {
      label: 'B787-8 / Poor (any in-envelope input)',
      aircraft: 'b787_8',
      condition: 'poor',
      weight: 170,
      cg: 25,
      expected: 10,
    },
    {
      label: 'B787-9 / Poor (any in-envelope input)',
      aircraft: 'b787_9',
      condition: 'poor',
      weight: 200,
      cg: 28,
      expected: 10,
    },
  ];

  it.each(ANCHORS)('$label → $expected KT', ({ aircraft, condition, weight, cg, expected }) => {
    const { w, cg: c } = vo(weight, cg);
    const r = calculateCrosswindLimit(
      {
        weightTons: w,
        cgPercent: c,
        aircraft,
        phase: 'takeoff',
        runwayCondition: condition,
      },
      data,
    );
    if (!r.ok) {
      throw new Error(`anchor unexpectedly errored: ${JSON.stringify(r.error)}`);
    }
    expect(r.value.maxCrosswindKnots).toBe(expected);
  });
});
