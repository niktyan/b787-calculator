/**
 * Smoke + behaviour tests for the Landing auto-scroll hook.
 *
 * Tested transitions:
 *   - Manual → Autoland (single column) → scrollToEnd fires.
 *   - Manual → Autoland (two column)    → scrollToEnd does NOT fire.
 *   - Autoland → Manual                  → scrollToEnd does NOT fire.
 *   - Mount in Autoland (no prior state) → scrollToEnd does NOT fire.
 *   - Unmount during the deferred timeout → timeout is cleared cleanly.
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
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls scrollToEnd when landing mode flips manual → auto in single-column layout', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    expect(scrollToEnd).not.toHaveBeenCalled();
    rerender({ landingMode: 'auto', isSingleColumn: true });
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('does NOT scroll in two-column layout (landscape no-op guard)', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: false } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: false });
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('does NOT scroll on the reverse transition auto → manual', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'auto', isSingleColumn: true } },
    );
    rerender({ landingMode: 'manual', isSingleColumn: true });
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('does NOT scroll on initial mount when already in Autoland', () => {
    const { ref, scrollToEnd } = createScrollRef();
    renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'auto', isSingleColumn: true } },
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('clears the deferred timeout if the hook unmounts before it fires', () => {
    const { ref, scrollToEnd } = createScrollRef();
    const { rerender, unmount } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: true });
    unmount();
    act(() => {
      jest.runAllTimers();
    });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('tolerates a null ref.current (defensive — no throw)', () => {
    const ref = { current: null };
    const { rerender } = renderHook(
      ({ landingMode, isSingleColumn }: HookProps) =>
        useAutoScrollOnAutoland(ref, landingMode, isSingleColumn),
      { initialProps: { landingMode: 'manual', isSingleColumn: true } },
    );
    rerender({ landingMode: 'auto', isSingleColumn: true });
    expect(() => {
      act(() => {
        jest.runAllTimers();
      });
    }).not.toThrow();
  });
});
