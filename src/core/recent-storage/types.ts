/**
 * Recent-calculations storage schema (ADR-0016).
 *
 * Pure TypeScript + zod — no React, no React Native. Safe to import
 * from any layer of any feature.
 *
 * The persisted shape is a single object:
 *
 *   { schemaVersion: 1, entries: ReadonlyArray<RecentEntry> }
 *
 * `RecentEntry` is a discriminated union by `module` so the storage
 * layer never has to look at the actual feature internals. The Recent
 * screen renders each variant; the originating calculator screen
 * restores inputs from the matching variant. A future calculator
 * module would add a new branch to the union (and the storage layer
 * would need a migration if the existing variants change).
 */

import { z } from 'zod';

import { AIRCRAFT_VARIANTS, LANDING_RUNWAY_CONDITIONS, RUNWAY_CONDITIONS } from '../aviation';

const aircraftVariantSchema = z.enum(AIRCRAFT_VARIANTS);
const runwayConditionSchema = z.enum(RUNWAY_CONDITIONS);

/**
 * Landing-runway-condition values accepted by the Recent storage layer.
 * Accepts the current 7-value taxonomy (ADR-0018) plus the two legacy
 * keys (`good`, `mediumToGood`) shipped by Sprint C so persisted entries
 * created before the v2 schema bump continue to deserialize and surface
 * in the Recent list (as `Good (legacy)` / `Medium to Good (legacy)`).
 * The legacy values are never produced by current code — they only flow
 * in from older AsyncStorage payloads.
 */
const landingRunwayConditionPersistedSchema = z.enum([
  ...LANDING_RUNWAY_CONDITIONS,
  'good',
  'mediumToGood',
]);

export const RECENT_SCHEMA_VERSION = 1;
export const RECENT_MAX_ENTRIES = 20;

export const recentTakeoffInputsSchema = z.object({
  aircraft: aircraftVariantSchema,
  weightTons: z.number().finite(),
  cgPercent: z.number().finite(),
  runwayCondition: runwayConditionSchema,
});

export const landingModeSchema = z.enum(['manual', 'auto']);
export const yesNoSchema = z.enum(['no', 'yes']);

export const recentLandingInputsSchema = z.object({
  aircraft: aircraftVariantSchema,
  runwayCondition: landingRunwayConditionPersistedSchema,
  landingMode: landingModeSchema,
  asymReverse: yesNoSchema,
  catIIIII: yesNoSchema,
  engineInop: yesNoSchema,
});

const recentEntryBase = {
  id: z.string().min(1),
  timestamp: z.string().min(1),
  result: z.number().int().nonnegative(),
  fingerprint: z.string().min(1),
};

export const recentTakeoffEntrySchema = z.object({
  ...recentEntryBase,
  module: z.literal('takeoff'),
  inputs: recentTakeoffInputsSchema,
});

export const recentLandingEntrySchema = z.object({
  ...recentEntryBase,
  module: z.literal('landing'),
  inputs: recentLandingInputsSchema,
});

export const recentEntrySchema = z.discriminatedUnion('module', [
  recentTakeoffEntrySchema,
  recentLandingEntrySchema,
]);

export const recentStorageFileSchema = z.object({
  schemaVersion: z.literal(RECENT_SCHEMA_VERSION),
  entries: z.array(recentEntrySchema),
});

export type RecentTakeoffInputs = z.infer<typeof recentTakeoffInputsSchema>;
export type RecentLandingInputs = z.infer<typeof recentLandingInputsSchema>;
export type RecentTakeoffEntry = z.infer<typeof recentTakeoffEntrySchema>;
export type RecentLandingEntry = z.infer<typeof recentLandingEntrySchema>;
export type RecentEntry = z.infer<typeof recentEntrySchema>;
export type RecentStorageFile = z.infer<typeof recentStorageFileSchema>;

/**
 * Stable JSON serialisation of `{module, inputs}` used as the dedupe
 * key. Same fingerprint means same calculation → the existing entry is
 * removed and the new one is inserted at the head (refreshed
 * timestamp) instead of accumulating duplicates.
 *
 * Inputs are normalised to a canonical key order before serialisation
 * so a future field reordering at the call site cannot accidentally
 * break dedupe.
 */
export function computeFingerprint(
  module: RecentEntry['module'],
  inputs: RecentEntry['inputs'],
): string {
  const canonical: Record<string, unknown> = {};
  for (const key of Object.keys(inputs).sort()) {
    canonical[key] = (inputs as Record<string, unknown>)[key];
  }
  return JSON.stringify({ module, inputs: canonical });
}
