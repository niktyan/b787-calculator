import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../storage/keys';
import { storage } from '../../storage/storage';
import { acceptDisclaimer, readDisclaimerStatus } from '../state';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock: unknown = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return mock;
});

describe('disclaimer state', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    await storage.flushNow();
    await AsyncStorage.clear();
  });

  describe('readDisclaimerStatus', () => {
    it('returns "pending" when nothing is stored', async () => {
      expect(await readDisclaimerStatus()).toBe('pending');
    });

    it('returns "accepted" when storage has true', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, JSON.stringify(true));
      expect(await readDisclaimerStatus()).toBe('accepted');
    });

    it('returns "pending" when storage holds an invalid value', async () => {
      // Corrupted storage edge case from 06-ui-spec.md: treat as not accepted.
      await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, 'not-a-boolean');
      expect(await readDisclaimerStatus()).toBe('pending');
    });

    it('returns "pending" when stored value is false', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, JSON.stringify(false));
      expect(await readDisclaimerStatus()).toBe('pending');
    });
  });

  describe('acceptDisclaimer', () => {
    it('persists true immediately (flushes the debounce window)', async () => {
      await acceptDisclaimer();
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.disclaimerAccepted);
      expect(stored).toBe(JSON.stringify(true));
    });

    it('makes readDisclaimerStatus return "accepted" afterwards', async () => {
      await acceptDisclaimer();
      expect(await readDisclaimerStatus()).toBe('accepted');
    });

    it('is idempotent', async () => {
      await acceptDisclaimer();
      await acceptDisclaimer();
      expect(await readDisclaimerStatus()).toBe('accepted');
    });
  });
});
