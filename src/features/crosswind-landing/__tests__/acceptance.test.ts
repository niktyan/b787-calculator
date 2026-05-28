/**
 * Acceptance tests for the Crosswind Landing module.
 *
 * Two test families:
 *
 *   1. **28 anchor base lookups** — 7 conditions × 2 aircraft × 2 modes.
 *      These are the canonical AFM Rev. 20 / Landing (2).xlsx values
 *      transcribed in ADR-0018. Every cell of the bundled `baseTable`
 *      is verified directly with a no-adjustment input (manual + no
 *      asym for the manual cells; auto + no cat / asym / inop for the
 *      auto cells).
 *
 *   2. **Adjustment matrix** — a smaller set of FCOM CAUTION
 *      combinations (CAT cap, asymmetric reverse penalty, ONE ENG INOP
 *      cap, and their stacks) that exercise the algorithm rather than
 *      the table.
 */

import { calculateLandingCrosswind } from '../domain/calculator';
import { createCrosswindLandingRepository } from '../data/landingRepository';
import type { CrosswindLandingInput } from '../domain/types';

interface BaseAnchor {
  readonly aircraft: CrosswindLandingInput['aircraft'];
  readonly runwayCondition: CrosswindLandingInput['runwayCondition'];
  readonly landingMode: CrosswindLandingInput['landingMode'];
  readonly expected: number;
}

/**
 * 28 base-lookup anchors per ADR-0018 § "Per-aircraft × per-mode
 * crosswind values". `asymReverse`, `catIIIII` and `engineInop` are all
 * `no`, so the calculator returns the raw `baseTable[condition][mode]`
 * value with no adjustment.
 */
const BASE_ANCHORS: readonly BaseAnchor[] = [
  // B787-8 MANUAL
  { aircraft: 'b787_8', runwayCondition: 'dry', landingMode: 'manual', expected: 37 },
  { aircraft: 'b787_8', runwayCondition: 'goodWetDamp', landingMode: 'manual', expected: 37 },
  { aircraft: 'b787_8', runwayCondition: 'goodSlushSnow', landingMode: 'manual', expected: 35 },
  { aircraft: 'b787_8', runwayCondition: 'goodToMedium', landingMode: 'manual', expected: 35 },
  { aircraft: 'b787_8', runwayCondition: 'medium', landingMode: 'manual', expected: 35 },
  { aircraft: 'b787_8', runwayCondition: 'mediumToPoor', landingMode: 'manual', expected: 20 },
  { aircraft: 'b787_8', runwayCondition: 'poor', landingMode: 'manual', expected: 17 },
  // B787-8 AUTO
  { aircraft: 'b787_8', runwayCondition: 'dry', landingMode: 'auto', expected: 33 },
  { aircraft: 'b787_8', runwayCondition: 'goodWetDamp', landingMode: 'auto', expected: 33 },
  { aircraft: 'b787_8', runwayCondition: 'goodSlushSnow', landingMode: 'auto', expected: 33 },
  { aircraft: 'b787_8', runwayCondition: 'goodToMedium', landingMode: 'auto', expected: 33 },
  { aircraft: 'b787_8', runwayCondition: 'medium', landingMode: 'auto', expected: 33 },
  { aircraft: 'b787_8', runwayCondition: 'mediumToPoor', landingMode: 'auto', expected: 20 },
  { aircraft: 'b787_8', runwayCondition: 'poor', landingMode: 'auto', expected: 17 },
  // B787-9 MANUAL
  { aircraft: 'b787_9', runwayCondition: 'dry', landingMode: 'manual', expected: 37 },
  { aircraft: 'b787_9', runwayCondition: 'goodWetDamp', landingMode: 'manual', expected: 37 },
  { aircraft: 'b787_9', runwayCondition: 'goodSlushSnow', landingMode: 'manual', expected: 35 },
  { aircraft: 'b787_9', runwayCondition: 'goodToMedium', landingMode: 'manual', expected: 35 },
  { aircraft: 'b787_9', runwayCondition: 'medium', landingMode: 'manual', expected: 25 },
  { aircraft: 'b787_9', runwayCondition: 'mediumToPoor', landingMode: 'manual', expected: 17 },
  { aircraft: 'b787_9', runwayCondition: 'poor', landingMode: 'manual', expected: 15 },
  // B787-9 AUTO
  { aircraft: 'b787_9', runwayCondition: 'dry', landingMode: 'auto', expected: 28 },
  { aircraft: 'b787_9', runwayCondition: 'goodWetDamp', landingMode: 'auto', expected: 28 },
  { aircraft: 'b787_9', runwayCondition: 'goodSlushSnow', landingMode: 'auto', expected: 28 },
  { aircraft: 'b787_9', runwayCondition: 'goodToMedium', landingMode: 'auto', expected: 28 },
  { aircraft: 'b787_9', runwayCondition: 'medium', landingMode: 'auto', expected: 25 },
  { aircraft: 'b787_9', runwayCondition: 'mediumToPoor', landingMode: 'auto', expected: 17 },
  { aircraft: 'b787_9', runwayCondition: 'poor', landingMode: 'auto', expected: 15 },
];

