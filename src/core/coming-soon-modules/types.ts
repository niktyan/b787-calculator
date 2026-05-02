import { z } from 'zod';

export const comingSoonModuleSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
  phase: z.string().min(1).nullable(),
});

export const comingSoonModulesSchema = z.array(comingSoonModuleSchema);

export type ComingSoonModule = z.infer<typeof comingSoonModuleSchema>;
