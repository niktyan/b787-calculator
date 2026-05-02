import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../keys';
import { storage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock: unknown = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return mock;
});

const DEBOUNCE_MS = 300;

describe('storage', () => {
  beforeEach(async () => {
    // Drain any pending writes leaked from a previous test, then wipe AsyncStorage
    // and start with fresh fake timers + clean call counters.
    jest.useRealTimers();
    await storage.flushNow();
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('returns null for an unset key', async () => {
      expect(await storage.get('language')).toBeNull();
    });

    it('returns the value when storage has valid JSON matching the schema', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.language, JSON.stringify('ru'));
      expect(await storage.get('language')).toBe('ru');
    });

    it('returns null and does not throw when storage holds non-JSON garbage', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.theme, '{not json');
      expect(await storage.get('theme')).toBeNull();
    });

    it('returns null when stored JSON does not match the schema', async () => {
      // theme schema rejects "purple" — only auto/light/dark allowed.
      await AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify('purple'));
      expect(await storage.get('theme')).toBeNull();
    });

    it('returns null when boolean schema sees a string', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, JSON.stringify('yes'));
      expect(await storage.get('disclaimerAccepted')).toBeNull();
    });
  });

  describe('set with debounced write', () => {
    it('does not write to AsyncStorage immediately', () => {
      storage.set('language', 'en');
      expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    });

    it('flushes after the debounce window', async () => {
      storage.set('language', 'en');
      jest.advanceTimersByTime(DEBOUNCE_MS);
      // allow the queued microtask (multiSet) to resolve
      await Promise.resolve();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.language);
      expect(stored).toBe(JSON.stringify('en'));
    });

    it('coalesces multiple writes to the same key into one final value', async () => {
      storage.set('language', 'en');
      storage.set('language', 'ru');
      jest.advanceTimersByTime(DEBOUNCE_MS);
      await Promise.resolve();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.language);
      expect(stored).toBe(JSON.stringify('ru'));
    });

    it('reflects pending writes in get() before flush', async () => {
      storage.set('theme', 'dark');
      // No advanceTimers — write is still pending in memory.
      expect(await storage.get('theme')).toBe('dark');
    });

    it('rejects values that fail schema validation', async () => {
      // @ts-expect-error: deliberately pass an invalid value to exercise the runtime guard.
      storage.set('theme', 'neon');
      jest.advanceTimersByTime(DEBOUNCE_MS);
      await Promise.resolve();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
    });
  });

  describe('flushNow', () => {
    it('writes pending values immediately', async () => {
      storage.set('disclaimerAccepted', true);
      await storage.flushNow();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.disclaimerAccepted);
      expect(stored).toBe(JSON.stringify(true));
    });

    it('is a no-op when nothing is pending', async () => {
      await expect(storage.flushNow()).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('removes the value from storage and from pending writes', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.language, JSON.stringify('en'));
      storage.set('language', 'ru');
      await storage.remove('language');
      jest.advanceTimersByTime(DEBOUNCE_MS);
      await Promise.resolve();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.language)).toBeNull();
      expect(await storage.get('language')).toBeNull();
    });
  });

  describe('round-trip integration', () => {
    it('write → flush → read returns the original value for every known key', async () => {
      storage.set('disclaimerAccepted', true);
      storage.set('language', 'ru');
      storage.set('theme', 'dark');
      storage.set('showDataSourceOnResult', false);
      await storage.flushNow();

      expect(await storage.get('disclaimerAccepted')).toBe(true);
      expect(await storage.get('language')).toBe('ru');
      expect(await storage.get('theme')).toBe('dark');
      expect(await storage.get('showDataSourceOnResult')).toBe(false);
    });
  });
});
