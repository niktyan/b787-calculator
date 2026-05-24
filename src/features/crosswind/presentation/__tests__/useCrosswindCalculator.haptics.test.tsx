/**
 * State-transition haptics for the Crosswind Takeoff view-model.
 *
 * Pins ADR-0015 behaviour: warning haptic fires when the result panel
 * crosses idle → out-of-envelope, success haptic fires on the reverse
 * transition. No haptic on initial mount, on other state combinations
 * (empty ↔ *), or when the kill-switch flag is off.
 */

import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { resetFlags, setFlag } from '../../../../core/feature-flags';
import { createCrosswindRepository } from '../../data';
import type { CrosswindDataFile } from '../../data/schema';
import type { AircraftVariant, RunwayCondition } from '../../domain/types';
import { useCrosswindCalculator, type CrosswindCalculatorInputs } from '../useCrosswindCalculator';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string): string => key,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const notificationAsyncMock = Haptics.notificationAsync as jest.MockedFunction<
  typeof Haptics.notificationAsync
>;

function loadData(): CrosswindDataFile {
  const repo = createCrosswindRepository();
  const result = repo.load();
  if (!result.ok) {
    throw new Error(`Failed to load fixture data: ${result.error.details}`);
  }
  return result.value;
}

interface BuildInputsOptions {
  readonly weightText?: string;
  readonly cgText?: string;
  readonly aircraft?: AircraftVariant;
  readonly runwayCondition?: RunwayCondition;
}

const VALID_WEIGHT = '170';
const VALID_CG = '32';
const OUT_OF_ENVELOPE_WEIGHT = '300';

function makeInputs(options: BuildInputsOptions = {}): CrosswindCalculatorInputs {
  return {
    weightText: options.weightText ?? VALID_WEIGHT,
    cgText: options.cgText ?? VALID_CG,
    aircraft: options.aircraft ?? 'b787_8',
    runwayCondition: options.runwayCondition ?? 'dry',
  };
}

describe('useCrosswindCalculator · state-transition haptics (ADR-0015)', () => {
  const data = loadData();

  beforeEach(() => {
    resetFlags();
    notificationAsyncMock.mockClear();
  });

  it('does not fire any haptic on initial mount (idle state)', () => {
    renderHook(() => useCrosswindCalculator({ inputs: makeInputs(), data }));
    expect(notificationAsyncMock).not.toHaveBeenCalled();
  });

  it('does not fire any haptic on initial mount (out-of-envelope state)', () => {
    renderHook(() =>
      useCrosswindCalculator({
        inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }),
        data,
      }),
    );
    expect(notificationAsyncMock).not.toHaveBeenCalled();
  });

  it('fires warning haptic on idle → out-of-envelope transition', () => {
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs() } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }) });
    });

    expect(notificationAsyncMock).toHaveBeenCalledTimes(1);
    expect(notificationAsyncMock).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
  });

  it('fires success haptic on out-of-envelope → idle transition', () => {
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }) } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs() });
    });

    expect(notificationAsyncMock).toHaveBeenCalledTimes(1);
    expect(notificationAsyncMock).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('does not fire haptic on empty → idle transition', () => {
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs({ weightText: '' }) } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs() });
    });

    expect(notificationAsyncMock).not.toHaveBeenCalled();
  });

  it('does not fire haptic on empty → out-of-envelope transition', () => {
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs({ weightText: '' }) } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }) });
    });

    expect(notificationAsyncMock).not.toHaveBeenCalled();
  });

  it('does not re-fire warning on consecutive renders within out-of-envelope state', () => {
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs() } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }) });
    });
    expect(notificationAsyncMock).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ inputs: makeInputs({ weightText: '320' }) });
    });
    // Already out-of-envelope — still 1 invocation total, no re-fire.
    expect(notificationAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('does not fire haptics when enableHapticFeedback is off', () => {
    setFlag('enableHapticFeedback', false);
    const { rerender } = renderHook(
      (props: { readonly inputs: CrosswindCalculatorInputs }) =>
        useCrosswindCalculator({ inputs: props.inputs, data }),
      { initialProps: { inputs: makeInputs() } },
    );
    notificationAsyncMock.mockClear();

    act(() => {
      rerender({ inputs: makeInputs({ weightText: OUT_OF_ENVELOPE_WEIGHT }) });
    });
    act(() => {
      rerender({ inputs: makeInputs() });
    });

    expect(notificationAsyncMock).not.toHaveBeenCalled();
  });
});
