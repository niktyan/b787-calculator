/**
 * Repository wrapping the bundled `b787-takeoff.json` resource.
 *
 * Spec: 02_Specification/04-domain-model.md (Fail-safe), ADR-0003.
 *
 * Two failure surfaces, both via Result.err({ kind: 'CorruptedDataBundle' }):
 *   • zod schema mismatch (structural)
 *   • business-rule violation (envelope sanity, slope=0, breakpoint
 *     ordering, file/phase consistency)
 *
 * Validated payloads are memoized — repeated `load()` calls return the
 * same parsed object without re-running zod.
 */

import { err, ok } from '../../../core/result';
import type { Result } from '../../../core/result';
import type { AircraftVariant, OperationalEnvelope } from '../domain/types';

import b787TakeoffJson from './b787-takeoff.json';
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
  expectedPhase: 'takeoff',
};

/**
 * Returns the `OperationalEnvelope` for the requested aircraft from a
 * parsed data file, or `null` when the file does not ship an entry for
 * that variant (ADR-0013 — envelope lives per-aircraft).
 *
 * The view-model treats `null` as `aircraft-not-implemented` (the same
 * signal the algorithm raises when `resolveStrategy` cannot find an
 * `aircraftEntry`), so field-level envelope validation falls through
 * to the data-not-available state without rendering a misleading
 * per-field error.
 */
export function resolveOperationalEnvelope(
  data: CrosswindDataFile,
  aircraft: AircraftVariant,
): OperationalEnvelope | null {
  const entry = data.byAircraft[aircraft];
  if (entry === undefined) return null;
  return entry.operationalEnvelope;
}

export function createCrosswindRepository(
  options?: CrosswindRepositoryOptions,
): CrosswindRepository {
  const raw = options?.raw ?? b787TakeoffJson;
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
