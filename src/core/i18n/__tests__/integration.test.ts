import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../storage/keys';
import { storage } from '../../storage/storage';
import { getCurrentLanguage, i18next, initI18n, pickInitialLanguage, setLanguage } from '../config';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock: unknown = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return mock;
});

jest.mock('expo-localization', () => ({
  getLocales: (): { languageCode: string | null }[] => [{ languageCode: 'en' }],
}));

describe('pickInitialLanguage (pure)', () => {
  it('prefers stored override over device locale', () => {
    expect(pickInitialLanguage('en', 'ru')).toBe('ru');
  });

  it('uses device locale when no override is stored and locale is supported', () => {
    expect(pickInitialLanguage('en', null)).toBe('en');
    expect(pickInitialLanguage('ru', null)).toBe('ru');
  });

  it('falls back to default English when device locale is unsupported', () => {
    expect(pickInitialLanguage('ja', null)).toBe('en');
    expect(pickInitialLanguage('de', null)).toBe('en');
  });

  it('falls back to default English when device locale is null/undefined', () => {
    expect(pickInitialLanguage(null, null)).toBe('en');
    expect(pickInitialLanguage(undefined, null)).toBe('en');
  });
});

describe('i18n integration', () => {
  beforeAll(async () => {
    await AsyncStorage.clear();
    await storage.flushNow();
    // initI18n is idempotent; one-time setup for this file.
    await initI18n();
  });

  it('initializes with the device language (en) when storage is empty', () => {
    expect(getCurrentLanguage()).toBe('en');
  });

  it('returns translations from the active locale bundle', () => {
    expect(i18next.t('common.ok')).toBe('OK');
    expect(i18next.t('mainMenu.title')).toBe('Modules');
  });

  it('switches language at runtime via setLanguage', async () => {
    await setLanguage('ru');
    expect(getCurrentLanguage()).toBe('ru');
    expect(i18next.t('mainMenu.title')).toBe('Модули');

    await setLanguage('en');
    expect(getCurrentLanguage()).toBe('en');
    expect(i18next.t('mainMenu.title')).toBe('Modules');
  });

  it('persists the chosen language to storage', async () => {
    await setLanguage('ru');
    await storage.flushNow();
    expect(await storage.get('language')).toBe('ru');
    // Read the raw AsyncStorage key as well to confirm the integration end-to-end.
    expect(await AsyncStorage.getItem(STORAGE_KEYS.language)).toBe(JSON.stringify('ru'));
  });

  it('initI18n is idempotent — calling it again does not reset language', async () => {
    await setLanguage('ru');
    await initI18n();
    expect(getCurrentLanguage()).toBe('ru');
  });
});
