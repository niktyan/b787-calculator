/**
 * Repository wrapping the bundled `b787-landing.json` resource.
 *
 * Spec: 02_Specification/04-domain-model.md (Fail-safe),
 *       02_Specification/ADR/0014-landing-module-architecture.md.
 *
 * Mirrors the takeoff repository surface:
 *   • two failure surfaces, both via `Result.err({ kind:
 *     'CorruptedDataBundle' })` — structural (zod) and business-rule.
 *   • validated payloads are memoized so repeated `load()` calls return
 *     the same Result instance without re-running zod.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';

import b787LandingJson from './b787-landing.json';
import { checkBusinessRules, crosswindLandingDataFileSchema } from './schema';
import type { BusinessRuleContext, CrosswindLandingDataFile } from './schema';

export type CrosswindLandingRepositoryError = {
  readonly kind: 'CorruptedDataBundle';
  readonly details: string;
};

export interface CrosswindLandingRepository {
  load(): Result<CrosswindLandingDataFile, CrosswindLandingRepositoryError>;
}

export interface CrosswindLandingRepositoryOptions {
  readonly raw?: unknown;
  readonly context?: BusinessRuleContext;
}

const DEFAULT_CONTEXT: BusinessRuleContext = {
  expectedPhase: 'landing',
};

export function createCrosswindLandingRepository(
  options?: CrosswindLandingRepositoryOptions,
): CrosswindLandingRepository {
  const raw = options?.raw ?? b787LandingJson;
  const context = options?.context ?? DEFAULT_CONTEXT;
  let cached: Result<CrosswindLandingDataFile, CrosswindLandingRepositoryError> | null = null;

  return {
    load(): Result<CrosswindLandingDataFile, CrosswindLandingRepositoryError> {
      if (cached !== null) {
        return cached;
      }
      const parsed = crosswindLandingDataFileSchema.safeParse(raw);
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
