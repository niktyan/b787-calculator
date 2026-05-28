/**
 * Direct unit tests for the Landing calculator.
 *
 * The 18 high-level FCOM combinations live in `acceptance.test.ts`. This
 * file focuses on the algorithm's structural properties (error
 * dispatch, applied-adjustments bookkeeping, metadata shape) and on
 * defence-in-depth paths that the acceptance matrix does not exercise.
 */

import { calculateLandingCrosswind } from '../domain/calculator';
import type { CrosswindLandingInput } from '../domain/types';
import type { CrosswindLandingDataFile } from '../data/schema';

const BASE_INPUT: CrosswindLandingInput = {
  aircraft: 'b787_8',
  runwayCondition: 'dry',
  landingMode: 'manual',
  asymReverse: 'no',
  catIIIII: 'no',
  engineInop: 'no',
};

function makeData(overrides: Partial<CrosswindLandingDataFile> = {}): CrosswindLandingDataFile {
  const base: CrosswindLandingDataFile = {
    schemaVersion: '2.4.0',
    dataVersion: '2026-05-28.001',
    phase: 'landing',
    adjustments: { catIIIIICap: 25, asymReversePenalty: 5 },
    byAircraft: {
      b787_8: {
        engineInopAutolandLimit: 28,
        baseTable: {
          dry: { manual: 37, auto: 33 },
          goodWetDamp: { manual: 37, auto: 33 },
          goodSlushSnow: { manual: 35, auto: 33 },
          goodToMedium: { manual: 35, auto: 33 },
          medium: { manual: 35, auto: 33 },
          mediumToPoor: { manual: 20, auto: 20 },
          poor: { manual: 17, auto: 17 },
        },
        metadata: {
          createdAt: '2026-05-28',
          validatedBy: 'active-line-pilots',
          referenceDocument: 'Boeing 787 FCOM',
          notes: 'unit-test fixture',
        },
      },
      b787_9: {
        engineInopAutolandLimit: 37,
        baseTable: {
          dry: { manual: 37, auto: 28 },
          goodWetDamp: { manual: 37, auto: 28 },
          goodSlushSnow: { manual: 35, auto: 28 },
          goodToMedium: { manual: 35, auto: 28 },
          medium: { manual: 25, auto: 25 },
          mediumToPoor: { manual: 17, auto: 17 },
          poor: { manual: 15, auto: 15 },
        },
        metadata: {
          createdAt: '2026-05-28',
          validatedBy: 'active-line-pilots',
          referenceDocument: 'Boeing 787 FCOM',
          notes: 'unit-test fixture',
        },
      },
    },
  };
  return { ...base, ...overrides };
}

