/**
 * Local state machinery for the Crosswind Landing screen.
 *
 * Bundles the six toggle states and the Reset action so the screen
 * component itself stays inside the 80-line / 300-line caps after the
 * Sprint C bug-fix wrapped the body in a ScrollView (adding extra
 * indentation and the new sub-component).
 */

import { useCallback, useState } from 'react';

import type { AircraftVariant, RunwayCondition } from '../../../core/aviation';
import type { LandingMode, YesNo } from '../domain/types';

const DEFAULT_AIRCRAFT: AircraftVariant = 'b787_8';
const DEFAULT_RUNWAY: RunwayCondition = 'dry';
const DEFAULT_LANDING_MODE: LandingMode = 'manual';
const DEFAULT_YES_NO: YesNo = 'no';

export interface LandingScreenState {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: RunwayCondition;
  readonly landingMode: LandingMode;
  readonly asymReverse: YesNo;
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
  readonly setAircraft: (next: AircraftVariant) => void;
  readonly setRunwayCondition: (next: RunwayCondition) => void;
  readonly setLandingMode: (next: LandingMode) => void;
  readonly setAsymReverse: (next: YesNo) => void;
  readonly setCatIIIII: (next: YesNo) => void;
  readonly setEngineInop: (next: YesNo) => void;
  readonly reset: () => void;
}

export function useLandingScreenState(): LandingScreenState {
  const [aircraft, setAircraft] = useState<AircraftVariant>(DEFAULT_AIRCRAFT);
  const [runwayCondition, setRunwayCondition] = useState<RunwayCondition>(DEFAULT_RUNWAY);
  const [landingMode, setLandingMode] = useState<LandingMode>(DEFAULT_LANDING_MODE);
  const [asymReverse, setAsymReverse] = useState<YesNo>(DEFAULT_YES_NO);
  const [catIIIII, setCatIIIII] = useState<YesNo>(DEFAULT_YES_NO);
  const [engineInop, setEngineInop] = useState<YesNo>(DEFAULT_YES_NO);
  const reset = useCallback((): void => {
    setAircraft(DEFAULT_AIRCRAFT);
    setRunwayCondition(DEFAULT_RUNWAY);
    setLandingMode(DEFAULT_LANDING_MODE);
    setAsymReverse(DEFAULT_YES_NO);
    setCatIIIII(DEFAULT_YES_NO);
    setEngineInop(DEFAULT_YES_NO);
  }, []);
  return {
    aircraft,
    runwayCondition,
    landingMode,
    asymReverse,
    catIIIII,
    engineInop,
    setAircraft,
    setRunwayCondition,
    setLandingMode,
    setAsymReverse,
    setCatIIIII,
    setEngineInop,
    reset,
  };
}
