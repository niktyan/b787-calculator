/**
 * Auto-scroll helper for the Landing screen.
 *
 * When the pilot switches Landing from Manual → Autoland in a single-
 * column layout (iPhone, iPad portrait), two new toggle rows mount
 * below the fold — CAT II-III and ONE ENG INOP. Without intervention
 * the pilot has no visual cue that anything appeared further down.
 * After the new rows mount we animate the ScrollView to the end so
 * the newly-revealed rows + the result panel slide into view.
 *
 * The effect is a no-op in 2-column landscape: nothing overflows the
 * viewport there, so a scroll animation would be visually noisy without
 * communicating anything. It is also a no-op on every transition other
 * than Manual → Autoland (so going back to Manual does not jump the
 * scroll position).
 *
 * The 50 ms timeout defers the call by one frame so React commits the
 * new rows before we measure / animate.
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';

import type { LandingMode } from '../domain/types';

const AUTO_SCROLL_DELAY_MS = 50;

export function useAutoScrollOnAutoland(
  scrollViewRef: RefObject<ScrollView | null>,
  landingMode: LandingMode,
  isSingleColumn: boolean,
): void {
  const prevLandingModeRef = useRef<LandingMode>(landingMode);
  useEffect(() => {
    const wasManual = prevLandingModeRef.current === 'manual';
    const isNowAuto = landingMode === 'auto';
    prevLandingModeRef.current = landingMode;
    if (wasManual && isNowAuto && isSingleColumn) {
      const timeoutId = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, AUTO_SCROLL_DELAY_MS);
      return (): void => {
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [landingMode, isSingleColumn, scrollViewRef]);
}
