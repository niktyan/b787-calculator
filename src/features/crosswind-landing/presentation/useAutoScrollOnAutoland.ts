/**
 * Auto-scroll helper for the Landing screen.
 *
 * When the pilot switches Landing from Manual → Autoland in a single-
 * column layout (iPhone, iPad portrait), two new toggle rows mount
 * below the fold — CAT II-III and ONE ENG INOP. Without intervention
 * the pilot has no visual cue that anything appeared further down.
 *
 * **Why the onContentSizeChange dance.** The first implementation
 * called `scrollToEnd` after a 50 ms `setTimeout`, but on real devices
 * the new rows hadn't always landed in the layout tree yet — the
 * ScrollView still thought its content height was the four-row
 * Manual size, scrolled to that (i.e. nowhere new), and the rows
 * stayed below the fold. Using the ScrollView's own
 * `onContentSizeChange` callback guarantees we run AFTER RN recorded
 * the new content height. We arm a one-shot flag in useEffect on the
 * Manual → Autoland transition, then consume it inside the size-change
 * callback.
 *
 * The effect / callback is guarded so it only fires on that specific
 * transition:
 *  - Mount in Autoland (e.g., user returns to the screen after state
 *    was already auto): no scroll.
 *  - Reverse transition Autoland → Manual: no scroll.
 *  - Two-column landscape (>= 1024 pt): no scroll. Nothing overflows
 *    the viewport, so a snap animation would be visually noisy
 *    without communicating anything.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';

import type { LandingMode } from '../domain/types';

/**
 * Returns a callback to wire to `<ScrollView onContentSizeChange={...} />`.
 * The callback only does work on the Manual → Autoland transition; on
 * every other content-size change it is a cheap no-op.
 */
export function useAutoScrollOnAutoland(
  scrollViewRef: RefObject<ScrollView | null>,
  landingMode: LandingMode,
  isSingleColumn: boolean,
): () => void {
  const prevLandingModeRef = useRef<LandingMode>(landingMode);
  const pendingScrollRef = useRef<boolean>(false);

  useEffect(() => {
    const wasManual = prevLandingModeRef.current === 'manual';
    const isNowAuto = landingMode === 'auto';
    prevLandingModeRef.current = landingMode;
    if (wasManual && isNowAuto && isSingleColumn) {
      pendingScrollRef.current = true;
    }
  }, [landingMode, isSingleColumn]);

  return useCallback((): void => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [scrollViewRef]);
}
