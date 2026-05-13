import { logger } from '../logger';

import bundled from './data.json';
import { modulesSchema } from './types';
import type { InactiveModule, Module } from './types';

let cached: readonly Module[] | null = null;

/**
 * Validates an arbitrary input against the modules schema and returns a frozen
 * list. Exposed (with `_` prefix) so tests can drive the validation-failure
 * branch with a hand-crafted bad payload — the bundled JSON is type-checked at
 * import, so the error path is otherwise unreachable.
 */
export function _parseModules(input: unknown): readonly Module[] {
  const parsed = modulesSchema.safeParse(input);
  if (!parsed.success) {
    logger.error('modules: schema validation failed', parsed.error.message);
    return Object.freeze([]);
  }
  return Object.freeze([...parsed.data]);
}

/**
 * Loads the bundled modules list, validating it once with zod (per
 * architecture principle: never trust JSON without schema validation).
 * Subsequent calls return the cached, frozen array. Includes both active
 * feature modules and coming-soon teasers — the `active` discriminator
 * tells callers which is which.
 */
export function loadModules(): readonly Module[] {
  if (cached !== null) {
    return cached;
  }
  cached = _parseModules(bundled);
  return cached;
}

/** Coming-soon subset of `loadModules()` — for Main Menu teaser rendering. */
export function loadComingSoonModules(): readonly InactiveModule[] {
  return loadModules().filter((m): m is InactiveModule => !m.active);
}

/** Test-only helper to drop the cache so tests can re-load with a fresh JSON state. */
export function _resetCacheForTesting(): void {
  cached = null;
}
