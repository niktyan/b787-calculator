/**
 * About screen — Sprint 5 polish: minimal 3-row implementation hosting
 * the data-source attribution that was previously a chip on the
 * Crosswind result panel (см. 06-ui-spec.md § Принцип 4 + § Экран 6).
 *
 * TODO(Sprint 6): append the remaining 5 rows per § Экран 6:
 *   - Validation        — "Active line pilots"
 *   - Distribution      — "Public App Store"
 *   - Privacy policy    — tappable, opens via expo-web-browser
 *   - Terms of use      — tappable, opens via expo-web-browser
 *   - Support           — mailto link (placeholder until Phase D —
 *                          07-app-store-compliance.md § Outstanding
 *                          placeholders)
 * The 3 rows below (Version / Aircraft / Data source) and the
 * header/NavPills shell are intentionally laid out so Sprint 6 can
 * append rows to the same `<Stack>` without restructuring.
 */

import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme, useTranslation } from '../../core';
import { NavPills, Row, Screen, Stack, Text, tokens } from '../../design-system';
import type { NavPillsItem } from '../../design-system';
import { createCrosswindRepository } from '../../features/crosswind';

const HEADER_DIVIDER_HEIGHT = 1;
const ROW_BORDER_WIDTH = 1;

type TabId = 'modules' | 'settings' | 'about';

const repository = createCrosswindRepository();

export default function About(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRegular = width >= tokens.breakpoints.regularHeader;

  const handleTabChange = useCallback(
    (next: TabId): void => {
      if (next === 'modules') {
        router.push('/menu');
      } else if (next === 'settings') {
        router.push('/settings');
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

  const version = Application.nativeApplicationVersion ?? '0.0.0';
  const dataSourceValue = resolveDataSource();

  return (
    <Screen testID="about-screen">
      <Stack gap="md">
        <AboutHeader tabs={tabs} onTabChange={handleTabChange} isRegular={isRegular} />
        <Stack gap="sm">
          <AboutRow label={t('about.version')} value={version} testID="about-row-version" />
          <AboutRow
            label={t('about.aircraft')}
            value={t('about.aircraftValue')}
            testID="about-row-aircraft"
          />
          <AboutRow
            label={t('about.dataSource')}
            value={dataSourceValue}
            testID="about-row-data-source"
          />
        </Stack>
      </Stack>
    </Screen>
  );
}

function resolveDataSource(): string {
  const result = repository.load();
  if (!result.ok) {
    return '—';
  }
  return `${result.value.metadata.referenceDocument} · ${result.value.dataVersion}`;
}

interface AboutHeaderProps {
  readonly tabs: readonly NavPillsItem<TabId>[];
  readonly onTabChange: (next: TabId) => void;
  readonly isRegular: boolean;
}

function AboutHeader({ tabs, onTabChange, isRegular }: AboutHeaderProps): ReactNode {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

  const dividerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.border,
      height: HEADER_DIVIDER_HEIGHT,
    }),
    [palette.border],
  );
  const logoStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: sizing.logoRadius,
      height: sizing.logoSize,
      justifyContent: 'center',
      width: sizing.logoSize,
    }),
    [palette.accentSoft, sizing.logoRadius, sizing.logoSize],
  );

  const brand = (
    <Row align="center" gap="sm">
      <View accessibilityLabel="B787 logo" style={logoStyle} testID="about-logo">
        <Text variant="mono" color="accent">
          B7
        </Text>
      </View>
      <Text variant="body">{t('about.title')}</Text>
    </Row>
  );

  const navPills = (
    <NavPills
      items={tabs}
      activeId="about"
      onChange={onTabChange}
      testID="about-tabs"
      grow={!isRegular}
      sizing={sizing}
    />
  );

  return (
    <Stack gap="md">
      {isRegular ? (
        <Row align="center" justify="space-between">
          {brand}
          {navPills}
        </Row>
      ) : (
        <Stack gap="sm">
          {brand}
          {navPills}
        </Stack>
      )}
      <View style={dividerStyle} />
    </Stack>
  );
}

interface AboutRowProps {
  readonly label: string;
  readonly value: string;
  readonly testID: string;
}

function AboutRow({ label, value, testID }: AboutRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: ROW_BORDER_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    }),
    [palette.bgCard, palette.border],
  );

  return (
    <View style={rowStyle} testID={testID}>
      <Text variant="caption" color="textPrimary">
        {label}
      </Text>
      <Text variant="monoSmall" color="textSecondary">
        {value}
      </Text>
    </View>
  );
}
