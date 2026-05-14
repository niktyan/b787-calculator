import { z } from 'zod';

import { moduleVisibilitySchema } from '../modules/visibility';
import type { ModuleVisibility } from '../modules/visibility';

import type { StorageKey } from './keys';

export const disclaimerAcceptedSchema = z.boolean();
export const languageSchema = z.enum(['en', 'ru']);
export const themeSchema = z.enum(['auto', 'light', 'dark']);

export type DisclaimerAccepted = z.infer<typeof disclaimerAcceptedSchema>;
export type Language = z.infer<typeof languageSchema>;
export type ThemeMode = z.infer<typeof themeSchema>;

export interface StorageValueMap {
  disclaimerAccepted: DisclaimerAccepted;
  language: Language;
  theme: ThemeMode;
  moduleVisibility: ModuleVisibility;
}

export const SCHEMAS: { [K in StorageKey]: z.ZodType<StorageValueMap[K]> } = {
  disclaimerAccepted: disclaimerAcceptedSchema,
  language: languageSchema,
  theme: themeSchema,
  moduleVisibility: moduleVisibilitySchema,
};
