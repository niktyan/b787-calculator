/**
 * About screen (см. `02_Specification/06-ui-spec.md` § Экран 6).
 *
 * Seven rows: Version, Validation, Data source, Distribution,
 * Privacy policy, Terms of use, Support — plus the advisory disclaimer
 * paragraph at the bottom (verbatim from
 * `02_Specification/07-app-store-compliance.md` § "About screen —
 * раздел Disclaimer"). The Aircraft row was removed in Sprint 6
 * follow-up Block 5 — aircraft variant is selected per-calculation
 * in Crosswind Takeoff and therefore no longer redundantly displayed
 * here. Privacy/Terms open via expo-web-browser; Support opens the
 * system mail composer via Linking.
 */

import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Linking, Pressable, useWindowDimensions, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { logger, useTheme, useTranslation } from '../../core';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_SUBJECT,
  TERMS_OF_USE_URL,
} from '../../core/constants';
import { Row, Screen, ScreenHeader, Stack, Text, tokens } from '../../design-system';
import type { NavPillsItem } from '../../design-system';
import { createCrosswindRepository } from '../../features/crosswind';

const ROW_BORDER_WIDTH = 1;

type TabId = 'modules' | 'settings' | 'about';

const repository = createCrosswindRepository();

const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_MAILTO_SUBJECT)}`;

export default function About(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRegular = width >= tokens.breakpoints.regularHeader;

  // Sibling tabs use `replace` to prevent stack accumulation —
  // see 06-ui-spec.md § Навигация.
  const handleTabChange = useCallback(
    (next: TabId): void => {
      if (next === 'modules') {
        router.replace('/menu');
      } else if (next === 'settings') {
        router.replace('/settings');
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

  const handleOpenPrivacy = useCallback((): void => {
    void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch((error: unknown) => {
      logger.warn('about.privacyPolicy openBrowser failed', error);
    });
  }, []);

  const handleOpenTerms = useCallback((): void => {
    void WebBrowser.openBrowserAsync(TERMS_OF_USE_URL).catch((error: unknown) => {
      logger.warn('about.termsOfUse openBrowser failed', error);
    });
  }, []);

  const handleOpenSupport = useCallback((): void => {
    void Linking.openURL(SUPPORT_MAILTO).catch((error: unknown) => {
      logger.warn('about.support openURL failed', error);
    });
  }, []);

  return (
    <Screen testID="about-screen">
      <Stack gap="md">
        <ScreenHeader
          title={t('about.title')}
          tabs={tabs}
          activeTabId="about"
          onTabChange={handleTabChange}
          isRegular={isRegular}
          logoTestID="about-logo"
          navTestID="about-tabs"
        />
        <AboutRows
          t={t}
          onOpenPrivacy={handleOpenPrivacy}
          onOpenTerms={handleOpenTerms}
          onOpenSupport={handleOpenSupport}
        />
        <Text variant="bodySmall" color="textSecondary" testID="about-disclaimer">
          {t('about.disclaimer')}
        </Text>
      </Stack>
    </Screen>
  );
}

interface AboutRowsProps {
  readonly t: (key: string) => string;
  readonly onOpenPrivacy: () => void;
  readonly onOpenTerms: () => void;
  readonly onOpenSupport: () => void;
}

function AboutRows({ t, onOpenPrivacy, onOpenTerms, onOpenSupport }: AboutRowsProps): ReactNode {
  const versionDisplay = resolveVersionDisplay();
  const dataSourceValue = resolveDataSource();
  const viewAffordance = `${t('about.openExternal')} →`;

  return (
    <Stack gap="sm">
      <AboutRow label={t('about.version')} value={versionDisplay} testID="about-row-version" />
      <AboutRow
        label={t('about.validation')}
        value={t('about.validationValue')}
        testID="about-row-validation"
      />
      <AboutRow
        label={t('about.dataSource')}
        value={dataSourceValue}
        testID="about-row-data-source"
      />
      <AboutRow
        label={t('about.distribution')}
        value={t('about.distributionValue')}
        testID="about-row-distribution"
      />
      <AboutRow
        label={t('about.privacyPolicy')}
        value={viewAffordance}
        onPress={onOpenPrivacy}
        testID="about-row-privacy-policy"
      />
      <AboutRow
        label={t('about.termsOfUse')}
        value={viewAffordance}
        onPress={onOpenTerms}
        testID="about-row-terms-of-use"
      />
      <AboutRow
        label={t('about.support')}
        value={SUPPORT_EMAIL}
        onPress={onOpenSupport}
        testID="about-row-support"
      />
    </Stack>
  );
}

/**
 * Composes the Version row value as `<app version> (<build number>)`.
 * Falls back to `'0.0.0'` if expo-application returns null (development
 * runs); the build-number suffix is omitted when not available so the
 * row stays clean. Intentionally does not surface the Expo SDK version —
 * the user cares about the published app version, not the runtime SDK.
 */
function resolveVersionDisplay(): string {
  const version = Application.nativeApplicationVersion ?? '0.0.0';
  const build = Application.nativeBuildVersion;
  if (build === null || build === '') {
    return version;
  }
  return `${version} (${build})`;
}

function resolveDataSource(): string {
  const result = repository.load();
  if (!result.ok) {
    return '—';
  }
  const dataset = result.value.byAircraft.b787_8?.dry;
  const refDoc = dataset?.metadata.referenceDocument ?? 'Boeing 787 FCOM';
  return `${refDoc} · ${result.value.dataVersion}`;
}

interface AboutRowProps {
  readonly label: string;
  readonly value: string;
  readonly testID: string;
  readonly onPress?: () => void;
}

function AboutRow({ label, value, testID, onPress }: AboutRowProps): ReactNode {
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
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    }),
    [palette.bgCard, palette.border],
  );

  const labelNode = (
    <Text variant="caption" color="textPrimary">
      {label}
    </Text>
  );
  const valueNode =
    onPress === undefined ? (
      <Text variant="monoSmall" color="textSecondary">
        {value}
      </Text>
    ) : (
      <Row align="center" gap="xs">
        <Text variant="monoSmall" color="accent">
          {value}
        </Text>
        <Text variant="caption" color="accent">
          ›
        </Text>
      </Row>
    );

  if (onPress === undefined) {
    return (
      <View style={rowStyle} testID={testID}>
        {labelNode}
        {valueNode}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={rowStyle}
      testID={testID}
    >
      {labelNode}
      {valueNode}
    </Pressable>
  );
}
