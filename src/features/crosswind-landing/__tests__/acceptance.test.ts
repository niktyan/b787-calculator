/**
 * Acceptance tests for the Crosswind Landing module.
 *
 * 18 anchors covering manual mode, single-adjustment auto mode, stacked-
 * adjustment auto mode, both aircraft variants, and edge cases. The
 * matrix below is the canonical spec — any future change to the FCOM
 * table or the adjustment formulas must update these numbers AND the
 * bundled JSON together.
 */

import { calculateLandingCrosswind } from '../domain/calculator';
import { createCrosswindLandingRepository } from '../data/landingRepository';
import type { CrosswindLandingInput } from '../domain/types';

interface Anchor {
  readonly aircraft: CrosswindLandingInput['aircraft'];
  readonly runwayCondition: CrosswindLandingInput['runwayCondition'];
  readonly landingMode: CrosswindLandingInput['landingMode'];
  readonly asymReverse: CrosswindLandingInput['asymReverse'];
  readonly catIIIII: CrosswindLandingInput['catIIIII'];
  readonly engineInop: CrosswindLandingInput['engineInop'];
  readonly expected: number;
  readonly comment: string;
}

const LANDING_ANCHORS: readonly Anchor[] = [
  // Manual mode — CAT and INOP are irrelevant.
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'manual',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 37,
    comment: 'Manual base lookup',
  },
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
    runwayCondition: 'good',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 30,
    comment: 'Manual + asym non-dry: -5',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'poor',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 12,
    comment: 'Manual poor + asym: 17-5',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'mediumToPoor',
    landingMode: 'manual',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 17,
    comment: 'B787-9 manual base',
  },
  // Auto mode — single adjustments.
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 33,
    comment: 'Auto base only',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'yes',
    engineInop: 'no',
    expected: 25,
    comment: 'CAT cap 33->25',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'good',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 28,
    comment: 'Asym non-dry: 33-5',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'yes',
    expected: 28,
    comment: 'B787-8 INOP cap 33->28',
  },
  // Auto mode — stacked adjustments.
  {
    aircraft: 'b787_8',
    runwayCondition: 'good',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'no',
    expected: 20,
    comment: 'CAT 33->25, asym 25->20',
  },
  {
    aircraft: 'b787_8',
    runwayCondition: 'good',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'yes',
    expected: 20,
    comment: 'CAT->25, asym->20, INOP 28>20 inactive',
  },
  // B787-9 cases.
  {
    aircraft: 'b787_9',
    runwayCondition: 'medium',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 25,
    comment: 'B787-9 medium auto',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'medium',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 20,
    comment: 'B787-9 medium asym 25->20',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'dry',
    landingMode: 'auto',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'yes',
    expected: 28,
    comment: 'B787-9 INOP cap 37>28 inactive, base stays',
  },
  {
    aircraft: 'b787_9',
    runwayCondition: 'good',
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
    runwayCondition: 'medium',
    landingMode: 'auto',
    asymReverse: 'yes',
    catIIIII: 'yes',
    engineInop: 'yes',
    expected: 20,
    comment: 'B787-9 medium 25 -> CAT inactive -> asym 20 -> INOP inactive',
  },
  // Edge: poor + manual.
  {
    aircraft: 'b787_9',
    runwayCondition: 'poor',
    landingMode: 'manual',
    asymReverse: 'yes',
    catIIIII: 'no',
    engineInop: 'no',
    expected: 10,
    comment: 'B787-9 poor manual + asym: 15-5',
  },
];

describe('Crosswind Landing · acceptance anchors (18 cases)', () => {
  const repo = createCrosswindLandingRepository();
  const loaded = repo.load();
  if (!loaded.ok) {
    throw new Error(`bundled landing JSON failed to load: ${loaded.error.details}`);
  }
  const data = loaded.value;

  it.each(LANDING_ANCHORS)(
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
      expect(result.value.metadata.aircraft).toBe(anchor.aircraft);
      expect(result.value.metadata.landingMode).toBe(anchor.landingMode);
      expect(result.value.metadata.dataVersion).toBe(data.dataVersion);
    },
  );
});
