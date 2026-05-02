import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useComingSoonModules, useTheme, useTranslation } from '../../core';
import type { ComingSoonModule } from '../../core/coming-soon-modules';
import { NavPills, Row, Screen, Stack, Text, tokens } from '../../design-system';
import type { NavPillsItem } from '../../design-system';

import { ComingSoonModal } from './_components/ComingSoonModal';

/**
 * Main Menu — entry point after disclaimer (см. `02_Specification/06-ui-spec.md`
 * Экран 3 + ADR-0004). Renders coming-soon teaser cards loaded from
 * `src/core/coming-soon-modules/data.json` followed by the active feature card
 * (Crosswind · Landing). Render order matches the chronological flight phase:
 * Takeoff (teaser) precedes Landing (active).
 *
 * Tapping the active card → `/crosswind` (placeholder this sprint).
 * Tapping a coming-soon card → ComingSoonModal (no navigation away).
 *
 * Module names are NOT localized per spec § "Что НЕ локализуется".
 * Description text and surrounding UI strings ARE localized.
 */

const APP_LOGO_SIZE = 28;
const APP_LOGO_RADIUS = 6;
const MODULE_ICON_SIZE = 28;
const MODULE_ICON_RADIUS = 6;
const HEADER_DIVIDER_HEIGHT = 1;
const PRESSED_OPACITY = 0.6;
const GRID_BREAKPOINT = tokens.breakpoints.compact;
/**
 * Header layout breakpoint: below this width the header collapses into two
 * rows (logo + title on row 1, NavPills full-width on row 2). At/above it,
 * the header stays single-row with NavPills aligned right.
 *
 * 768 pt is the iPad-mini portrait width — anything narrower (every iPhone
 * portrait orientation) needs the wrap to keep "О приложении" readable.
 */
const HEADER_WRAP_BREAKPOINT = 768;

type TabId = 'modules' | 'settings' | 'about';

