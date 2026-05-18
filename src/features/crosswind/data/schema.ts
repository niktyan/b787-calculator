/**
 * zod schema for the bundled Crosswind reference-data file.
 *
 * Spec: 02_Specification/04-domain-model.md § "zod-схема валидации",
 *       02_Specification/05-crosswind-algorithm.md § "Strategy variants".
 *
 * Shape (PR 1 / strategy refactor): per-(aircraft, runwayCondition)
 * dataset carries a `strategyType` discriminator and a `params` object
 * shaped per that strategy. PR 1 activates only the `bracketedLinear`
 * branch — Dry data. Future PR 5/6/7/8 light up the remaining 4
 * `strategyType` literals; their schemas are declared as stubs so the
 * discriminator is exhaustive but they reject all current data.
 *
 * Two-stage validation: structural (zod) + business rules (ascending
 * intercepts, sorted brackets, envelope sanity, non-zero slope,
 * file/phase consistency). Both surface as `CorruptedDataBundle`.
 */

import { z } from 'zod';

const SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// schemaVersion 2.2.0 (PR 3): variable bracket count, lower bound = 2.
// Per spec § "Стратегия эволюции / Уровень 2 — Добавление breakpoints".
// Dry retains 5; Good adds 6th bracket at crosswindKnots=15.
const MIN_BRACKET_COUNT = 2;
const MAX_CROSSWIND_KT = 50;
const MIN_CROSSWIND_KT = 0;
const DECIMALS_INTEGER = 0;
const DECIMALS_ONE = 1;

const flightPhaseSchema = z.enum(['takeoff', 'landing']);
const runwayConditionSchema = z.enum([
  'dry',
  'good',
  'mediumToGood',
  'medium',
  'mediumToPoor',
  'poor',
]);

const bracketSchema = z.object({
  crosswindKnots: z.number().int().min(MIN_CROSSWIND_KT).max(MAX_CROSSWIND_KT),
  intercept: z.number().finite(),
});

// --- Active strategy: bracketedLinear (PR 1) ---

const bracketedLinearParamsSchema = z.object({
  brackets: z.array(bracketSchema).min(MIN_BRACKET_COUNT),
  slope: z.number().finite(),
  maxCap: z.number().finite().nullable(),
  decimals: z.union([z.literal(DECIMALS_INTEGER), z.literal(DECIMALS_ONE)]),
});

const bracketedLinearDatasetSchema = z.object({
  strategyType: z.literal('bracketedLinear'),
  params: bracketedLinearParamsSchema,
});

// --- Active strategy: variableSlopeBracketed (PR 5) ---

const variableSlopeBracketSchema = z.object({
  crosswindKnots: z.number().int().min(MIN_CROSSWIND_KT).max(MAX_CROSSWIND_KT),
  slope: z.number().finite(),
  intercept: z.number().finite(),
});

const variableSlopeBracketedParamsSchema = z.object({
  brackets: z.array(variableSlopeBracketSchema).min(MIN_BRACKET_COUNT),
  maxCap: z.number().finite().nullable(),
  decimals: z.union([z.literal(DECIMALS_INTEGER), z.literal(DECIMALS_ONE)]),
});

const variableSlopeBracketedDatasetSchema = z.object({
  strategyType: z.literal('variableSlopeBracketed'),
  params: variableSlopeBracketedParamsSchema,
});

// --- Future strategies (PR 6/7/8): declared as stub branches that
// reject all current data. These keep the discriminated union exhaustive
// so adding new strategyType literals in future PRs is purely additive. ---

const futureNeverParamsSchema = z.object({}).strict();
const cgOnlyPiecewiseDatasetSchema = z.object({
  strategyType: z.literal('cgOnlyPiecewise'),
  params: futureNeverParamsSchema,
});
const constantDatasetSchema = z.object({
  strategyType: z.literal('constant'),
  params: futureNeverParamsSchema,
});
const notAllowedDatasetSchema = z.object({
  strategyType: z.literal('notAllowed'),
  params: futureNeverParamsSchema,
});

