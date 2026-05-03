/**
 * zod schema for bundled Crosswind reference-data files.
 *
 * Spec: 02_Specification/04-domain-model.md § "zod-схема валидации".
 *
 * Two-stage validation: structural (zod) + business rules
 * (ascending intercepts, sorted breakpoints, envelope sanity, non-zero
 * slope, file/aircraft consistency). Business-rule failures and zod
 * failures both surface as `CorruptedDataBundle` from the repository.
 */

import { z } from 'zod';

const SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BREAKPOINT_COUNT = 5;
const MAX_CROSSWIND_KT = 50;

const aircraftVariantSchema = z.enum(['b787_8', 'b787_9']);
const flightPhaseSchema = z.enum(['takeoff', 'landing']);
const runwayConditionSchema = z.enum(['dry', 'wet', 'contaminated']);

const breakpointSchema = z.object({
  crosswindKnots: z.number().int().min(0).max(MAX_CROSSWIND_KT),
  intercept: z.number().finite(),
});

export const crosswindDataFileSchema = z.object({
  schemaVersion: z.string().regex(SCHEMA_VERSION_PATTERN),
  dataVersion: z.string().min(1),
  aircraft: aircraftVariantSchema,
  phase: flightPhaseSchema,
  runwayCondition: runwayConditionSchema,
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
  interpolation: z.object({
    model: z.literal('piecewise-linear-excel-equivalent'),
    slope: z.number().finite(),
    breakpoints: z.array(breakpointSchema).length(BREAKPOINT_COUNT),
  }),
  fallback: z.object({
    belowEnvelope: z.literal('max-crosswind-40'),
    aboveEnvelope: z.literal('ifna-fallback-40-match-excel'),
  }),
  metadata: z.object({
    createdAt: z.string().datetime().or(z.string().regex(ISO_DATE_PATTERN)),
    validatedBy: z.string().min(1),
    referenceDocument: z.string().min(1),
    notes: z.string(),
  }),
});

export type CrosswindDataFile = z.infer<typeof crosswindDataFileSchema>;

export interface BusinessRuleContext {
  readonly expectedAircraft?: 'b787_8' | 'b787_9';
  readonly expectedPhase?: 'takeoff' | 'landing';
  readonly expectedRunwayCondition?: 'dry' | 'wet' | 'contaminated';
}

function checkEnvelopeAndSlope(data: CrosswindDataFile): string | null {
  const env = data.operationalEnvelope;
  if (env.weight.minTons >= env.weight.maxTons) {
    return 'operationalEnvelope.weight: minTons must be less than maxTons';
  }
  if (env.cg.minPercent >= env.cg.maxPercent) {
    return 'operationalEnvelope.cg: minPercent must be less than maxPercent';
  }
  if (data.interpolation.slope === 0) {
    return 'interpolation.slope must be non-zero';
  }
  return null;
}

function checkBreakpointOrdering(data: CrosswindDataFile): string | null {
  if (!isCrosswindSortedDescending(data.interpolation.breakpoints)) {
    return 'interpolation.breakpoints: crosswindKnots must descend (40, 35, 30, 25, 20)';
  }
  if (!isInterceptAscending(data.interpolation.breakpoints)) {
    return 'interpolation.breakpoints: intercept values must strictly ascend';
  }
  return null;
}

function checkContextMatch(data: CrosswindDataFile, context: BusinessRuleContext): string | null {
  if (context.expectedAircraft !== undefined && data.aircraft !== context.expectedAircraft) {
    return `aircraft mismatch: expected ${context.expectedAircraft}, got ${data.aircraft}`;
  }
  if (context.expectedPhase !== undefined && data.phase !== context.expectedPhase) {
    return `phase mismatch: expected ${context.expectedPhase}, got ${data.phase}`;
  }
  if (
    context.expectedRunwayCondition !== undefined &&
    data.runwayCondition !== context.expectedRunwayCondition
  ) {
    return `runwayCondition mismatch: expected ${context.expectedRunwayCondition}, got ${data.runwayCondition}`;
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
  return (
    checkEnvelopeAndSlope(data) ?? checkBreakpointOrdering(data) ?? checkContextMatch(data, context)
  );
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
