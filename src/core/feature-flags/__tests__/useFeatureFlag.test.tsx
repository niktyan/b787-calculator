import { act, renderHook } from '@testing-library/react-native';

import { resetFlags, setFlag } from '../flags';
import { useFeatureFlag } from '../useFeatureFlag';

describe('useFeatureFlag', () => {
  beforeEach(() => {
    resetFlags();
  });

  it('returns the current value of a flag', () => {
    const { result } = renderHook(() => useFeatureFlag('enableDataVersionBanner'));
    expect(result.current).toBe(true);
  });

  it('re-renders the consumer when the flag changes', () => {
    const { result } = renderHook(() => useFeatureFlag('showCalcTimeOnResult'));
    expect(result.current).toBe(false);

    act(() => {
      setFlag('showCalcTimeOnResult', true);
    });

    expect(result.current).toBe(true);
  });

  it('does not re-render when an unrelated flag changes', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useFeatureFlag('enableDataVersionBanner');
    });
    expect(result.current).toBe(true);
    const baseRenders = renderCount;

    act(() => {
      // useSyncExternalStore re-runs the selector on notify; same value short-circuits the re-render.
      setFlag('enableDataVersionBanner', true);
    });

    expect(renderCount).toBe(baseRenders);
  });
});
