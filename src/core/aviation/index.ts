// Public API of the core/aviation submodule — shared aviation primitives
// consumed by every feature that reasons about aircraft variant, flight
// phase, or runway condition.

export {
  AIRCRAFT_VARIANTS,
  FLIGHT_PHASES,
  LANDING_RUNWAY_CONDITIONS,
  RUNWAY_CONDITIONS,
  RWYCC,
} from './types';
export type {
  Aircraft,
  AircraftVariant,
  FlightPhase,
  LandingRunwayCondition,
  RunwayCondition,
  RunwayConditionCode,
} from './types';
