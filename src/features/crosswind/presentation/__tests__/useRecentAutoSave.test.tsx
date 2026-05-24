/**
 * Auto-save behaviour for the Takeoff view-model (ADR-0016).
 *
 * Pins the contract that:
 *   - Saves fire only when state.kind === 'idle'.
 *   - Saves are debounced 500 ms — rapid changes collapse into one.
 *   - The persisted entry carries the numeric weight/CG (parsed from
 *     the input text), the active aircraft and runway condition, and
 *     the result in knots.
 */

import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadRecent } from '../../../../core/recent-storage';
import type { CrosswindCalculationOutput } from '../../domain/types';
import { type CrosswindCalculatorInputs, type CrosswindUIState } from '../useCrosswindCalculator';
import { useRecentAutoSave } from '../useRecentAutoSave';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DEBOUNCE_MS = 500;

const FAKE_OUTPUT: CrosswindCalculationOutput = {
  maxCrosswindKnots: 34 as CrosswindCalculationOutput['maxCrosswindKnots'],
  metadata: {
    dataVersion: '2026-05-17.001',
    referenceDocument: 'fake',
    aircraft: 'b787_8',
    weightBracket: { lower: 0, upper: 0 },
    cgBracket: { lower: 0, upper: 0 },
    bracketCrosswindRange: {
      lower: 0 as CrosswindCalculationOutput['maxCrosswindKnots'],
      upper: 0 as CrosswindCalculationOutput['maxCrosswindKnots'],
    },
    calculationStrategy: 'within-bracket',
  },
};

function idleState(): CrosswindUIState {
  return { kind: 'idle', output: FAKE_OUTPUT };
}

function defaultInputs(
  overrides: Partial<CrosswindCalculatorInputs> = {},
): CrosswindCalculatorInputs {
  return {
    weightText: '170',
    cgText: '32',
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    ...overrides,
  };
}

interface HookProps {
  readonly state: CrosswindUIState;
  readonly inputs: CrosswindCalculatorInputs;
}

describe('useRecentAutoSave (takeoff)', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not save when state is not idle', async () => {
    const props: HookProps = {
      state: { kind: 'empty' },
      inputs: defaultInputs(),
    };
    renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), { initialProps: props });
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS + 1);
    });
    jest.useRealTimers();
    expect(await loadRecent()).toEqual([]);
  });

  it('saves the parsed inputs and result after the debounce window', async () => {
    renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: { state: idleState(), inputs: defaultInputs() },
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
    expect(entry?.module).toBe('takeoff');
    if (entry?.module === 'takeoff') {
      expect(entry.inputs).toEqual({
        aircraft: 'b787_8',
        weightTons: 170,
        cgPercent: 32,
        runwayCondition: 'dry',
      });
      expect(entry.result).toBe(34);
    }
  });

  it('collapses rapid input changes into a single save (debounce)', async () => {
    const { rerender } = renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: { state: idleState(), inputs: defaultInputs({ cgText: '30' }) },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    rerender({ state: idleState(), inputs: defaultInputs({ cgText: '31' }) });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    rerender({ state: idleState(), inputs: defaultInputs({ cgText: '32' }) });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    jest.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    const entries = await loadRecent();
    expect(entries).toHaveLength(1);
    if (entries[0]?.module === 'takeoff') {
      expect(entries[0].inputs.cgPercent).toBe(32);
    }
  });

  it('parses comma decimal separators', async () => {
    renderHook((p: HookProps) => useRecentAutoSave(p.state, p.inputs), {
      initialProps: {
        state: idleState(),
        inputs: defaultInputs({ weightText: '170,5', cgText: '32,7' }),
      },
    });
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    jest.useRealTimers();
    await Promise.resolve();
    await Promise.resolve();

    const entries = await loadRecent();
    if (entries[0]?.module === 'takeoff') {
      expect(entries[0].inputs.weightTons).toBeCloseTo(170.5);
      expect(entries[0].inputs.cgPercent).toBeCloseTo(32.7);
    }
  });
});