describe('calculateLandingCrosswind', () => {
  const data = makeData();

  describe('error dispatch', () => {
    it('returns DataNotAvailable.aircraft-not-implemented when the aircraft entry is missing', () => {
      // Cast away type safety on byAircraft to simulate a partial bundle.
      const partial = {
        ...data,
        byAircraft: { b787_9: data.byAircraft.b787_9 },
      } as unknown as CrosswindLandingDataFile;
      const result = calculateLandingCrosswind({ ...BASE_INPUT, aircraft: 'b787_8' }, partial);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('unreachable');
      expect(result.error.kind).toBe('DataNotAvailable');
      if (result.error.kind !== 'DataNotAvailable') throw new Error('unreachable');
      expect(result.error.reason).toBe('aircraft-not-implemented');
      expect(result.error.aircraft).toBe('b787_8');
    });

    it('returns DataNotAvailable.condition-not-implemented when the runway entry is missing', () => {
      // Strip the `poor` condition from B787-8 to drive the path.
      const stripped = {
        ...data,
        byAircraft: {
          ...data.byAircraft,
          b787_8: {
            ...data.byAircraft.b787_8,
            baseTable: {
              ...data.byAircraft.b787_8.baseTable,
              poor: undefined,
            },
          },
        },
      } as unknown as CrosswindLandingDataFile;
      const result = calculateLandingCrosswind(
        { ...BASE_INPUT, runwayCondition: 'poor' },
        stripped,
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('unreachable');
      expect(result.error.kind).toBe('DataNotAvailable');
      if (result.error.kind !== 'DataNotAvailable') throw new Error('unreachable');
      expect(result.error.reason).toBe('condition-not-implemented');
    });
  });

  describe('applied adjustments bookkeeping', () => {
    it('manual + dry + asym=yes records no applied adjustments (Dry exempt)', () => {
      const result = calculateLandingCrosswind({ ...BASE_INPUT, asymReverse: 'yes' }, data);
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.appliedAdjustments).toEqual({
        catCap: false,
        asymPenalty: false,
        inopCap: false,
      });
    });

    it('manual + good + asym=yes records asymPenalty=true only', () => {
      const result = calculateLandingCrosswind(
        { ...BASE_INPUT, runwayCondition: 'goodWetDamp', asymReverse: 'yes' },
        data,
      );
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.appliedAdjustments).toEqual({
        catCap: false,
        asymPenalty: true,
        inopCap: false,
      });
    });

    it('auto + dry + cat=yes records catCap=true only', () => {
      const result = calculateLandingCrosswind(
        { ...BASE_INPUT, landingMode: 'auto', catIIIII: 'yes' },
        data,
      );
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.appliedAdjustments).toEqual({
        catCap: true,
        asymPenalty: false,
        inopCap: false,
      });
    });

    it('auto + good + cat=yes + asym=yes records both catCap and asymPenalty', () => {
      const result = calculateLandingCrosswind(
        {
          ...BASE_INPUT,
          landingMode: 'auto',
          runwayCondition: 'goodWetDamp',
          catIIIII: 'yes',
          asymReverse: 'yes',
        },
        data,
      );
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.appliedAdjustments.catCap).toBe(true);
      expect(result.value.metadata.appliedAdjustments.asymPenalty).toBe(true);
      expect(result.value.metadata.appliedAdjustments.inopCap).toBe(false);
    });

    it('auto + dry + inop=yes (B787-8) records inopCap=true only', () => {
      const result = calculateLandingCrosswind(
        { ...BASE_INPUT, landingMode: 'auto', engineInop: 'yes' },
        data,
      );
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.appliedAdjustments).toEqual({
        catCap: false,
        asymPenalty: false,
        inopCap: true,
      });
    });

    it('auto + dry + inop=yes (B787-9) leaves inopCap inactive (37 > 28)', () => {
      const result = calculateLandingCrosswind(
        { ...BASE_INPUT, aircraft: 'b787_9', landingMode: 'auto', engineInop: 'yes' },
        data,
      );
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.maxCrosswindKnots).toBe(28);
      expect(result.value.metadata.appliedAdjustments.inopCap).toBe(false);
    });
  });

  describe('metadata shape', () => {
    it('includes dataVersion, referenceDocument, aircraft, landingMode', () => {
      const result = calculateLandingCrosswind(BASE_INPUT, data);
      if (!result.ok) throw new Error('expected ok');
      expect(result.value.metadata.dataVersion).toBe(data.dataVersion);
      expect(result.value.metadata.referenceDocument).toMatch(/Boeing 787 FCOM/);
      expect(result.value.metadata.aircraft).toBe('b787_8');
      expect(result.value.metadata.landingMode).toBe('manual');
    });
  });

  describe('purity', () => {
    it('is referentially transparent — same inputs → same output object shape', () => {
      const a = calculateLandingCrosswind(BASE_INPUT, data);
      const b = calculateLandingCrosswind(BASE_INPUT, data);
      expect(a).toEqual(b);
    });

    it('never throws — DataNotAvailable on missing aircraft AND condition routes both as Result.err', () => {
      const empty = {
        ...data,
        byAircraft: {},
      } as unknown as CrosswindLandingDataFile;
      const result = calculateLandingCrosswind(BASE_INPUT, empty);
      expect(result.ok).toBe(false);
    });
  });
});
