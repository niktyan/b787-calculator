/**
 * zod schema for the bundled `b787-landing.json` resource.
 *
 * Spec: 02_Specification/04-domain-model.md § "Landing types",
 *       02_Specification/ADR/0014-landing-module-architecture.md,
 *       02_Specification/ADR/0018-landing-runway-condition-taxonomy-v2.md.
 *
 * Shape (schema 2.4.0 — ADR-0018):
 *
 *   {
 *     "schemaVersion": "2.4.0",
 *     "dataVersion":   "YYYY-MM-DD.NNN",
 *     "phase":         "landing",
 *     "adjustments":   { catIIIIICap, asymReversePenalty },
 *     "byAircraft":    { b787_8: AircraftEntry, b787_9: AircraftEntry }
 *   }
 *
 * Each `AircraftEntry` holds the per-aircraft `engineInopAutolandLimit`,
 * the 7×2 categorical lookup `baseTable[condition][mode]`, and authoring
 * metadata. Both aircraft entries are required in MVP — absence becomes
 * `DataNotAvailable.aircraft-not-implemented` at calculation time.
 *
 * Two-stage validation:
 *   1. Structural — handled by zod.
 *   2. Business-rule — `engineInopAutolandLimit > 0`,
 *      `adjustments.catIIIIICap > 0`, base-table integer-only.
 *      Surfaces as `CorruptedDataBundle`.
 */

import { z } from 'zod';

const SCHEMA_VERSION_PATTERN = /^2\.4\.\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CROSSWIND_KT = 50;
const MIN_CROSSWIND_KT = 0;

const flightPhaseSchema = z.enum(['takeoff', 'landing']);

const integerKtSchema = z.number().int().min(MIN_CROSSWIND_KT).max(MAX_CROSSWIND_KT);

const modeValueSchema = z.object({
  manual: integerKtSchema,
  auto: integerKtSchema,
});

const baseTableSchema = z
  .object({
    dry: modeValueSchema,
    goodWetDamp: modeValueSchema,
    goodSlushSnow: modeValueSchema,
    goodToMedium: modeValueSchema,
    medium: modeValueSchema,
    mediumToPoor: modeValueSchema,
    poor: modeValueSchema,
  })
  .strict();

const adjustmentsSchema = z.object({
  catIIIIICap: integerKtSchema,
  asymReversePenalty: integerKtSchema,
});

const metadataSchema = z.object({
  createdAt: z.string().datetime().or(z.string().regex(ISO_DATE_PATTERN)),
  validatedBy: z.string().min(1),
  referenceDocument: z.string().min(1),
  notes: z.string(),
});

const aircraftEntrySchema = z
  .object({
    engineInopAutolandLimit: integerKtSchema,
    baseTable: baseTableSchema,
    metadata: metadataSchema,
  })
  .strict();

export type CrosswindLandingAircraftEntry = z.infer<typeof aircraftEntrySchema>;

export const crosswindLandingDataFileSchema = z.object({
  schemaVersion: z.string().regex(SCHEMA_VERSION_PATTERN),
  dataVersion: z.string().min(1),
  phase: flightPhaseSchema,
  adjustments: adjustmentsSchema,
  byAircraft: z
    .object({
      b787_8: aircraftEntrySchema,
      b787_9: aircraftEntrySchema,
    })
    .strict(),
});

export type CrosswindLandingDataFile = z.infer<typeof crosswindLandingDataFileSchema>;

export interface BusinessRuleContext {
  readonly expectedPhase?: 'takeoff' | 'landing';
}

function checkPhase(data: CrosswindLandingDataFile, context: BusinessRuleContext): string | null {
  if (context.expectedPhase !== undefined && data.phase !== context.expectedPhase) {
    return `phase mismatch: expected ${context.expectedPhase}, got ${data.phase}`;
  }
  return null;
}

function checkAdjustments(data: CrosswindLandingDataFile): string | null {
  if (data.adjustments.catIIIIICap <= 0) {
    return 'adjustments.catIIIIICap must be positive';
  }
  if (data.adjustments.asymReversePenalty <= 0) {
    return 'adjustments.asymReversePenalty must be positive';
  }
  return null;
}

function checkAircraftEntry(
  aircraftKey: string,
  entry: CrosswindLandingAircraftEntry,
): string | null {
  if (entry.engineInopAutolandLimit <= 0) {
    return `byAircraft.${aircraftKey}.engineInopAutolandLimit must be positive`;
  }
  return null;
}

function checkAircraftEntries(data: CrosswindLandingDataFile): string | null {
  for (const [aircraftKey, entry] of Object.entries(data.byAircraft)) {
    const violation = checkAircraftEntry(aircraftKey, entry);
    if (violation !== null) return violation;
  }
  return null;
}

/**
 * Returns a description of the first business-rule violation, or null
 * if all rules pass. Caller wraps the description in
 * `CorruptedDataBundle`.
 */
export function checkBusinessRules(
  data: CrosswindLandingDataFile,
  context: BusinessRuleContext = {},
): string | null {
  return checkPhase(data, context) ?? checkAdjustments(data) ?? checkAircraftEntries(data);
}
