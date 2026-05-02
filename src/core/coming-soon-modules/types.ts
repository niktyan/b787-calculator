import { z } from 'zod';

/**
 * Schema for a "coming soon" module entry in `data.json`.
 *
 * Per ADR-0004, the JSON contains only inactive teasers — active feature
 * modules live under `src/features/*` and are surfaced separately in the
 * Main Menu. Every entry here is, by construction, a coming-soon teaser.
 */
export const comingSoonModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  phase: z.string().min(1),
});

export const comingSoonModulesSchema = z.array(comingSoonModuleSchema);

export type ComingSoonModule = z.infer<typeof comingSoonModuleSchema>;
