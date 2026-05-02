/* eslint-disable import/no-named-as-default-member -- the i18next package legitimately
   uses methods on the default export (i18n.use, i18n.changeLanguage). The named exports
   `use` / `changeLanguage` are alternative APIs we don't use here. */

import * as Localization from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { logger } from '../logger';
import { storage } from '../storage';

import en from './locales/en.json';
import ru from './locales/ru.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './types';
import type { SupportedLanguage } from './types';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const;

/**
 * Pure helper: chooses the initial UI language given the device locale code and
 * an optional stored override. Storage wins over device. Unsupported locales
 * fall back to DEFAULT_LANGUAGE.
 *
 * Exported so it can be unit-tested without mocking expo-localization or storage.
 */
export function pickInitialLanguage(
  deviceLocaleCode: string | null | undefined,
  storedLanguage: SupportedLanguage | null,
): SupportedLanguage {
  if (storedLanguage !== null) {
    return storedLanguage;
  }
  if (
    deviceLocaleCode !== null &&
    deviceLocaleCode !== undefined &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLocaleCode)
  ) {
    return deviceLocaleCode as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

function readDeviceLocaleCode(): string | null {
  const locales = Localization.getLocales();
  const first = locales[0];
  return first?.languageCode ?? null;
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) {
    return;
  }
  const overridden = await storage.get('language');
  const initialLanguage = pickInitialLanguage(readDeviceLocaleCode(), overridden);

  await i18next.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  initialized = true;
  logger.info(`i18n initialized with language=${initialLanguage}`);
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  await i18next.changeLanguage(language);
  storage.set('language', language);
}

export function getCurrentLanguage(): SupportedLanguage {
  const code = i18next.language;
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
    return code as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

export { i18next };