interface ActiveModule {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

const ACTIVE_MODULE: ActiveModule = {
  id: 'crosswind-landing',
  name: 'Crosswind · Landing',
  icon: 'XW',
};

export default function MainMenu(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const modules = useComingSoonModules();
  const { width } = useWindowDimensions();
  const [openedModule, setOpenedModule] = useState<ComingSoonModule | null>(null);

  const handleTabChange = useCallback(
    (next: TabId): void => {
      if (next === 'settings') router.push('/settings');
      else if (next === 'about') router.push('/about');
    },
    [router],
  );

  const handleActivePress = useCallback((): void => {
    router.push('/crosswind');
  }, [router]);

  const tabs = useMemo<readonly NavPillsItem<TabId>[]>(
    () => [
      { id: 'modules', label: t('mainMenu.tabModules') },
      { id: 'settings', label: t('mainMenu.tabSettings') },
      { id: 'about', label: t('mainMenu.tabAbout') },
    ],
    [t],
  );

  const isTwoColumn = width >= GRID_BREAKPOINT;
  const isWideHeader = width >= HEADER_WRAP_BREAKPOINT;

  return (
    <Screen testID="main-menu-screen">
      <Stack gap="md">
        <MenuHeader tabs={tabs} onTabChange={handleTabChange} isWide={isWideHeader} />
        <View style={styles.grid} testID="main-menu-grid">
          {modules.map((m) => (
            <CardSlot isTwoColumn={isTwoColumn} key={m.id}>
              <ComingSoonCard module={m} onPress={(): void => setOpenedModule(m)} />
            </CardSlot>
          ))}
          <CardSlot isTwoColumn={isTwoColumn}>
            <ActiveModuleCard module={ACTIVE_MODULE} onPress={handleActivePress} />
          </CardSlot>
        </View>
      </Stack>
      <ComingSoonModal
        module={openedModule}
        onClose={(): void => setOpenedModule(null)}
        testID="coming-soon-modal"
      />
    </Screen>
  );
}

interface MenuHeaderProps {
  readonly tabs: readonly NavPillsItem<TabId>[];
  readonly onTabChange: (next: TabId) => void;
  readonly isWide: boolean;
}

function MenuHeader({ tabs, onTabChange, isWide }: MenuHeaderProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const headerStyles = useMemo(
    () =>
      StyleSheet.create({
        divider: {
          backgroundColor: palette.border,
          height: HEADER_DIVIDER_HEIGHT,
        },
        logo: {
          alignItems: 'center',
          backgroundColor: palette.accentSoft,
          borderRadius: APP_LOGO_RADIUS,
          height: APP_LOGO_SIZE,
          justifyContent: 'center',
          width: APP_LOGO_SIZE,
        },
      }),
    [palette.accentSoft, palette.border],
  );

  const brand = (
    <Row align="center" gap="sm">
      <View accessibilityLabel="B787 logo" style={headerStyles.logo} testID="main-menu-logo">
        <Text variant="mono" color="accent">
          B7
        </Text>
      </View>
      <Text variant="body">B787 Calculator</Text>
    </Row>
  );

  const navPills = (
    <NavPills
      items={tabs}
      activeId="modules"
      onChange={onTabChange}
      testID="main-menu-tabs"
      grow={!isWide}
    />
  );

  return (
    <Stack gap="md">
      {isWide ? (
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
      <View style={headerStyles.divider} />
    </Stack>
  );
}

interface CardSlotProps {
  readonly isTwoColumn: boolean;
  readonly children: ReactNode;
}

function CardSlot({ isTwoColumn, children }: CardSlotProps): ReactNode {
  return <View style={isTwoColumn ? styles.slotTwoColumn : styles.slotOneColumn}>{children}</View>;
}

interface ActiveModuleCardProps {
  readonly module: ActiveModule;
  readonly onPress: () => void;
}

function ActiveModuleCard({ module, onPress }: ActiveModuleCardProps): ReactNode {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const cardStyles = useMemo(
    () =>
      StyleSheet.create({
        icon: {
          alignItems: 'center',
          backgroundColor: palette.accentSoft,
          borderRadius: MODULE_ICON_RADIUS,
          height: MODULE_ICON_SIZE,
          justifyContent: 'center',
          width: MODULE_ICON_SIZE,
        },
        pressed: {
          opacity: PRESSED_OPACITY,
        },
        root: {
          backgroundColor: palette.bgCard,
          borderColor: palette.accent,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: tokens.spacing.md,
        },
      }),
    [palette.accent, palette.accentSoft, palette.bgCard],
  );

  const computeStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [
      cardStyles.root,
      pressed ? cardStyles.pressed : null,
    ],
    [cardStyles.pressed, cardStyles.root],
  );

  return (
    <Pressable
      accessibilityLabel={module.name}
      accessibilityRole="button"
      onPress={onPress}
      style={computeStyle}
      testID={`module-card-${module.id}`}
    >
      <Stack gap="sm">
        <View style={cardStyles.icon}>
          <Text variant="mono" color="accent">
            {module.icon}
          </Text>
        </View>
        <Text variant="caption" color="textPrimary">
          {module.name}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {t('mainMenu.activeModuleDescription')}
        </Text>
      </Stack>
    </Pressable>
  );
}

interface ComingSoonCardProps {
  readonly module: ComingSoonModule;
  readonly onPress: () => void;
}

function ComingSoonCard({ module, onPress }: ComingSoonCardProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const cardStyles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          position: 'absolute',
          right: tokens.spacing.sm,
          top: tokens.spacing.sm,
        },
        icon: {
          alignItems: 'center',
          backgroundColor: palette.borderStrong,
          borderRadius: MODULE_ICON_RADIUS,
          height: MODULE_ICON_SIZE,
          justifyContent: 'center',
          width: MODULE_ICON_SIZE,
        },
        pressed: {
          opacity: PRESSED_OPACITY,
        },
        root: {
          backgroundColor: palette.bgCard,
          borderColor: palette.border,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: tokens.spacing.md,
        },
      }),
    [palette.bgCard, palette.border, palette.borderStrong],
  );

  const computeStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [
      cardStyles.root,
      pressed ? cardStyles.pressed : null,
    ],
    [cardStyles.pressed, cardStyles.root],
  );

  return (
    <Pressable
      accessibilityLabel={module.name}
      accessibilityRole="button"
      onPress={onPress}
      style={computeStyle}
      testID={`module-card-${module.id}`}
    >
      <View style={cardStyles.badge}>
        <Text variant="chipLabel" color="textTertiary">
          {module.phase}
        </Text>
      </View>
      <Stack gap="sm">
        <View style={cardStyles.icon}>
          <Text variant="mono" color="textTertiary">
            {module.icon}
          </Text>
        </View>
        <Text variant="caption" color="textPrimary">
          {module.name}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {module.description}
        </Text>
      </Stack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  slotOneColumn: {
    width: '100%',
  },
  slotTwoColumn: {
    width: '48%',
  },
});
