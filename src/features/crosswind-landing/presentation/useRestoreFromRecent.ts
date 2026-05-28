/**
 * Restore Landing inputs from a Recent entry id (ADR-0016).
 *
 * Reads `recentEntryId` from the expo-router query and, when the
 * matching entry is a landing entry, calls the supplied setters with
 * the persisted six-toggle state.
 *
 * Missing param, missing entry, or cross-module id all resolve to a
 * no-op — the screen keeps its default state.
 *
 * Legacy taxonomy fallback (ADR-0018): entries persisted before the
 * v2 schema bump may carry the old `good` / `mediumToGood` runway
 * condition keys. The screen state only accepts the new 7-value
 * `LandingRunwayCondition` union, so on restore the legacy values
 * map to their v2 successors:
 *   - `good`         → `goodWetDamp`   (more permissive of the two
 *                                       Good variants; the AFM
 *                                       Wet/Damp row carries the same
 *                                       limits as old Good for both
 *                                       aircraft, except for the
 *                                       B787-9 manual delta).
 *   - `mediumToGood` → `goodToMedium`  (pure rename, AFM phrasing).
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { LandingRunwayCondition } from '../../../core/aviation';
import { findRecentById } from '../../../core/recent-storage';
import type { RecentLandingEntry } from '../../../core/recent-storage';

export interface LandingRestoreApply {
  readonly setAircraft: (a: RecentLandingEntry['inputs']['aircraft']) => void;
  readonly setRunwayCondition: (r: LandingRunwayCondition) => void;
  readonly setLandingMode: (m: RecentLandingEntry['inputs']['landingMode']) => void;
  readonly setAsymReverse: (y: RecentLandingEntry['inputs']['asymReverse']) => void;
  readonly setCatIIIII: (y: RecentLandingEntry['inputs']['catIIIII']) => void;
  readonly setEngineInop: (y: RecentLandingEntry['inputs']['engineInop']) => void;
}

/**
 * Maps a persisted `runwayCondition` value (which may include legacy
 * v1 keys) onto the current v2 `LandingRunwayCondition` union.
 */
export function resolveLandingRunwayCondition(
  persisted: RecentLandingEntry['inputs']['runwayCondition'],
): LandingRunwayCondition {
  if (persisted === 'good') return 'goodWetDamp';
  if (persisted === 'mediumToGood') return 'goodToMedium';
  return persisted;
}

export function useRestoreFromRecent(apply: LandingRestoreApply): void {
  const params = useLocalSearchParams<{ readonly recentEntryId?: string }>();
  const recentEntryId = params.recentEntryId;
  // Stable-setter ref pattern — see takeoff useRestoreFromRecent for
  // the rationale.
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    if (recentEntryId === undefined || recentEntryId.length === 0) {
      return;
    }
    let cancelled = false;
    void findRecentById(recentEntryId).then((entry) => {
      if (cancelled || entry === null || entry.module !== 'landing') {
        return;
      }
      const { aircraft, runwayCondition, landingMode, asymReverse, catIIIII, engineInop } =
        entry.inputs;
      const a = applyRef.current;
      a.setAircraft(aircraft);
      a.setRunwayCondition(resolveLandingRunwayCondition(runwayCondition));
      a.setLandingMode(landingMode);
      a.setAsymReverse(asymReverse);
      a.setCatIIIII(catIIIII);
      a.setEngineInop(engineInop);
    });
    return (): void => {
      cancelled = true;
    };
  }, [recentEntryId]);
}