interface AdjustmentAnchor {
  readonly aircraft: CrosswindLandingInput['aircraft'];
  readonly runwayCondition: CrosswindLandingInput['runwayCondition'];
  readonly landingMode: CrosswindLandingInput['landingMode'];
  readonly asymReverse: CrosswindLandingInput['asymReverse'];
  readonly catIIIII: CrosswindLandingInput['catIIIII'];
  readonly engineInop: CrosswindLandingInput['engineInop'];
  readonly expected: number;
  readonly comment: string;
}

const ADJUSTMENT_ANCHORS: readonly AdjustmentAnchor[] = [
  // Manual mode — CAT and INOP are irrelevant.
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 37,
    comment: 'Dry exempt from asym penalty',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'goodSlushSnow',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 30,
    comment: 'Manual + asym non-dry: 35 - 5',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'poor',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 12,
    comment: 'Manual poor + asym: 17 - 5',
  },
  // Auto mode — single adjustments.
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'yes',
    engineInop: 'no',
    expected: 25,
    comment: 'CAT cap 33 -> 25',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'goodWetDamp',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 28,
    comment: 'Wet/Damp asym non-dry: 33 - 5',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'yes',
    expected: 28,
    comment: 'B787-8 INOP cap 33 -> 28',
  },
  // Auto mode — stacked adjustments.
  {
    aircraft: 'b787_8',
    runwayCondition: 'goodSlushSnow',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'no',
    expected: 20,
    comment: 'Slush CAT 33 -> 25, asym 25 -> 20',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'goodToMedium',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'yes',
    expected: 20,
    comment: 'GtM CAT->25, asym->20, INOP 28>20 inactive',
  },
  // B787-9 cases.
  {
    aircraft: 'b787_9',
    runwayCondition: 'medium',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 20,
    comment: 'B787-9 medium asym 25 -> 20',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'goodWetDamp',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'yes',
    expected: 20,
    comment: 'B787-9 base 28 -> CAT 25 -> asym 20 -> INOP 37>20 inactive',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'poor',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'yes',
    engineInop: 'no',
    expected: 15,
    comment: 'CAT cap inactive (15<25)',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'poor',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 10,
    comment: 'B787-9 poor manual + asym: 15 - 5',
  },
];

describe('Crosswind Landing · base anchors (7 conditions × 2 aircraft × 2 modes = 28)', () => {
  const repo = createCrosswindLandingRepository();
  const loaded = repo.load();
  if (!loaded.ok) {
    throw new Error(`bundled landing JSON failed to load: ${loaded.error.details}`);
  }
  const data = loaded.value;

  it.each(BASE_ANCHORS)('$aircraft / $runwayCondition / $landingMode → $expected KT', (anchor) => {
    const input: CrosswindLandingInput = {
      aircraft: anchor.aircraft,
      runwayCondition: anchor.runwayCondition,
      landingMode: anchor.landingMode,
      asymReverse: 'no',
      catIIIII: 'no',
      engineInop: 'no',
    };
    const result = calculateLandingCrosswind(input, data);
    if (!result.ok) {
      throw new Error(`unexpected error: ${JSON.stringify(result.error)}`);
    }
    expect(result.value.maxCrosswindKnots).toBe(anchor.expected);
    expect(result.value.metadata.aircraft).toBe(anchor.aircraft);
    expect(result.value.metadata.landingMode).toBe(anchor.landingMode);
    expect(result.value.metadata.dataVersion).toBe(data.dataVersion);
  });
});

describe('Crosswind Landing · adjustment anchors (CAT cap, asym penalty, INOP cap)', () => {
  const repo = createCrosswindLandingRepository();
  const loaded = repo.load();
  if (!loaded.ok) {
    throw new Error(`bundled landing JSON failed to load: ${loaded.error.details}`);
  }
  const data = loaded.value;

  it.each(ADJUSTMENT_ANCHORS)(
    '$aircraft / $runwayCondition / $landingMode (asym=$asymReverse cat=$catIIIII inop=$engineInop) → $expected KT — $comment',
    (anchor) => {
      const input: CrosswindLandingInput = {
        aircraft: anchor.aircraft,
        runwayCondition: anchor.runwayCondition,
        landingMode: anchor.landingMode,
        asymReverse: anchor.asymReverse,
        catIIIII: anchor.catIIIII,
        engineInop: anchor.engineInop,
      };
      const result = calculateLandingCrosswind(input, data);
      if (!result.ok) {
        throw new Error(`unexpected error: ${JSON.stringify(result.error)}`);
      }
      expect(result.value.maxCrosswindKnots).toBe(anchor.expected);
    },
  );
});
