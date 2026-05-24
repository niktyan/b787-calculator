/**
 * Restoration of Takeoff inputs from a recentEntryId route param (ADR-0016).
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveRecent } from '../../../../core/recent-storage';
import { useRestoreFromRecent } from '../useRestoreFromRecent';
import type { TakeoffRestoreApply } from '../useRestoreFromRecent';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockParams: { readonly recentEntryId?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: (): { readonly recentEntryId?: string } => mockParams,
}));

function makeApply(): {
  readonly apply: TakeoffRestoreApply;
  readonly calls: {
    weightText: string[];
    cgText: string[];
    aircraft: string[];
    runway: string[];
  };
} {
  const calls = {
    weightText: [] as string[],
    cgText: [] as string[],
    aircraft: [] as string[],
    runway: [] as string[],
  };
  const apply: TakeoffRestoreApply = {
    setWeightText: (t): void => {
      calls.weightText.push(t);
    },
    setCgText: (t): void => {
      calls.cgText.push(t);
    },
    setAircraft: (a): void => {
      calls.aircraft.push(a);
    },
    setRunwayCondition: (r): void => {
      calls.runway.push(r);
    },
  };
  return { apply, calls };
}

describe('useRestoreFromRecent (takeoff)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockParams = {};
  });

  it('is a no-op when no recentEntryId param is present', () => {
    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));
    expect(calls.weightText).toEqual([]);
    expect(calls.aircraft).toEqual([]);
  });

  it('prefills state when the entry exists and belongs to takeoff', async () => {
    const saved = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_9', weightTons: 200, cgPercent: 28, runwayCondition: 'good' },
      result: 28,
    });
    mockParams = { recentEntryId: saved.id };

    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));

    await waitFor(() => {
      expect(calls.aircraft).toEqual(['b787_9']);
    });
    expect(calls.runway).toEqual(['good']);
    expect(calls.weightText).toEqual(['200']);
    expect(calls.cgText).toEqual(['28']);
  });

  it('is a no-op when the entry id does not exist', async () => {
    mockParams = { recentEntryId: 'does-not-exist' };
    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));
    // Allow the async findRecentById to resolve.
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.weightText).toEqual([]);
  });

  it('is a no-op when the entry id refers to a landing entry (wrong module)', async () => {
    const landing = await saveRecent({
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
    mockParams = { recentEntryId: landing.id };

    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.weightText).toEqual([]);
    expect(calls.aircraft).toEqual([]);
  });
});
