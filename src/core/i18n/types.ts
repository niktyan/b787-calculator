import type en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Recursively flattens a nested string-keyed object into dot-paths,
 * giving us a TypeScript union of all valid translation keys.
 */
type Flatten<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Flatten<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Flatten<typeof en>;
