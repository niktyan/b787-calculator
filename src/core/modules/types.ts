import { z } from 'zod';

/**
 * Schema for a single module entry in `data.json`. Discriminated by
 * `active`: live modules (`active: true`) carry a `route` for navigation;
 * coming-soon teasers (`active: false`) carry a `description` and a
 * roadmap-phase label rendered on the Main Menu card. Both surface
 * through `useModuleVisibility` so the user can hide either kind from
 * the Main Menu (см. `02_Specification/06-ui-spec.md` § Экран 5
 * "Modules" + § Экран 3 «Main Menu»).
 *
 * Pre-Sprint-6-follow-up this submodule lived at `core/coming-soon-modules`
 * and listed only inactive teasers. The active card was hardcoded in
 * `src/app/(main)/menu.tsx`. Folder rename + active-module entry land
 * together so the visibility toggles in Settings have a single source
 * of truth for "what modules exist".
 */

const baseModuleShape = {
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
};

export const activeModuleSchema = z.object({
  ...baseModuleShape,
  active: z.literal(true),
  route: z.string().min(1),
});

export const inactiveModuleSchema = z.object({
  ...baseModuleShape,
  active: z.literal(false),
  description: z.string().min(1),
  phase: z.string().min(1),
});

export const moduleSchema = z.discriminatedUnion('active', [
  activeModuleSchema,
  inactiveModuleSchema,
]);

export const modulesSchema = z.array(moduleSchema);

export type ActiveModule = z.infer<typeof activeModuleSchema>;
export type InactiveModule = z.infer<typeof inactiveModuleSchema>;
export type Module = z.infer<typeof moduleSchema>;

/**
 * Subset compatible with the pre-rename `ComingSoonModule` shape — kept
 * as a named alias so existing consumers of the coming-soon list type
 * (e.g. the Coming Soon modal) can keep importing through the same name.
 */
export type ComingSoonModule = InactiveModule;
