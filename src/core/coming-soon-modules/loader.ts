import { logger } from '../logger';

import bundled from './data.json';
import { comingSoonModulesSchema } from './types';
import type { ComingSoonModule } from './types';

let cached: readonly ComingSoonModule[] | null = null;

/**
 * Validates an arbitrary input against the modules schema and returns a frozen
 * list. Exposed (with `_` prefix) so tests can drive the validation-failure
 * branch with a hand-crafted bad payload — the bundled JSON is type-checked at
 * import, so the error path is otherwise unreachable.
 */
export function _parseModules(input: unknown): readonly ComingSoonModule[] {
  const parsed = comingSoonModulesSchema.safeParse(input);
  if (!parsed.success) {
    logger.error('comingSoonModules: schema validation failed', parsed.error.message);
    return Object.freeze([]);
  }
  return Object.freeze([...parsed.data]);
}

/**
 * Loads the bundled "coming soon" modules list, validating it once with zod
 * (per architecture principle: never trust JSON without schema validation).
 * Subsequent calls return the cached, frozen array.
 */
export function loadComingSoonModules(): readonly ComingSoonModule[] {
  if (cached !== null) {
    return cached;
  }
  cached = _parseModules(bundled);
  return cached;
}

/** Test-only helper to drop the cache so tests can re-load with a fresh JSON state. */
export function _resetCacheForTesting(): void {
  cached = null;
}
