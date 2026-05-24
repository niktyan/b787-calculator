/**
 * Recent Calculations screen (Sprint D / ADR-0016).
 *
 * Lists up to RECENT_MAX_ENTRIES persisted entries, newest first.
 * Tapping a row navigates back to the originating calculator with a
 * `recentEntryId` query param so the calculator can prefill inputs.
 *
 * Header offers a Back pill (to Main Menu) and a Clear All pill that
 * shows a native confirmation Alert before wiping the store.
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { useTheme, useTranslation } from '../../../core';
import type { RecentEntry } from '../../../core/recent-storage';
import { Row, Screen, Stack, Text, tokens } from '../../../design-system';

import { RecentEmptyState } from './components/RecentEmptyState';
import { RecentListItem } from './components/RecentListItem';
import { useRecentCalculations } from './useRecentCalculations';

const HEADER_DIVIDER_HEIGHT = 1;
const PILL_PRESSED_OPACITY = 0.6;
const REGULAR_BREAKPOINT = tokens.breakpoints.regularHeader;

const TAKEOFF_ROUTE = '/crosswind';
const LANDING_ROUTE = '/crosswind-landing';

export function RecentCalculationsScreen(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRegular = width >= REGULAR_BREAKPOINT;
  const { entries, clear } = useRecentCalculations();

  const handleBack = useCallback((): void => router.back(), [router]);

  const handleEntryPress = useCallback(
    (entry: RecentEntry): void => {
      if (entry.module === 'takeoff') {
        router.push({ pathname: TAKEOFF_ROUTE, params: { recentEntryId: entry.id } });
      } else {
        router.push({ pathname: LANDING_ROUTE, params: { recentEntryId: entry.id } });
      }
    },
    [router],
  );

  const handleClearAll = useCallback((): void => {
    if (entries.length === 0) {
      return;
    }
    Alert.alert(t('recent.clearConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recent.clearAll'),
        style: 'destructive',
        onPress: (): void => {
          void clear();
        },
      },
    ]);
  }, [entries.length, clear, t]);

  return (
    <Screen testID="recent-screen">
      <Stack gap="lg" style={styles.fillHeight}>
        <RecentHeader
          title={t('recent.title')}
          backLabel={`← ${t('common.back')}`}
          clearLabel={t('recent.clearAll')}
          onBack={handleBack}
          onClear={handleClearAll}
          isRegular={isRegular}
          canClear={entries.length > 0}
        />
        {entries.length === 0 ? (
          <RecentEmptyState testID="recent-empty" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            testID="recent-list"
          >
            <Stack gap="sm">
              {entries.map((entry) => (
                <RecentListItem
                  key={entry.id}
                  entry={entry}
                  onPress={handleEntryPress}
                  testID={`recent-item-${entry.id}`}
                />
              ))}
            </Stack>
          </ScrollView>
        )}
      </Stack>
    </Screen>
  );
}

interface RecentHeaderProps {
  readonly title: string;
  readonly backLabel: string;
  readonly clearLabel: string;
  readonly onBack: () => void;
  readonly onClear: () => void;
  readonly isRegular: boolean;
  readonly canClear: boolean;
}

function RecentHeader(props: RecentHeaderProps): ReactNode {
  const { title, backLabel, clearLabel, onBack, onClear, isRegular, canClear } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

  const dividerStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.border, height: HEADER_DIVIDER_HEIGHT }),
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
  const titleStyle = useMemo<TextStyle>(() => ({ fontSize: sizing.titleSize }), [sizing.titleSize]);

  return (
    <Stack gap="md">
      <Row align="center" justify="space-between">
        <Row align="center" gap="sm">
          <View accessibilityLabel="B787 logo" style={logoStyle} testID="recent-logo">
            <Text variant="mono" color="accent">
              B7
            </Text>
          </View>
          <Text variant="body" style={titleStyle}>
            {title}
          </Text>
        </Row>
        <Row align="center" gap="xs">
          <HeaderPill label={backLabel} onPress={onBack} sizing={sizing} testID="recent-back" />
          <HeaderPill
            label={clearLabel}
            onPress={onClear}
            sizing={sizing}
            disabled={!canClear}
            testID="recent-clear-all"
          />
        </Row>
      </Row>
      <View style={dividerStyle} />
    </Stack>
  );
}

type HeaderSizingBundle = typeof tokens.sizing.header.compact | typeof tokens.sizing.header.regular;

interface HeaderPillProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly sizing: HeaderSizingBundle;
  readonly testID: string;
  readonly disabled?: boolean;
}

function HeaderPill(props: HeaderPillProps): ReactNode {
  const { label, onPress, sizing, testID, disabled = false } = props;
  const pillStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      borderRadius: sizing.pillRadius,
      justifyContent: 'center',
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: sizing.pillPaddingH,
      paddingVertical: sizing.pillPaddingV,
    }),
    [sizing.pillPaddingH, sizing.pillPaddingV, sizing.pillRadius],
  );
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: sizing.pillLabelSize }),
    [sizing.pillLabelSize],
  );
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={tokens.spacing.sm}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        pillStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      testID={testID}
    >
      <Text variant="caption" color="textSecondary" style={labelStyle}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  fillHeight: {
    flex: 1,
  },
  listContent: {
    paddingBottom: tokens.spacing.lg,
  },
  pressed: {
    opacity: PILL_PRESSED_OPACITY,
  },
});
