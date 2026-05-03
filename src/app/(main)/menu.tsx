import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useComingSoonModules, useTheme, useTranslation } from '../../core';
import type { ComingSoonModule } from '../../core/coming-soon-modules';
import { NavPills, Row, Screen, Stack, Text, tokens } from '../../design-system';
import type { NavPillsItem } from '../../design-system';

import { ComingSoonModal } from './_components/ComingSoonModal';
import { ActiveModuleCard, ComingSoonCard } from './_components/ModuleCards';
import type { ActiveModule } from './_components/ModuleCards';

/**
 * Main Menu — entry point after disclaimer (см. `02_Specification/06-ui-spec.md`
 * Экран 3 + ADR-0004). Renders coming-soon teasers from
 * `src/core/coming-soon-modules/data.json` followed by the active feature
 * card. Render order matches the chronological flight phase: Takeoff
 * (teaser) precedes Landing (active).
 *
 * Tapping the active card → `/crosswind` (placeholder this sprint).
 * Tapping a coming-soon card → ComingSoonModal (no navigation away).
 *
 * Sizing follows two parallel sets keyed by `tokens.breakpoints.regularHeader`
 * (768 pt). Below it: compact phone layout, two-row header. At/above it:
 * iPad-regular layout, larger cards/icons/typography, single-row header.
 */

const HEADER_DIVIDER_HEIGHT = 1;
const GRID_BREAKPOINT = tokens.breakpoints.compact;
const REGULAR_BREAKPOINT = tokens.breakpoints.regularHeader;

type TabId = 'modules' | 'settings' | 'about';

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
  const isRegular = width >= REGULAR_BREAKPOINT;
  const gridGap = isRegular
    ? tokens.sizing.moduleCard.regular.gridGap
    : tokens.sizing.moduleCard.compact.gridGap;
  const gridStyle = useMemo(
    () => ({ flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: gridGap }),
    [gridGap],
  );

  return (
    <Screen testID="main-menu-screen">
      <Stack gap="md">
        <MenuHeader tabs={tabs} onTabChange={handleTabChange} isRegular={isRegular} />
        <View style={gridStyle} testID="main-menu-grid">
          {modules.map((m) => (
            <CardSlot isTwoColumn={isTwoColumn} key={m.id}>
              <ComingSoonCard
                module={m}
                onPress={(): void => setOpenedModule(m)}
                isRegular={isRegular}
              />
            </CardSlot>
          ))}
          <CardSlot isTwoColumn={isTwoColumn}>
            <ActiveModuleCard
              module={ACTIVE_MODULE}
              onPress={handleActivePress}
              isRegular={isRegular}
            />
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
  readonly isRegular: boolean;
}

function MenuHeader({ tabs, onTabChange, isRegular }: MenuHeaderProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

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
          borderRadius: sizing.logoRadius,
          height: sizing.logoSize,
          justifyContent: 'center',
          width: sizing.logoSize,
        },
        title: {
          fontSize: sizing.titleSize,
        },
      }),
    [palette.accentSoft, palette.border, sizing.logoRadius, sizing.logoSize, sizing.titleSize],
  );

  const brand = (
    <Row align="center" gap="sm">
      <View accessibilityLabel="B787 logo" style={headerStyles.logo} testID="main-menu-logo">
        <Text variant="mono" color="accent">
          B7
        </Text>
      </View>
      <Text variant="body" style={headerStyles.title}>
        B787 Calculator
      </Text>
    </Row>
  );

  const navPills = (
    <NavPills
      items={tabs}
      activeId="modules"
      onChange={onTabChange}
      testID="main-menu-tabs"
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

const styles = StyleSheet.create({
  slotOneColumn: {
    width: '100%',
  },
  slotTwoColumn: {
    width: '48%',
  },
});
