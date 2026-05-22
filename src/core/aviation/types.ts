/**
 * Shared aviation domain primitives — used across feature modules.
 *
 * Per `02_Specification/02-architecture.md` § "Module Communication
 * Patterns", any type or constant required by two or more features lives
 * in `core/`. `AircraftVariant`, `FlightPhase`, `RunwayCondition` and the
 * RWYCC numeric mapping are consumed by both `features/crosswind`
 * (takeoff) and `features/crosswind-landing` — extracted here so neither
 * feature imports from the other (forbidden cross-feature dependency).
 *
 * Pure TypeScript — no runtime dependencies. Safe to import from any
 * layer (domain / data / presentation) of any feature.
 */

export const AIRCRAFT_VARIANTS = ['b787_8', 'b787_9'] as const;
export type AircraftVariant = (typeof AIRCRAFT_VARIANTS)[number];
/** Public name of the aircraft dimension (alias of AircraftVariant). */
export type Aircraft = AircraftVariant;

export const FLIGHT_PHASES = ['takeoff', 'landing'] as const;
export type FlightPhase = (typeof FLIGHT_PHASES)[number];

export const RUNWAY_CONDITIONS = [
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
] as const;
export type RunwayCondition = (typeof RUNWAY_CONDITIONS)[number];

/**
 * ICAO Runway Condition Code (1–6). Each `RunwayCondition` maps to a
 * single RWYCC value per the FCOM landing/takeoff performance table:
 *   dry          → 6
 *   good         → 5
 *   mediumToGood → 4
 *   medium       → 3
 *   mediumToPoor → 2
 *   poor         → 1
 */
// eslint-disable-next-line no-magic-numbers
export type RunwayConditionCode = 1 | 2 | 3 | 4 | 5 | 6;

export const RWYCC: Readonly<Record<RunwayCondition, RunwayConditionCode>> = {
  dry: 6,
  good: 5,
  mediumToGood: 4,
  medium: 3,
  mediumToPoor: 2,
  poor: 1,
};
