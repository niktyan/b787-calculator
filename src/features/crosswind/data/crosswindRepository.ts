/**
 * Repository wrapping the bundled `b787-8-landing-dry.json` resource.
 *
 * Spec: 02_Specification/04-domain-model.md (Fail-safe), ADR-0003.
 *
 * Two failure surfaces, both via Result.err({ kind: 'CorruptedDataBundle' }):
 *   • zod schema mismatch (structural)
 *   • business-rule violation (envelope sanity, slope=0, breakpoint
 *     ordering, file/aircraft consistency)
 *
 * Validated payloads are memoized — repeated `load()` calls return the
 * same parsed object without re-running zod.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import b787_8LandingDryJson from './b787-8-landing-dry.json';
import { checkBusinessRules, crosswindDataFileSchema } from './schema';
import type { BusinessRuleContext, CrosswindDataFile } from './schema';

export type CrosswindRepositoryError = {
  readonly kind: 'CorruptedDataBundle';
  readonly details: string;
};

export interface CrosswindRepository {
  load(): Result<CrosswindDataFile, CrosswindRepositoryError>;
}

export interface CrosswindRepositoryOptions {
  readonly raw: unknown;
  readonly context?: BusinessRuleContext;
}

const DEFAULT_CONTEXT: BusinessRuleContext = {
  expectedAircraft: 'b787_8',
  expectedPhase: 'landing',
  expectedRunwayCondition: 'dry',
};

export function createCrosswindRepository(
  options?: CrosswindRepositoryOptions,
): CrosswindRepository {
  const raw = options?.raw ?? b787_8LandingDryJson;
  const context = options?.context ?? DEFAULT_CONTEXT;
  let cached: Result<CrosswindDataFile, CrosswindRepositoryError> | null = null;

  return {
    load(): Result<CrosswindDataFile, CrosswindRepositoryError> {
      if (cached !== null) {
        return cached;
      }
      const parsed = crosswindDataFileSchema.safeParse(raw);
      if (!parsed.success) {
        cached = err({
          kind: 'CorruptedDataBundle',
          details: `schema validation failed: ${parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')}`,
        });
        return cached;
      }
      const ruleViolation = checkBusinessRules(parsed.data, context);
      if (ruleViolation !== null) {
        cached = err({ kind: 'CorruptedDataBundle', details: ruleViolation });
        return cached;
      }
      cached = ok(parsed.data);
      return cached;
    },
  };
}
