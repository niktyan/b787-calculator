/**
 * Auto-save behaviour for the Landing view-model (ADR-0016).
 *
 * Mirrors the takeoff auto-save tests in shape but with landing
 * inputs (six categorical toggles, no numeric parsing).
 */

import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadRecent } from '../../../../core/recent-storage';
import type { CrosswindLandingInput, CrosswindLandingOutput } from '../../domain/types';
import type { CrosswindLandingUIState } from '../useCrosswindLandingCalculator';
import { useRecentAutoSave } from '../useRecentAutoSave';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DEBOUNCE_MS = 500;

const FAKE_OUTPUT: CrosswindLandingOutput = {
  maxCrosswindKnots: 25,
  metadata: {
    dataVersion: 'fake',
    referenceDocument: 'fake',
    aircraft: 'b787_8',
    landingMode: 'manual',
    appliedAdjustments: { catCap: false, asymPenalty: false, inopCap: false },
  },
};

function idleState(): CrosswindLandingUIState {
  return { kind: 'idle', output: FAKE_OUTPUT };
}

function defaultInputs(overrides: Partial<CrosswindLandingInput> = {}): CrosswindLandingInput {
  return {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'manual',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    ...overrides,
  };
}

interface HookProps {
  readonly state: CrosswindLandingUIState;
  readonly inputs: CrosswindLandingInput;
}

describe('useRecentAutoSave (landing)', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not save when state is not idle', async () => {
    renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: {
        state: { kind: 'error', headline: 'x' } satisfies CrosswindLandingUIState,
        inputs: defaultInputs(),
      },
    });
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS + 1);
    });
    jest.useRealTimers();
    expect(await loadRecent()).toEqual([]);
  });

  it('saves the categorical inputs and result after the debounce window', async () => {
    renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: {
        state: idleState(),
        inputs: defaultInputs({ landingMode: 'auto', catIIIII: 'yes', asymReverse: 'yes' }),
      },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    jest.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    const entries = await loadRecent();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.module).toBe('landing');
    if (entry?.module === 'landing') {
      expect(entry.inputs).toEqual({
        aircraft: 'b787_8',
        runwayCondition: 'dry',
        landingMode: 'auto',
        asymReverse: 'yes',
        catIIIII: 'yes',
        engineInop: 'no',
      });
      expect(entry.result).toBe(25);
    }
  });

  it('collapses rapid toggle changes into a single save (debounce)', async () => {
    const { rerender } = renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: { state: idleState(), inputs: defaultInputs() },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    rerender({ state: idleState(), inputs: defaultInputs({ asymReverse: 'yes' }) });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    rerender({ state: idleState(), inputs: defaultInputs({ landingMode: 'auto' }) });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    jest.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    const entries = await loadRecent();
    expect(entries).toHaveLength(1);
    if (entries[0]?.module === 'landing') {
      expect(entries[0].inputs.landingMode).toBe('auto');
      expect(entries[0].inputs.asymReverse).toBe('no');
    }
  });
});
