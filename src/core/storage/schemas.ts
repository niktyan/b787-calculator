import { z } from 'zod';

import type { StorageKey } from './keys';

export const disclaimerAcceptedSchema = z.boolean();
export const languageSchema = z.enum(['en', 'ru']);
export const themeSchema = z.enum(['auto', 'light', 'dark']);
export const showDataSourceOnResultSchema = z.boolean();

export type DisclaimerAccepted = z.infer<typeof disclaimerAcceptedSchema>;
export type Language = z.infer<typeof languageSchema>;
export type ThemeMode = z.infer<typeof themeSchema>;
export type ShowDataSourceOnResult = z.infer<typeof showDataSourceOnResultSchema>;

export interface StorageValueMap {
  disclaimerAccepted: DisclaimerAccepted;
  language: Language;
  theme: ThemeMode;
  showDataSourceOnResult: ShowDataSourceOnResult;
}

export const SCHEMAS: { [K in StorageKey]: z.ZodType<StorageValueMap[K]> } = {
  disclaimerAccepted: disclaimerAcceptedSchema,
  language: languageSchema,
  theme: themeSchema,
  showDataSourceOnResult: showDataSourceOnResultSchema,
};
