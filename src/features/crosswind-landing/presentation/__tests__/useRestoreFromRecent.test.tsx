/**
 * Restoration of Landing inputs from a recentEntryId route param (ADR-0016).
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveRecent } from '../../../../core/recent-storage';
import { useRestoreFromRecent } from '../useRestoreFromRecent';
import type { LandingRestoreApply } from '../useRestoreFromRecent';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockParams: { readonly recentEntryId?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: (): { readonly recentEntryId?: string } => mockParams,
}));

function makeApply(): {
  readonly apply: LandingRestoreApply;
  readonly calls: {
    aircraft: string[];
    runway: string[];
    landingMode: string[];
    asymReverse: string[];
    catIIIII: string[];
    engineInop: string[];
  };
} {
  const calls = {
    aircraft: [] as string[],
    runway: [] as string[],
    landingMode: [] as string[],
    asymReverse: [] as string[],
    catIIIII: [] as string[],
    engineInop: [] as string[],
  };
  const apply: LandingRestoreApply = {
    setAircraft: (a): void => {
      calls.aircraft.push(a);
    },
    setRunwayCondition: (r): void => {
      calls.runway.push(r);
    },
    setLandingMode: (m): void => {
      calls.landingMode.push(m);
    },
    setAsymReverse: (y): void => {
      calls.asymReverse.push(y);
    },
    setCatIIIII: (y): void => {
      calls.catIIIII.push(y);
    },
    setEngineInop: (y): void => {
      calls.engineInop.push(y);
    },
  };
  return { apply, calls };
}

describe('useRestoreFromRecent (landing)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockParams = {};
  });

  it('is a no-op when no recentEntryId param is present', () => {
    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));
    expect(calls.aircraft).toEqual([]);
  });

  it('prefills all six toggles when the entry exists and belongs to landing', async () => {
    const saved = await saveRecent({
      module: 'landing',
      inputs: {
        aircraft: 'b787_9',
        runwayCondition: 'good',
        landingMode: 'auto',
        asymReverse: 'yes',
        catIIIII: 'yes',
        engineInop: 'no',
      },
      result: 22,
    });
    mockParams = { recentEntryId: saved.id };

    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));

    await waitFor(() => {
      expect(calls.aircraft).toEqual(['b787_9']);
    });
    expect(calls.runway).toEqual(['good']);
    expect(calls.landingMode).toEqual(['auto']);
    expect(calls.asymReverse).toEqual(['yes']);
    expect(calls.catIIIII).toEqual(['yes']);
    expect(calls.engineInop).toEqual(['no']);
  });

  it('is a no-op when the entry id refers to a takeoff entry (wrong module)', async () => {
    const takeoff = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });
    mockParams = { recentEntryId: takeoff.id };

    const { apply, calls } = makeApply();
    renderHook(() => useRestoreFromRecent(apply));
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.aircraft).toEqual([]);
  });
});