const datasetMetadataSchema = z.object({
  createdAt: z.string().datetime().or(z.string().regex(ISO_DATE_PATTERN)),
  validatedBy: z.string().min(1),
  referenceDocument: z.string().min(1),
  notes: z.string(),
});

const strategyDiscriminatedSchema = z.discriminatedUnion('strategyType', [
  bracketedLinearDatasetSchema,
  variableSlopeBracketedDatasetSchema,
  cgOnlyPiecewiseDatasetSchema,
  constantDatasetSchema,
  notAllowedDatasetSchema,
]);

const datasetSchema = z.intersection(
  strategyDiscriminatedSchema,
  z.object({ metadata: datasetMetadataSchema }),
);

export type CrosswindDataset = z.infer<typeof datasetSchema>;
export type BracketedLinearDataset = z.infer<typeof bracketedLinearDatasetSchema> & {
  readonly metadata: z.infer<typeof datasetMetadataSchema>;
};
export type VariableSlopeBracketedDataset = z.infer<typeof variableSlopeBracketedDatasetSchema> & {
  readonly metadata: z.infer<typeof datasetMetadataSchema>;
};

const aircraftEntrySchema = z
  .object({
    dry: datasetSchema.optional(),
    good: datasetSchema.optional(),
    mediumToGood: datasetSchema.optional(),
    medium: datasetSchema.optional(),
    mediumToPoor: datasetSchema.optional(),
    poor: datasetSchema.optional(),
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

function checkBracketedLinearIntegrity(
  path: string,
  dataset: BracketedLinearDataset,
): string | null {
  if (dataset.params.slope === 0) {
    return `${path}.params.slope must be non-zero`;
  }
  if (!isCrosswindSortedDescending(dataset.params.brackets)) {
    return `${path}.params.brackets: crosswindKnots must descend (40, 35, 30, 25, 20)`;
  }
  if (!isInterceptAscending(dataset.params.brackets)) {
    return `${path}.params.brackets: intercept values must strictly ascend`;
  }
  return null;
}

function checkVariableSlopeBracketedIntegrity(
  path: string,
  dataset: VariableSlopeBracketedDataset,
): string | null {
  for (let i = 0; i < dataset.params.brackets.length; i += 1) {
    const bracket = dataset.params.brackets[i];
    if (bracket !== undefined && bracket.slope === 0) {
      return `${path}.params.brackets[${i}].slope must be non-zero`;
    }
  }
  if (!isCrosswindSortedDescending(dataset.params.brackets)) {
    return `${path}.params.brackets: crosswindKnots must descend (e.g. 25, 20, 15, 10)`;
  }
  if (!isInterceptAscending(dataset.params.brackets)) {
    return `${path}.params.brackets: intercept values must strictly ascend`;
  }
  return null;
}

function checkDatasetIntegrity(data: CrosswindDataFile): string | null {
  for (const [aircraftKey, entry] of Object.entries(data.byAircraft)) {
    if (entry === undefined) continue;
    for (const [conditionKey, dataset] of Object.entries(entry)) {
      if (dataset === undefined) continue;
      const path = `byAircraft.${aircraftKey}.${conditionKey}`;
      if (dataset.strategyType === 'bracketedLinear') {
        const violation = checkBracketedLinearIntegrity(path, dataset);
        if (violation !== null) return violation;
      } else if (dataset.strategyType === 'variableSlopeBracketed') {
        const violation = checkVariableSlopeBracketedIntegrity(path, dataset);
        if (violation !== null) return violation;
      }
      // Future strategies will gain their own integrity checks when
      // PR 6/7/8 light them up; for now the schema rejects them at
      // parse-time so we cannot reach here.
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
  brackets: readonly { readonly crosswindKnots: number }[],
): boolean {
  for (let i = 1; i < brackets.length; i += 1) {
    const prev = brackets[i - 1];
    const curr = brackets[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    if (curr.crosswindKnots >= prev.crosswindKnots) {
      return false;
    }
  }
  return true;
}

function isInterceptAscending(brackets: readonly { readonly intercept: number }[]): boolean {
  for (let i = 1; i < brackets.length; i += 1) {
    const prev = brackets[i - 1];
    const curr = brackets[i];
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
