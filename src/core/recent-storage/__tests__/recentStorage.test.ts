import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  RECENT_MAX_ENTRIES,
  RECENT_SCHEMA_VERSION,
  RECENT_STORAGE_KEY,
  clearRecent,
  computeFingerprint,
  findRecentById,
  loadRecent,
  removeRecent,
  saveRecent,
} from '../index';
import type {
  PreparedLandingEntry,
  PreparedTakeoffEntry,
  RecentLandingInputs,
  RecentTakeoffInputs,
} from '../index';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TAKEOFF_INPUTS: RecentTakeoffInputs = {
  aircraft: 'b787_8',
  weightTons: 170,
  cgPercent: 32,
  runwayCondition: 'dry',
};

const LANDING_INPUTS: RecentLandingInputs = {
  aircraft: 'b787_8',
  runwayCondition: 'dry',
  landingMode: 'manual',
  asymReverse: 'no',
  catIIIII: 'no',
  engineInop: 'no',
};

function makeTakeoffPrep(overrides: Partial<RecentTakeoffInputs> = {}): PreparedTakeoffEntry {
  return {
    module: 'takeoff',
    inputs: { ...TAKEOFF_INPUTS, ...overrides },
    result: 34,
  };
}

function makeLandingPrep(overrides: Partial<RecentLandingInputs> = {}): PreparedLandingEntry {
  return {
    module: 'landing',
    inputs: { ...LANDING_INPUTS, ...overrides },
    result: 25,
  };
}

