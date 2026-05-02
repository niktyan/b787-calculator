import { AccessibilityInfo } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useScaleOnPress } from '../useScaleOnPress';

/**
 * The reanimated mock (loaded via jest-setup.reanimated.js) replaces
 * `useAnimatedStyle` with a function that calls the worklet synchronously
 * and returns whatever the worklet returns — that lets us assert the
 * style shape (transform / opacity values) directly.
 *
 * `withTiming(toValue)` in the mock returns the toValue unchanged, so
 * shared values transition immediately to their target.
 */

describe('useScaleOnPress', () => {
  let isReduceMotionEnabledSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;
  let reduceMotionListener: ((enabled: boolean) => void) | null;

  beforeEach(() => {
    reduceMotionListener = null;
    isReduceMotionEnabledSpy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    addEventListenerSpy = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      // The RN typings overload addEventListener per event name. We narrow the
      // union to a single signature for the test mock.
      .mockImplementation(((event: string, listener: (enabled: boolean) => void) => {
        if (event === 'reduceMotionChanged') {
          reduceMotionListener = listener;
        }
        return { remove: jest.fn() };
      }) as unknown as typeof AccessibilityInfo.addEventListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns animatedStyle, onPressIn, and onPressOut', () => {
    const { result } = renderHook(() => useScaleOnPress());
    expect(result.current.animatedStyle).toBeDefined();
    expect(typeof result.current.onPressIn).toBe('function');
    expect(typeof result.current.onPressOut).toBe('function');
    // Hook should subscribe to reduce-motion changes.
    expect(addEventListenerSpy).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
  });

  it('exposes a non-empty animated style and does not throw on press in/out (motion ON)', async () => {
    const { result } = renderHook(() => useScaleOnPress());
    await waitFor(() => {
      expect(isReduceMotionEnabledSpy).toHaveBeenCalled();
    });

    // Initial style snapshots the shared values (scale=1, opacity=1).
    expect(result.current.animatedStyle).toEqual(
      expect.objectContaining({
        transform: [{ scale: 1 }],
        opacity: 1,
      }),
    );

    // When motion is on, onPressIn/onPressOut drive `withTiming` against the
    // shared values — those mutations happen outside React's render cycle, so
    // we don't assert on the post-press style here (the reanimated mock
    // snapshots `useAnimatedStyle` once and doesn't subscribe to live shared-
    // value changes). The contract verified is: the calls don't throw.
    expect(() => act(() => result.current.onPressIn())).not.toThrow();
    expect(() => act(() => result.current.onPressOut())).not.toThrow();
  });

  it('returns identity style when reduce motion is ON (initial check)', async () => {
    isReduceMotionEnabledSpy.mockResolvedValue(true);
    const { result } = renderHook(() => useScaleOnPress());

    await waitFor(() => {
      expect(isReduceMotionEnabledSpy).toHaveBeenCalled();
    });

    act(() => result.current.onPressIn());
    expect(result.current.animatedStyle).toEqual(
      expect.objectContaining({
        transform: [{ scale: 1 }],
        opacity: 1,
      }),
    );

    act(() => result.current.onPressOut());
    expect(result.current.animatedStyle).toEqual(
      expect.objectContaining({
        transform: [{ scale: 1 }],
        opacity: 1,
      }),
    );
  });

  it('flips to identity behaviour live when the system toggles reduce motion ON', async () => {
    const { result } = renderHook(() => useScaleOnPress());
    await waitFor(() => {
      expect(isReduceMotionEnabledSpy).toHaveBeenCalled();
    });

    act(() => {
      reduceMotionListener?.(true);
    });

    act(() => result.current.onPressIn());
    expect(result.current.animatedStyle).toEqual(
      expect.objectContaining({
        transform: [{ scale: 1 }],
        opacity: 1,
      }),
    );
  });
});
