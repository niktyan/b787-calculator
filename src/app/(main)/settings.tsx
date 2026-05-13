/**
 * Settings screen (см. `02_Specification/06-ui-spec.md` § Экран 5).
 *
 * Five rows: Language (bottom-sheet), Theme (bottom-sheet), Weight units
 * (disabled — Tons only in MVP), Wind units (disabled — KT only),
 * Show data source on result (toggle). All changes apply immediately
 * and persist through `core/storage` (debounced writes).
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { getCurrentLanguage, setLanguage, storage, useTheme, useTranslation } from '../../core';
import type { SupportedLanguage, ThemeMode } from '../../core';
import {
  BottomSheet,
  BottomSheetOption,
  DisabledUnitsRow,
  NavigableSettingsRow,
  Screen,
  ScreenHeader,
  Stack,
  ToggleSettingsRow,
  tokens,
} from '../../design-system';
import type { NavPillsItem } from '../../design-system';

type TabId = 'modules' | 'settings' | 'about';
type SheetKind = 'language' | 'theme' | null;
type Translator = (key: string) => string;

const THEME_OPTIONS: readonly ThemeMode[] = ['auto', 'light', 'dark'];
const LANGUAGE_OPTIONS: readonly SupportedLanguage[] = ['en', 'ru'];

export default function Settings(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, setMode } = useTheme();
  const { width } = useWindowDimensions();
  const isRegular = width >= tokens.breakpoints.regularHeader;
  const state = useSettingsState(setMode);

  const handleTabChange = useCallback(
    (next: TabId): void => {
      if (next === 'modules') {
        router.push('/menu');
      } else if (next === 'about') {
        router.push('/about');
      }
    },
    [router],
  );

  const tabs = useMemo<readonly NavPillsItem<TabId>[]>(
    () => [
      { id: 'modules', label: t('mainMenu.tabModules') },
      { id: 'settings', label: t('mainMenu.tabSettings') },
      { id: 'about', label: t('mainMenu.tabAbout') },
    ],
    [t],
  );

  return (
    <Screen testID="settings-screen">
      <Stack gap="md">
        <ScreenHeader
          title={t('settings.title')}
          tabs={tabs}
          activeTabId="settings"
          onTabChange={handleTabChange}
          isRegular={isRegular}
          logoTestID="settings-logo"
          navTestID="settings-tabs"
        />
        <SettingsList
          t={t}
          language={state.language}
          themeMode={theme.mode}
          showDataSource={state.showDataSource}
          onOpenLanguage={state.openLanguageSheet}
          onOpenTheme={state.openThemeSheet}
          onDataSourceChange={state.setDataSource}
        />
      </Stack>
      <SettingsSheets
        t={t}
        sheet={state.sheet}
        currentLanguage={state.language}
        currentThemeMode={theme.mode}
        onClose={state.closeSheet}
        onSelectLanguage={state.selectLanguage}
        onSelectTheme={state.selectTheme}
      />
    </Screen>
  );
}

interface SettingsState {
  readonly language: SupportedLanguage;
  readonly showDataSource: boolean;
  readonly sheet: SheetKind;
  readonly openLanguageSheet: () => void;
  readonly openThemeSheet: () => void;
  readonly closeSheet: () => void;
  readonly selectLanguage: (next: SupportedLanguage) => void;
  readonly selectTheme: (next: ThemeMode) => void;
  readonly setDataSource: (next: boolean) => void;
}

function useSettingsState(setMode: (next: ThemeMode) => void): SettingsState {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => getCurrentLanguage());
  const [showDataSource, setShowDataSource] = useState<boolean>(true);
  const [sheet, setSheet] = useState<SheetKind>(null);

  useEffect(() => {
    let active = true;
    void storage.get('showDataSourceOnResult').then((stored) => {
      if (active && stored !== null) {
        setShowDataSource(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const selectLanguage = useCallback((next: SupportedLanguage): void => {
    void setLanguage(next);
    setLanguageState(next);
    setSheet(null);
  }, []);

  const selectTheme = useCallback(
    (next: ThemeMode): void => {
      setMode(next);
      setSheet(null);
    },
    [setMode],
  );

  const setDataSource = useCallback((next: boolean): void => {
    setShowDataSource(next);
    storage.set('showDataSourceOnResult', next);
  }, []);

  return {
    language,
    showDataSource,
    sheet,
    openLanguageSheet: useCallback((): void => setSheet('language'), []),
    openThemeSheet: useCallback((): void => setSheet('theme'), []),
    closeSheet: useCallback((): void => setSheet(null), []),
    selectLanguage,
    selectTheme,
    setDataSource,
  };
}

interface SettingsListProps {
  readonly t: Translator;
  readonly language: SupportedLanguage;
  readonly themeMode: ThemeMode;
  readonly showDataSource: boolean;
  readonly onOpenLanguage: () => void;
  readonly onOpenTheme: () => void;
  readonly onDataSourceChange: (next: boolean) => void;
}

function SettingsList({
  t,
  language,
  themeMode,
  showDataSource,
  onOpenLanguage,
  onOpenTheme,
  onDataSourceChange,
}: SettingsListProps): ReactNode {
  const languageLabel = languageLabelFor(language, t);
  const themeLabel = themeLabelFor(themeMode, t);

  return (
    <Stack gap="sm">
      <NavigableSettingsRow
        label={t('settings.language')}
        value={languageLabel}
        onPress={onOpenLanguage}
        testID="settings-row-language"
      />
      <NavigableSettingsRow
        label={t('settings.theme')}
        value={themeLabel}
        onPress={onOpenTheme}
        testID="settings-row-theme"
      />
      <DisabledUnitsRow
        label={t('settings.weightUnits')}
        activeLabel="Tons (t)"
        disabledLabel="Pounds (lbs)"
        caption={t('settings.unitsUpcomingRelease')}
        testID="settings-row-weight-units"
      />
      <DisabledUnitsRow
        label={t('settings.windUnits')}
        activeLabel="KT"
        disabledLabel="m/s"
        caption={t('settings.unitsUpcomingRelease')}
        testID="settings-row-wind-units"
      />
      <ToggleSettingsRow
        label={t('settings.showDataSource')}
        value={showDataSource}
        onChange={onDataSourceChange}
        testID="settings-row-show-data-source"
      />
    </Stack>
  );
}

interface SettingsSheetsProps {
  readonly t: Translator;
  readonly sheet: SheetKind;
  readonly currentLanguage: SupportedLanguage;
  readonly currentThemeMode: ThemeMode;
  readonly onClose: () => void;
  readonly onSelectLanguage: (next: SupportedLanguage) => void;
  readonly onSelectTheme: (next: ThemeMode) => void;
}

function SettingsSheets({
  t,
  sheet,
  currentLanguage,
  currentThemeMode,
  onClose,
  onSelectLanguage,
  onSelectTheme,
}: SettingsSheetsProps): ReactNode {
  return (
    <BottomSheet
      visible={sheet !== null}
      onClose={onClose}
      closeAccessibilityLabel={t('settings.sheetClose')}
      testID="settings-bottom-sheet"
    >
      {sheet === 'language'
        ? LANGUAGE_OPTIONS.map((code) => (
            <BottomSheetOption
              key={code}
              label={languageLabelFor(code, t)}
              selected={code === currentLanguage}
              onPress={(): void => onSelectLanguage(code)}
              testID={`settings-sheet-language-${code}`}
            />
          ))
        : null}
      {sheet === 'theme'
        ? THEME_OPTIONS.map((mode) => (
            <BottomSheetOption
              key={mode}
              label={themeLabelFor(mode, t)}
              selected={mode === currentThemeMode}
              onPress={(): void => onSelectTheme(mode)}
              testID={`settings-sheet-theme-${mode}`}
            />
          ))
        : null}
    </BottomSheet>
  );
}

function languageLabelFor(language: SupportedLanguage, t: Translator): string {
  return language === 'en' ? t('settings.languageEnglish') : t('settings.languageRussian');
}

function themeLabelFor(mode: ThemeMode, t: Translator): string {
  if (mode === 'light') {
    return t('settings.themeLight');
  }
  if (mode === 'dark') {
    return t('settings.themeDark');
  }
  return t('settings.themeAuto');
}
