/**
 * B787-9 acceptance anchors (Sprint B).
 *
 * Pins 18 (condition × weight × CG → expected KT) anchor values for
 * the second aircraft variant. The expected values were computed by a
 * Python mirror of each strategy and verified against the Excel-pinned
 * subset that ships in the source spreadsheets.
 *
 * Bonus: a B787-8 regression sanity-check confirms the per-aircraft
 * envelope migration (ADR-0013) did not move existing B787-8 anchor
 * behaviour.
 *
 * Spec:
 *  - 02_Specification/ADR/0013-per-aircraft-operational-envelope.md
 *  - 02_Specification/module-contracts/crosswind.md § "Public API"
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import type { RunwayCondition } from '../domain/types';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import { createCrosswindRepository } from '../data/crosswindRepository';

interface AnchorCase {
  readonly condition: RunwayCondition;
  readonly weightTons: number;
  readonly cgPercent: number;
  readonly expectedKT: number;
}

const B787_9_ANCHORS: readonly AnchorCase[] = [
  // Dry — variableSlopeBracketed, maxCap=37
  { condition: 'dry', weightTons: 170, cgPercent: 31, expectedKT: 37 },
  { condition: 'dry', weightTons: 170, cgPercent: 34, expectedKT: 34 },
  { condition: 'dry', weightTons: 240, cgPercent: 38, expectedKT: 37 },
  { condition: 'dry', weightTons: 170, cgPercent: 25, expectedKT: 37 },
  // Good — variableSlopeBracketed, maxCap=37
  { condition: 'good', weightTons: 180, cgPercent: 18, expectedKT: 37 },
  { condition: 'good', weightTons: 180, cgPercent: 24, expectedKT: 37 },
  { condition: 'good', weightTons: 230, cgPercent: 36, expectedKT: 33.4 },
  // MediumToGood — variableSlopeBracketed, maxCap=null
  { condition: 'mediumToGood', weightTons: 180, cgPercent: 14, expectedKT: 35 },
  { condition: 'mediumToGood', weightTons: 180, cgPercent: 25, expectedKT: 29.4 },
  { condition: 'mediumToGood', weightTons: 220, cgPercent: 35, expectedKT: 22.6 },
  // Medium — variableSlopeBracketed, maxCap=null, decimals=1
  { condition: 'medium', weightTons: 180, cgPercent: 14, expectedKT: 25 },
  { condition: 'medium', weightTons: 180, cgPercent: 26, expectedKT: 20.9 },
  { condition: 'medium', weightTons: 220, cgPercent: 33, expectedKT: 18.5 },
  // MediumToPoor — cgOnlyPiecewise, decimals=1
  { condition: 'mediumToPoor', weightTons: 200, cgPercent: 25, expectedKT: 15.0 },
  { condition: 'mediumToPoor', weightTons: 200, cgPercent: 30, expectedKT: 15.0 },
  { condition: 'mediumToPoor', weightTons: 200, cgPercent: 33, expectedKT: 13.0 },
  { condition: 'mediumToPoor', weightTons: 200, cgPercent: 37, expectedKT: 10.3 },
  // Poor — constant
  { condition: 'poor', weightTons: 200, cgPercent: 28, expectedKT: 10 },
];

const ANCHOR_NUMERIC_TOLERANCE = 1;

describe('B787-9 acceptance anchors', () => {
  const repo = createCrosswindRepository();
  const loaded = repo.load();
  if (!loaded.ok) {
    throw new Error(`unexpected repo error: ${loaded.error.details}`);
  }
  const data = loaded.value;

  it.each(B787_9_ANCHORS)(
    '$condition · w=$weightTons t · cg=$cgPercent %MAC → $expectedKT KT',
    ({ condition, weightTons, cgPercent, expectedKT }) => {
      const w = makeWeightInTons(weightTons);
      const cg = makeCGPercentMAC(cgPercent);
      if (!w.ok || !cg.ok) {
        throw new Error('expected VOs');
      }
      const result = calculateCrosswindLimit(
        {
          aircraft: 'b787_9',
          phase: 'takeoff',
          runwayCondition: condition,
          weightTons: w.value,
          cgPercent: cg.value,
        },
        data,
      );
      if (!result.ok) {
        throw new Error(`unexpected error: ${JSON.stringify(result.error)}`);
      }
      expect(result.value.maxCrosswindKnots).toBeCloseTo(expectedKT, ANCHOR_NUMERIC_TOLERANCE);
      expect(result.value.metadata.aircraft).toBe('b787_9');
    },
  );
});

describe('B787-8 regression — post-migration anchors still hold', () => {
  const repo = createCrosswindRepository();
  const loaded = repo.load();
  if (!loaded.ok) {
    throw new Error(`unexpected repo error: ${loaded.error.details}`);
  }
  const data = loaded.value;

  it('flagship Dry anchor W=170 / CG=32 → 34.2 KT (ADR-0017: ROUNDDOWN at 0.1)', () => {
    const w = makeWeightInTons(170);
    const cg = makeCGPercentMAC(32);
    if (!w.ok || !cg.ok) {
      throw new Error('expected VOs');
    }
    const result = calculateCrosswindLimit(
      {
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
        weightTons: w.value,
        cgPercent: cg.value,
      },
      data,
    );
    if (!result.ok) {
      throw new Error('expected ok');
    }
    expect(result.value.maxCrosswindKnots).toBe(34.2);
    expect(result.value.metadata.aircraft).toBe('b787_8');
  });

  it('B787-8 envelope retained: weight bounds [104.1, 227.93], CG bounds [6, 39.5]', () => {
    const envelope = data.byAircraft.b787_8?.operationalEnvelope;
    if (envelope === undefined) {
      throw new Error('expected b787_8 envelope');
    }
    expect(envelope.weight.minTons).toBe(104.1);
    expect(envelope.weight.maxTons).toBe(227.93);
    expect(envelope.cg.minPercent).toBe(6);
    expect(envelope.cg.maxPercent).toBe(39.5);
  });

  it('B787-9 envelope present: weight bounds [110.677, 259.228], CG bounds [8, 37.5]', () => {
    const envelope = data.byAircraft.b787_9?.operationalEnvelope;
    if (envelope === undefined) {
      throw new Error('expected b787_9 envelope');
    }
    expect(envelope.weight.minTons).toBe(110.677);
    expect(envelope.weight.maxTons).toBe(259.228);
    expect(envelope.cg.minPercent).toBe(8);
    expect(envelope.cg.maxPercent).toBe(37.5);
  });
});
