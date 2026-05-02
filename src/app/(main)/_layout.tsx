import { Stack } from 'expo-router';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { useTheme } from '../../core';
import { tokens } from '../../design-system';

/**
 * Stack layout for the main flow (menu, crosswind, settings, about).
 *
 * `contentStyle.backgroundColor` is set to `tokens.colors.bgScreen` for the
 * resolved theme so that during slide transitions the container behind the
 * cards matches the screen surface — without this, the default white system
 * container flashes through under our dark-mode screens (см.
 * `02_Specification/06-ui-spec.md` § "Анимации"). Color is theme-aware: do
 * not hardcode.
 */
export default function MainLayout(): ReactNode {
  const { theme } = useTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: tokens.colors[theme.resolved].bgScreen },
    }),
    [theme.resolved],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="menu" />
      <Stack.Screen name="crosswind" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
