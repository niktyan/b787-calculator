import { Stack } from 'expo-router';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useTheme } from '../../core';
import { tokens, useReduceMotion } from '../../design-system';

/**
 * Stack layout for the main flow (menu, crosswind, settings, about).
 *
 * `contentStyle.backgroundColor` is set to `tokens.colors.bgScreen` for the
 * resolved theme so that during slide transitions the container behind the
 * cards matches the screen surface — without this, the default white system
 * container flashes through under our dark-mode screens (см.
 * `02_Specification/06-ui-spec.md` § "Анимации"). Color is theme-aware: do
 * not hardcode.
 *
 * Per-screen animation policy (см. § Анимации):
 *  - menu / settings / about — sibling tabs reached via `router.replace`,
 *    use a quick `fade` so switching feels like iOS TabView, not a
 *    hierarchical push.
 *  - crosswind — hierarchical drilldown reached via `router.push`,
 *    keeps the React-Navigation default `slide_from_right`.
 *
 * When the user has enabled iOS "Reduce Motion", both animations
 * collapse to `'none'` so transitions are instant.
 */

const SIBLING_FADE_DURATION_MS = 200;
const DRILLDOWN_SLIDE_DURATION_MS = 300;

export default function MainLayout(): ReactNode {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: tokens.colors[theme.resolved].bgScreen },
    }),
    [theme.resolved],
  );

  const siblingOptions = reduceMotion
    ? ({ animation: 'none' } as const)
    : ({ animation: 'fade', animationDuration: SIBLING_FADE_DURATION_MS } as const);
  const drilldownOptions = reduceMotion
    ? ({ animation: 'none' } as const)
    : ({
        animation: 'slide_from_right',
        animationDuration: DRILLDOWN_SLIDE_DURATION_MS,
      } as const);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="menu" options={siblingOptions} />
      <Stack.Screen name="settings" options={siblingOptions} />
      <Stack.Screen name="about" options={siblingOptions} />
      <Stack.Screen name="crosswind" options={drilldownOptions} />
    </Stack>
  );
}
