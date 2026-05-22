/**
 * zod schema for the bundled Crosswind reference-data file.
 *
 * Spec: 02_Specification/04-domain-model.md § "zod-схема валидации",
 *       02_Specification/05-crosswind-algorithm.md § "Strategy variants",
 *       02_Specification/ADR/0013-per-aircraft-operational-envelope.md.
 *
 * Shape (Sprint B / schema 2.3.0 — ADR-0013): `operationalEnvelope`
 * lives **per aircraft** inside `byAircraft.<variant>` instead of at the
 * top level. Each FCOM-certified variant carries its own bounds (B787-9
 * differs from B787-8 in both weight and CG limits), so a top-level
 * envelope would either falsely admit out-of-spec input for one variant
 * or falsely reject the other. Per-aircraft is the only safety-correct
 * shape.
 *
 * Two-stage validation: structural (zod) + business rules (per-aircraft
 * envelope sanity, ascending intercepts, sorted brackets, non-zero
 * slope, file/phase consistency). Both surface as `CorruptedDataBundle`.
 */

import { z } from 'zod';

// Schema 2.3.0 — ADR-0013: per-aircraft operational envelope.
// The regex is strict (^2\.3\.\d+$) so legacy 2.2.x files (with top-
// level envelope) fail loudly at parse time instead of silently
// loading with no envelope check applied.
const SCHEMA_VERSION_PATTERN = /^2\.3\.\d+$/;
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

// --- Active strategy: cgOnlyPiecewise (PR 6) ---

const cgOnlyPiecewiseParamsSchema = z.object({
  plateauValue: z.number().finite().positive(),
  cgThreshold: z.number().finite().positive(),
  slopeDivisor: z.number().finite(),
  decimals: z.union([z.literal(DECIMALS_INTEGER), z.literal(DECIMALS_ONE)]),
});

const cgOnlyPiecewiseDatasetSchema = z.object({
  strategyType: z.literal('cgOnlyPiecewise'),
  params: cgOnlyPiecewiseParamsSchema,
});

// --- Active strategy: constant (PR 7) ---

const constantParamsSchema = z.object({
  value: z.number().finite().positive(),
});

const constantDatasetSchema = z.object({
  strategyType: z.literal('constant'),
  params: constantParamsSchema,
});

// --- Future strategy (PR 8): declared as a stub branch that rejects
// all current data. Keeps the discriminated union exhaustive so
// adding the remaining strategyType literal in PR 8 is purely additive. ---

const futureNeverParamsSchema = z.object({}).strict();
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
export type CGOnlyPiecewiseDataset = z.infer<typeof cgOnlyPiecewiseDatasetSchema> & {
  readonly metadata: z.infer<typeof datasetMetadataSchema>;
};
export type ConstantDataset = z.infer<typeof constantDatasetSchema> & {
  readonly metadata: z.infer<typeof datasetMetadataSchema>;
};

const operationalEnvelopeSchema = z.object({
  weight: z.object({
    minTons: z.number().positive(),
    maxTons: z.number().positive(),
  }),
  cg: z.object({
    minPercent: z.number(),
    maxPercent: z.number(),
  }),
});

const aircraftEntrySchema = z
  .object({
    operationalEnvelope: operationalEnvelopeSchema,
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

function checkEnvelope(path: string, entry: AircraftEntry): string | null {
  const env = entry.operationalEnvelope;
  if (env.weight.minTons >= env.weight.maxTons) {
    return `${path}.operationalEnvelope.weight: minTons must be less than maxTons`;
  }
  if (env.cg.minPercent >= env.cg.maxPercent) {
    return `${path}.operationalEnvelope.cg: minPercent must be less than maxPercent`;
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

function checkCGOnlyPiecewiseIntegrity(
  path: string,
  dataset: CGOnlyPiecewiseDataset,
): string | null {
  if (dataset.params.slopeDivisor === 0) {
    return `${path}.params.slopeDivisor must be non-zero`;
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

function checkConstantIntegrity(path: string, dataset: ConstantDataset): string | null {
  // The schema-level `.positive()` constraint already rejects
  // value ≤ 0, but the integrity check is kept for symmetry with
  // the other strategy integrity functions and as a stable place
  // for future business-rule additions (e.g., max-allowed-value
  // sanity bound).
  if (dataset.params.value <= 0) {
    return `${path}.params.value must be positive`;
  }
  return null;
}

function checkOneDataset(path: string, dataset: CrosswindDataset): string | null {
  // Strategy-typed dispatch. Future strategy (notAllowed) will get
  // its case here when PR 8 lights it up; the schema rejects it at
  // parse-time so reaching this function for that discriminator
  // value is currently unreachable.
  if (dataset.strategyType === 'bracketedLinear') {
    return checkBracketedLinearIntegrity(path, dataset);
  }
  if (dataset.strategyType === 'variableSlopeBracketed') {
    return checkVariableSlopeBracketedIntegrity(path, dataset);
  }
  if (dataset.strategyType === 'cgOnlyPiecewise') {
    return checkCGOnlyPiecewiseIntegrity(path, dataset);
  }
  if (dataset.strategyType === 'constant') {
    return checkConstantIntegrity(path, dataset);
  }
  return null;
}

function checkAircraftEntry(aircraftKey: string, entry: AircraftEntry): string | null {
  const basePath = `byAircraft.${aircraftKey}`;
  const envelopeViolation = checkEnvelope(basePath, entry);
  if (envelopeViolation !== null) return envelopeViolation;
  for (const [conditionKey, dataset] of Object.entries(entry)) {
    if (conditionKey === 'operationalEnvelope') continue;
    if (dataset === undefined) continue;
    const violation = checkOneDataset(`${basePath}.${conditionKey}`, dataset as CrosswindDataset);
    if (violation !== null) return violation;
  }
  return null;
}

function checkAircraftEntries(data: CrosswindDataFile): string | null {
  for (const [aircraftKey, entry] of Object.entries(data.byAircraft)) {
    if (entry === undefined) continue;
    const violation = checkAircraftEntry(aircraftKey, entry);
    if (violation !== null) return violation;
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
  return checkAircraftEntries(data) ?? checkContextMatch(data, context);
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
