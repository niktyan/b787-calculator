import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../storage/keys';
import { storage } from '../../storage/storage';
import { useDisclaimerStatus } from '../useDisclaimerStatus';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock: unknown = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return mock;
});

describe('useDisclaimerStatus', () => {
  beforeEach(async () => {
    await storage.flushNow();
    await AsyncStorage.clear();
  });

  it('starts in "unknown" and resolves to "pending" when nothing is stored', async () => {
    const { result } = renderHook(() => useDisclaimerStatus());
    expect(result.current.status).toBe('unknown');
    await waitFor(() => {
      expect(result.current.status).toBe('pending');
    });
  });

  it('resolves to "accepted" when storage already has the flag', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.disclaimerAccepted, JSON.stringify(true));
    const { result } = renderHook(() => useDisclaimerStatus());
    await waitFor(() => {
      expect(result.current.status).toBe('accepted');
    });
  });

  it('accept() persists the flag and flips status to "accepted"', async () => {
    const { result } = renderHook(() => useDisclaimerStatus());
    await waitFor(() => {
      expect(result.current.status).toBe('pending');
    });

    await act(async () => {
      await result.current.accept();
    });

    expect(result.current.status).toBe('accepted');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.disclaimerAccepted)).toBe(JSON.stringify(true));
  });

  it('does not update state if unmounted before the read resolves', async () => {
    // Spy on console.error — if the cleanup guard is missing, React will warn
    // about setting state on an unmounted component. Failing this test would
    // surface that regression even before status assertions.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { unmount } = renderHook(() => useDisclaimerStatus());
    unmount();

    // Wait a microtask cycle so the in-flight storage.get() promise resolves
    // — the cleanup branch (active === false) is what we're exercising.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