describe('recent-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadRecent', () => {
    it('returns empty list when storage is unset', async () => {
      expect(await loadRecent()).toEqual([]);
    });

    it('returns parsed entries for a valid payload', async () => {
      const saved = await saveRecent(makeTakeoffPrep());
      const entries = await loadRecent();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe(saved.id);
    });

    it('returns empty list when JSON is corrupted', async () => {
      await AsyncStorage.setItem(RECENT_STORAGE_KEY, '{not json');
      expect(await loadRecent()).toEqual([]);
    });

    it('returns empty list when schema mismatches', async () => {
      await AsyncStorage.setItem(
        RECENT_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 999, entries: [] }),
      );
      expect(await loadRecent()).toEqual([]);
    });
  });

  describe('saveRecent', () => {
    it('round-trips a takeoff entry', async () => {
      const saved = await saveRecent(makeTakeoffPrep());
      expect(saved.module).toBe('takeoff');
      expect(saved.inputs).toEqual(TAKEOFF_INPUTS);
      expect(saved.result).toBe(34);
      expect(saved.id.length).toBeGreaterThan(0);
      expect(new Date(saved.timestamp).toString()).not.toBe('Invalid Date');

      const fromDisk = await loadRecent();
      expect(fromDisk).toHaveLength(1);
      expect(fromDisk[0]).toEqual(saved);
    });

    it('round-trips a landing entry', async () => {
      const saved = await saveRecent(makeLandingPrep());
      expect(saved.module).toBe('landing');
      expect(saved.inputs).toEqual(LANDING_INPUTS);
    });

    it('inserts newest at head', async () => {
      await saveRecent(makeTakeoffPrep({ weightTons: 150 }));
      await saveRecent(makeTakeoffPrep({ weightTons: 160 }));
      const entries = await loadRecent();
      expect(entries).toHaveLength(2);
      expect(entries[0]?.module === 'takeoff' && entries[0]?.inputs.weightTons).toBe(160);
      expect(entries[1]?.module === 'takeoff' && entries[1]?.inputs.weightTons).toBe(150);
    });

    it('dedupes by fingerprint — same inputs replaces the old entry', async () => {
      const first = await saveRecent(makeTakeoffPrep());
      await new Promise((resolve) => setTimeout(resolve, 1));
      const second = await saveRecent(makeTakeoffPrep());
      const entries = await loadRecent();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe(second.id);
      expect(entries[0]?.id).not.toBe(first.id);
    });

    it('keeps separate entries when fingerprints differ', async () => {
      await saveRecent(makeTakeoffPrep({ weightTons: 170 }));
      await saveRecent(makeTakeoffPrep({ weightTons: 171 }));
      expect((await loadRecent()).length).toBe(2);
    });

    it('evicts oldest when capacity is exceeded', async () => {
      for (let i = 0; i < RECENT_MAX_ENTRIES + 2; i += 1) {
        await saveRecent(makeTakeoffPrep({ weightTons: 150 + i }));
      }
      const entries = await loadRecent();
      expect(entries).toHaveLength(RECENT_MAX_ENTRIES);
      // Newest insertion is first, oldest (150) is dropped.
      expect(entries[0]?.module === 'takeoff' && entries[0]?.inputs.weightTons).toBe(
        150 + RECENT_MAX_ENTRIES + 1,
      );
      const weights = entries.map((e) => (e.module === 'takeoff' ? e.inputs.weightTons : -1));
      expect(weights).not.toContain(150);
      expect(weights).not.toContain(151);
    });

    it('does not crash when AsyncStorage rejects on write', async () => {
      const originalSetItem = AsyncStorage.setItem;
      const failing = jest.fn(
        (): Promise<void> => Promise.reject(new Error('boom')),
      ) as unknown as typeof AsyncStorage.setItem;
      AsyncStorage.setItem = failing;
      try {
        await expect(saveRecent(makeTakeoffPrep())).resolves.toBeDefined();
      } finally {
        AsyncStorage.setItem = originalSetItem;
      }
    });
  });

  describe('removeRecent', () => {
    it('removes the entry with the given id', async () => {
      const a = await saveRecent(makeTakeoffPrep({ weightTons: 160 }));
      const b = await saveRecent(makeTakeoffPrep({ weightTons: 170 }));
      await removeRecent(a.id);
      const entries = await loadRecent();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe(b.id);
    });

    it('is a no-op when no entry matches', async () => {
      await saveRecent(makeTakeoffPrep());
      await removeRecent('does-not-exist');
      expect((await loadRecent()).length).toBe(1);
    });
  });

  describe('clearRecent', () => {
    it('wipes the list', async () => {
      await saveRecent(makeTakeoffPrep());
      await saveRecent(makeLandingPrep());
      await clearRecent();
      expect(await loadRecent()).toEqual([]);
    });

    it('does not crash when AsyncStorage rejects', async () => {
      const original = AsyncStorage.removeItem;
      const failing = jest.fn(
        (): Promise<void> => Promise.reject(new Error('boom')),
      ) as unknown as typeof AsyncStorage.removeItem;
      AsyncStorage.removeItem = failing;
      try {
        await expect(clearRecent()).resolves.toBeUndefined();
      } finally {
        AsyncStorage.removeItem = original;
      }
    });
  });

  describe('findRecentById', () => {
    it('returns the matching entry', async () => {
      const a = await saveRecent(makeTakeoffPrep());
      expect(await findRecentById(a.id)).toEqual(a);
    });

    it('returns null when no entry matches', async () => {
      await saveRecent(makeTakeoffPrep());
      expect(await findRecentById('nope')).toBeNull();
    });
  });

  describe('computeFingerprint', () => {
    it('is stable across calls for the same inputs', () => {
      expect(computeFingerprint('takeoff', TAKEOFF_INPUTS)).toBe(
        computeFingerprint('takeoff', TAKEOFF_INPUTS),
      );
    });

    it('differs for different inputs', () => {
      expect(computeFingerprint('takeoff', TAKEOFF_INPUTS)).not.toBe(
        computeFingerprint('takeoff', { ...TAKEOFF_INPUTS, weightTons: 171 }),
      );
    });

    it('differs for takeoff vs landing with same shape', () => {
      const shape: RecentTakeoffInputs = TAKEOFF_INPUTS;
      const landingShape: RecentLandingInputs = LANDING_INPUTS;
      expect(computeFingerprint('takeoff', shape)).not.toBe(
        computeFingerprint('landing', landingShape),
      );
    });
  });

  describe('schemaVersion contract', () => {
    it('persists schemaVersion in the storage payload', async () => {
      await saveRecent(makeTakeoffPrep());
      const raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string) as { schemaVersion: number };
      expect(parsed.schemaVersion).toBe(RECENT_SCHEMA_VERSION);
    });
  });
});
