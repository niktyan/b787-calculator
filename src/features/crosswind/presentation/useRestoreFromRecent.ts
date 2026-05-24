/**
 * Restore Takeoff inputs from a Recent entry id (ADR-0016).
 *
 * Reads the `recentEntryId` route query param via expo-router and, on
 * mount (or whenever the param changes), loads the matching entry
 * from `core/recent-storage` and feeds it to the supplied setters.
 *
 * The hook is permissive: missing param, missing entry, or
 * cross-module entry id (e.g. landing id on the takeoff screen) all
 * resolve to a no-op. The screen falls back to default state.
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { findRecentById } from '../../../core/recent-storage';
import type { RecentTakeoffEntry } from '../../../core/recent-storage';

export interface TakeoffRestoreApply {
  readonly setWeightText: (text: string) => void;
  readonly setCgText: (text: string) => void;
  readonly setAircraft: (aircraft: RecentTakeoffEntry['inputs']['aircraft']) => void;
  readonly setRunwayCondition: (condition: RecentTakeoffEntry['inputs']['runwayCondition']) => void;
}

export function useRestoreFromRecent(apply: TakeoffRestoreApply): void {
  const params = useLocalSearchParams<{ readonly recentEntryId?: string }>();
  const recentEntryId = params.recentEntryId;
  // useState setters are stable across renders, but the wrapper
  // object literal is recreated each render. Keep it in a ref so
  // the effect's dep array stays clean and only re-fires when the
  // route param changes.
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    if (recentEntryId === undefined || recentEntryId.length === 0) {
      return;
    }
    let cancelled = false;
    void findRecentById(recentEntryId).then((entry) => {
      if (cancelled || entry === null || entry.module !== 'takeoff') {
        return;
      }
      const { aircraft, weightTons, cgPercent, runwayCondition } = entry.inputs;
      const a = applyRef.current;
      a.setAircraft(aircraft);
      a.setRunwayCondition(runwayCondition);
      a.setWeightText(weightTons.toString());
      a.setCgText(cgPercent.toString());
    });
    return (): void => {
      cancelled = true;
    };
  }, [recentEntryId]);
}
