import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveRecent } from '../../../../core/recent-storage';
import { useRecentCalculations } from '../useRecentCalculations';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// useFocusEffect is what useRecentCalculations relies on for refresh-
// on-screen-entry. In tests the screen is never focused/blurred —
// we collapse it to "run the callback once on mount" so the load
// happens deterministically.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)): void => {
      useEffect(() => callback(), [callback]);
    },
  };
});

describe('useRecentCalculations', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads entries on mount', async () => {
    await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });

    const { result } = renderHook(() => useRecentCalculations());
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.entries).toHaveLength(1);
  });

  it('remove() deletes an entry and refreshes the list', async () => {
    const a = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });
    const b = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 180, cgPercent: 32, runwayCondition: 'dry' },
      result: 32,
    });

    const { result } = renderHook(() => useRecentCalculations());
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });

    await act(async () => {
      await result.current.remove(a.id);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.id).toBe(b.id);
  });

  it('clear() wipes the list', async () => {
    await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });
    await saveRecent({
      module: 'landing',
      inputs: {
        aircraft: 'b787_8',
        runwayCondition: 'dry',
        landingMode: 'manual',
        asymReverse: 'no',
        catIIIII: 'no',
        engineInop: 'no',
      },
      result: 30,
    });

    const { result } = renderHook(() => useRecentCalculations());
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.entries).toEqual([]);
  });
});
