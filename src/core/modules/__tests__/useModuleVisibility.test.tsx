import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS, storage } from '../../storage';
import { useModuleVisibility } from '../useModuleVisibility';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DEBOUNCE_MS = 300;

describe('useModuleVisibility', () => {
  beforeEach(async () => {
    await storage.flushNow();
    await AsyncStorage.clear();
  });

  it('defaults all modules to visible when storage is empty', () => {
    const { result } = renderHook(() => useModuleVisibility());
    expect(result.current.isVisible('crosswind-takeoff')).toBe(true);
    expect(result.current.isVisible('crosswind-landing')).toBe(true);
    expect(result.current.isVisible('any-future-module')).toBe(true);
  });

  it('toggle flips visibility for one module and leaves others intact', () => {
    const { result } = renderHook(() => useModuleVisibility());
    act(() => {
      result.current.toggle('crosswind-landing');
    });
    expect(result.current.isVisible('crosswind-landing')).toBe(false);
    expect(result.current.isVisible('crosswind-takeoff')).toBe(true);
  });

  it('persists toggles to AsyncStorage through the debounced writer', async () => {
    const { result } = renderHook(() => useModuleVisibility());
    act(() => {
      result.current.toggle('crosswind-landing');
    });
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 50));
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.moduleVisibility);
    expect(stored).toBe(JSON.stringify({ 'crosswind-landing': false }));
  });

  it('reads persisted state from storage on mount', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.moduleVisibility,
      JSON.stringify({ 'crosswind-takeoff': false }),
    );
    const { result } = renderHook(() => useModuleVisibility());
    await waitFor(() => {
      expect(result.current.isVisible('crosswind-takeoff')).toBe(false);
    });
    expect(result.current.isVisible('crosswind-landing')).toBe(true);
  });

  it('falls through to all-visible when storage holds a corrupted value', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.moduleVisibility, '{not-json');
    const { result } = renderHook(() => useModuleVisibility());
    // Even after the mount-time read attempt, isVisible stays true.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(result.current.isVisible('crosswind-landing')).toBe(true);
  });
});
