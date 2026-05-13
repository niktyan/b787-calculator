import { z } from 'zod';

/**
 * Module visibility preference — user-controlled per-module hide/show.
 *
 * Stored under storage key `moduleVisibility` as a flat `Record<id, bool>`.
 * Defaults to all-visible; absence of a key means "visible" so legacy
 * installs and new modules added in a future release surface in the Main
 * Menu unless the user explicitly hides them. See `02_Specification/06-ui-spec.md`
 * § Экран 5 «Modules» + § Экран 3 «Main Menu».
 */

export const moduleVisibilitySchema = z.record(z.string(), z.boolean());
export type ModuleVisibility = z.infer<typeof moduleVisibilitySchema>;

/**
 * Default for module visibility: an empty record. Consumers treat missing
 * IDs as `true` (visible), so the default of "no entries" is functionally
 * "all visible". Recorded entries are only ever written when the user
 * actively toggles a module.
 */
export const DEFAULT_MODULE_VISIBILITY: ModuleVisibility = {};

/** Pure helper: is the given module visible under the current preference? */
export function isModuleVisible(visibility: ModuleVisibility, moduleId: string): boolean {
  return visibility[moduleId] !== false;
}

/** Pure helper: toggle the entry for a single module. */
export function toggleModuleVisibility(
  visibility: ModuleVisibility,
  moduleId: string,
): ModuleVisibility {
  const current = isModuleVisible(visibility, moduleId);
  return { ...visibility, [moduleId]: !current };
}
