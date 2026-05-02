/**
 * Known AsyncStorage keys. Adding a new key requires:
 * 1. adding it to STORAGE_KEYS,
 * 2. adding a zod schema for its value in `schemas.ts`,
 * 3. adding a default in `schemas.ts` defaults map.
 */

export const STORAGE_KEYS = {
  disclaimerAccepted: 'b787.disclaimerAccepted',
  language: 'b787.language',
  theme: 'b787.theme',
  showDataSourceOnResult: 'b787.showDataSourceOnResult',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
