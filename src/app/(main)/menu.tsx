import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { logger, useModules, useModuleVisibility, useTranslation } from '../../core';
import type { ActiveModule, ComingSoonModule, Module } from '../../core/modules';
import { Button, EmptyState, Screen, ScreenHeader, Stack, tokens } from '../../design-system';
import type { NavPillsItem } from '../../design-system';

import { ComingSoonModal } from './_components/ComingSoonModal';
import { ActiveModuleCard, ComingSoonCard } from './_components/ModuleCards';

/**
 * Main Menu — entry point after disclaimer (см. `02_Specification/06-ui-spec.md`
 * Экран 3 + ADR-0004). Renders the bundled modules list filtered by the
 * user's per-module visibility preference; if nothing is visible, falls
 * back to an EmptyState with a deep-link to Settings.
 *
 * Render order mirrors the canonical operational flight phase sequence
 * encoded in `data.json`: Crosswind · Takeoff first, then Crosswind ·
 * Landing — takeoff is the operationally earlier phase. Both are active
 * MVP modules since Sprint C / ADR-0014.
 *
 * Tapping an active card pushes its route from JSON. Tapping a coming-
 * soon card opens ComingSoonModal (no navigation away). MVP ships zero
 * coming-soon teasers, so the ComingSoonCard path is currently dead code
 * — kept for the next module activation (post-MVP Phase 3+).
 */

const GRID_BREAKPOINT = tokens.breakpoints.compact;
const REGULAR_BREAKPOINT = tokens.breakpoints.regularHeader;

type TabId = 'modules' | 'settings' | 'about';

// Literal-typed routes the Main Menu may push into. Keeping this as a
// `const`-asserted tuple lets us narrow `module.route` (typed as plain
// `string` in the bundled JSON) into a typed-routes-compatible literal,
// avoiding a fragile `as Href` cast that disagrees between local TS and
// CI typegen.
const ACTIVE_MODULE_ROUTES = ['/crosswind', '/crosswind-landing', '/recent'] as const;
type ActiveModuleRoute = (typeof ACTIVE_MODULE_ROUTES)[number];

function isActiveModuleRoute(route: string): route is ActiveModuleRoute {
  return (ACTIVE_MODULE_ROUTES as readonly string[]).includes(route);
}

export default function MainMenu(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const modules = useModules();
  const { isVisible } = useModuleVisibility();
  const { width } = useWindowDimensions();
  const [openedModule, setOpenedModule] = useState<ComingSoonModule | null>(null);
  const handlers = useMenuHandlers(router);

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
  const gridStyle = useGridStyle(isRegular);
  const visibleModules = useMemo(
    () => modules.filter((m) => isVisible(m.id)),
    [modules, isVisible],
  );

  return (
    <Screen testID="main-menu-screen">
      <Stack gap="md">
        <ScreenHeader
          title="B787 Tools"
          tabs={tabs}
          activeTabId="modules"
          onTabChange={handlers.onTabChange}
          isRegular={isRegular}
          logoTestID="main-menu-logo"
          navTestID="main-menu-tabs"
        />
        {visibleModules.length === 0 ? (
          <EmptyAllHidden onOpenSettings={handlers.onOpenSettings} />
        ) : (
          <View style={gridStyle} testID="main-menu-grid">
            {visibleModules.map((m) => (
              <CardSlot isTwoColumn={isTwoColumn} key={m.id}>
                <ModuleCardForModule
                  module={m}
                  isRegular={isRegular}
                  onActivePress={handlers.onActivePress}
                  onInactivePress={setOpenedModule}
                />
              </CardSlot>
            ))}
          </View>
        )}
      </Stack>
      <ComingSoonModal
        module={openedModule}
        onClose={(): void => setOpenedModule(null)}
        testID="coming-soon-modal"
      />
    </Screen>
  );
}

interface ModuleCardForModuleProps {
  readonly module: Module;
  readonly isRegular: boolean;
  readonly onActivePress: (route: string) => void;
  readonly onInactivePress: (module: ComingSoonModule) => void;
}

function ModuleCardForModule({
  module,
  isRegular,
  onActivePress,
  onInactivePress,
}: ModuleCardForModuleProps): ReactNode {
  if (module.active) {
    const active: ActiveModule = module;
    return (
      <ActiveModuleCard
        module={active}
        onPress={(): void => onActivePress(active.route)}
        isRegular={isRegular}
      />
    );
  }
  return (
    <ComingSoonCard
      module={module}
      onPress={(): void => onInactivePress(module)}
      isRegular={isRegular}
    />
  );
}

interface EmptyAllHiddenProps {
  readonly onOpenSettings: () => void;
}

function EmptyAllHidden({ onOpenSettings }: EmptyAllHiddenProps): ReactNode {
  const { t } = useTranslation();
  return (
    <Stack gap="md" align="center" testID="main-menu-empty">
      <EmptyState title={t('mainMenu.allHidden')} />
      <Button
        label={t('mainMenu.openSettings')}
        onPress={onOpenSettings}
        variant="primary"
        testID="main-menu-empty-open-settings"
      />
    </Stack>
  );
}

interface CardSlotProps {
  readonly isTwoColumn: boolean;
  readonly children: ReactNode;
}

function CardSlot({ isTwoColumn, children }: CardSlotProps): ReactNode {
  return <View style={isTwoColumn ? SLOT_TWO_COL : SLOT_ONE_COL}>{children}</View>;
}

const SLOT_ONE_COL: ViewStyle = { width: '100%' };
const SLOT_TWO_COL: ViewStyle = { width: '48%' };

interface MenuHandlers {
  readonly onTabChange: (next: TabId) => void;
  readonly onActivePress: (route: string) => void;
  readonly onOpenSettings: () => void;
}

function useMenuHandlers(router: ReturnType<typeof useRouter>): MenuHandlers {
  // Sibling tabs (Settings, About) use `replace` — see § Навигация in
  // 06-ui-spec.md. Stack accumulation from `push` made the iOS swipe-back
  // gesture cycle through prior NavPill destinations.
  const onTabChange = useCallback(
    (next: TabId): void => {
      if (next === 'settings') {
        router.replace('/settings');
      } else if (next === 'about') {
        router.replace('/about');
      }
    },
    [router],
  );
  // Drilldown into Crosswind — keeps `push` so iOS swipe-back / the
  // in-screen Back pill pops back to the menu. The runtime check
  // narrows the JSON-sourced `route: string` to a literal that the
  // expo-router typed-routes Href union accepts, with a logger.warn
  // fallback for unrecognised routes (would indicate a schema /
  // typegen drift that the developer should fix).
  const onActivePress = useCallback(
    (route: string): void => {
      if (isActiveModuleRoute(route)) {
        router.push(route);
      } else {
        logger.warn(`menu.onActivePress: unknown route ${route}`);
      }
    },
    [router],
  );
  // EmptyState deep-link — also a drilldown semantic (Modules tab is
  // already active when the empty state shows), so `push` is correct
  // here: the user expects to return to Main Menu after re-enabling
  // a module.
  const onOpenSettings = useCallback((): void => {
    router.push('/settings');
  }, [router]);
  return { onTabChange, onActivePress, onOpenSettings };
}

function useGridStyle(isRegular: boolean): ViewStyle {
  const gridGap = isRegular
    ? tokens.sizing.moduleCard.regular.gridGap
    : tokens.sizing.moduleCard.compact.gridGap;
  return useMemo<ViewStyle>(
    () => ({ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }),
    [gridGap],
  );
}
