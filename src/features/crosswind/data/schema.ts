/**
 * zod schema for the bundled Crosswind reference-data file.
 *
 * Spec: 02_Specification/04-domain-model.md § "zod-схема валидации".
 *
 * Shape (Block 2 / takeoff rebrand): a single per-phase file, with
 * lookup data nested under `byAircraft[aircraft][runwayCondition]`.
 * Aircraft entries that have no operational data simply omit the
 * corresponding key — the calculator surfaces this as
 * `DataNotAvailable` with reason `aircraft-not-implemented` /
 * `condition-not-implemented`.
 *
 * Two-stage validation: structural (zod) + business rules
 * (ascending intercepts, sorted breakpoints, envelope sanity, non-zero
 * slope, file/phase consistency). Both surface as `CorruptedDataBundle`.
 */

import { z } from 'zod';

const SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BREAKPOINT_COUNT = 5;
const MAX_CROSSWIND_KT = 50;

const flightPhaseSchema = z.enum(['takeoff', 'landing']);
const runwayConditionSchema = z.enum(['dry', 'wet', 'contaminated']);

const breakpointSchema = z.object({
  crosswindKnots: z.number().int().min(0).max(MAX_CROSSWIND_KT),
  intercept: z.number().finite(),
});

const interpolationSchema = z.object({
  model: z.literal('piecewise-linear-excel-equivalent'),
  slope: z.number().finite(),
  breakpoints: z.array(breakpointSchema).length(BREAKPOINT_COUNT),
});

const fallbackSchema = z.object({
  belowEnvelope: z.literal('max-crosswind-40'),
  aboveEnvelope: z.literal('ifna-fallback-40-match-excel'),
});

const datasetMetadataSchema = z.object({
  createdAt: z.string().datetime().or(z.string().regex(ISO_DATE_PATTERN)),
  validatedBy: z.string().min(1),
  referenceDocument: z.string().min(1),
  notes: z.string(),
});

const datasetSchema = z.object({
  interpolation: interpolationSchema,
  fallback: fallbackSchema,
  metadata: datasetMetadataSchema,
});

export type CrosswindDataset = z.infer<typeof datasetSchema>;

const aircraftEntrySchema = z
  .object({
    dry: datasetSchema.optional(),
    wet: datasetSchema.optional(),
    contaminated: datasetSchema.optional(),
  })
  .strict();

export type AircraftEntry = z.infer<typeof aircraftEntrySchema>;

export const crosswindDataFileSchema = z.object({
  schemaVersion: z.string().regex(SCHEMA_VERSION_PATTERN),
  dataVersion: z.string().min(1),
  phase: flightPhaseSchema,
  operationalEnvelope: z.object({
    weight: z.object({
      minTons: z.number().positive(),
      maxTons: z.number().positive(),
    }),
    cg: z.object({
      minPercent: z.number(),
      maxPercent: z.number(),
    }),
  }),
  weightConversion: z.object({
    tonsToKilolbsFactor: z.number().positive(),
  }),
  byAircraft: z
    .object({
      b787_8: aircraftEntrySchema.optional(),
      b787_9: aircraftEntrySchema.optional(),
    })
    .strict(),
});

export type CrosswindDataFile = z.infer<typeof crosswindDataFileSchema>;

export interface BusinessRuleContext {
  readonly expectedPhase?: 'takeoff' | 'landing';
}

function checkEnvelope(data: CrosswindDataFile): string | null {
  const env = data.operationalEnvelope;
  if (env.weight.minTons >= env.weight.maxTons) {
    return 'operationalEnvelope.weight: minTons must be less than maxTons';
  }
  if (env.cg.minPercent >= env.cg.maxPercent) {
    return 'operationalEnvelope.cg: minPercent must be less than maxPercent';
  }
  return null;
}

function checkDatasetIntegrity(data: CrosswindDataFile): string | null {
  for (const [aircraftKey, entry] of Object.entries(data.byAircraft)) {
    if (entry === undefined) continue;
    for (const [conditionKey, dataset] of Object.entries(entry)) {
      if (dataset === undefined) continue;
      if (dataset.interpolation.slope === 0) {
        return `byAircraft.${aircraftKey}.${conditionKey}.interpolation.slope must be non-zero`;
      }
      if (!isCrosswindSortedDescending(dataset.interpolation.breakpoints)) {
        return `byAircraft.${aircraftKey}.${conditionKey}.interpolation.breakpoints: crosswindKnots must descend (40, 35, 30, 25, 20)`;
      }
      if (!isInterceptAscending(dataset.interpolation.breakpoints)) {
        return `byAircraft.${aircraftKey}.${conditionKey}.interpolation.breakpoints: intercept values must strictly ascend`;
      }
    }
  }
  return null;
}

function checkContextMatch(data: CrosswindDataFile, context: BusinessRuleContext): string | null {
  if (context.expectedPhase !== undefined && data.phase !== context.expectedPhase) {
    return `phase mismatch: expected ${context.expectedPhase}, got ${data.phase}`;
  }
  return null;
}

/**
 * Returns a description of the first business-rule violation, or null
 * if all rules pass. Caller wraps the description in
 * `CorruptedDataBundle`.
 */
export function checkBusinessRules(
  data: CrosswindDataFile,
  context: BusinessRuleContext = {},
): string | null {
  return checkEnvelope(data) ?? checkDatasetIntegrity(data) ?? checkContextMatch(data, context);
}

function isCrosswindSortedDescending(
  breakpoints: readonly { readonly crosswindKnots: number }[],
): boolean {
  for (let i = 1; i < breakpoints.length; i += 1) {
    const prev = breakpoints[i - 1];
    const curr = breakpoints[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    if (curr.crosswindKnots >= prev.crosswindKnots) {
      return false;
    }
  }
  return true;
}

function isInterceptAscending(breakpoints: readonly { readonly intercept: number }[]): boolean {
  for (let i = 1; i < breakpoints.length; i += 1) {
    const prev = breakpoints[i - 1];
    const curr = breakpoints[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    if (curr.intercept <= prev.intercept) {
      return false;
    }
  }
  return true;
}

export { runwayConditionSchema };
