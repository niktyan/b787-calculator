/**
 * Behaviour tests for the Landing auto-scroll hook.
 *
 * The hook arms a one-shot flag on the Manual → Autoland transition
 * (when in single-column layout) and consumes it from the
 * `onContentSizeChange` callback the ScrollView fires once the new
 * CAT II-III and ONE ENG INOP rows are committed. The tests below
 * verify each branch of that contract.
 */

import { act, renderHook } from '@testing-library/react-native';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';

import type { LandingMode } from '../../domain/types';
import { useAutoScrollOnAutoland } from '../useAutoScrollOnAutoland';

interface HookProps {
  readonly landingMode: LandingMode;
  readonly isSingleColumn: boolean;
}

function createScrollRef(): { ref: RefObject<ScrollView | null>; scrollToEnd: jest.Mock } {
  const scrollToEnd = jest.fn();
  const ref = { current: { scrollToEnd } as unknown as ScrollView };
  return { ref, scrollToEnd };
}

describe('useAutoScrollOnAutoland', () => {
  it('scrolls to end from the next onContentSizeChange after manual → auto (single column)', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { result, rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    // Initial content-size callback in Manual — no pending flag, no scroll.
    act(() => {
      result.current();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();

    // Flip to Autoland — useEffect arms the flag synchronously.
    rerender({ landingMode: 'auto', isSingleColumn: true });
    expect(scrollToEnd).not.toHaveBeenCalled();

    // ScrollView measures the new (taller) content → scrollToEnd fires.
    act(() => {
      result.current();
    });
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('fires at most once per Manual → Autoland transition (subsequent content changes are no-ops)', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { result, rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: true });
    act(() => {
      result.current();
    });
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    // A second content-size event (e.g. soft-keyboard show) must NOT re-scroll.
    act(() => {
      result.current();
    });
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('does NOT scroll in two-column layout (landscape no-op guard)', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { result, rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: false } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: false });
    act(() => {
      result.current();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('does NOT scroll on the reverse transition auto → manual', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { result, rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'auto', isSingleColumn: true } },
    );
    rerender({ landingMode: 'manual', isSingleColumn: true });
    act(() => {
      result.current();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('does NOT scroll on initial mount when already in Autoland', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { result } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'auto', isSingleColumn: true } },
    );
    act(() => {
      result.current();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('tolerates a null ref.current (defensive — no throw)', () => {
    const ref = { current: null };
    const { result, rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: true });
    expect(() => {
      act(() => {
        result.current();
      });
    }).not.toThrow();
  });
});
