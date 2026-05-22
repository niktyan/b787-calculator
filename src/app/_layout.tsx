import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, initI18n, logger, useTheme } from '../core';
import { NumericKeypadHost, NumericKeypadProvider, tokens } from '../design-system';

/**
 * Composition root for the app shell:
 *   - SafeAreaProvider — required by the design-system `<Screen>` component.
 *   - ThemeProvider    — supplies design-system colour tokens.
 *   - i18n init        — runs once, gates rendering of children.
 *
 * Routes registered here:
 *   - `index`      (Splash, mounted at `/` so cold-start hits it)
 *   - `disclaimer` (no swipe-back; locked screen during first launch)
 *   - `error`      (fail-safe; reachable from splash timeout)
 *   - `(main)`     (group with the rest of the app, e.g. `/menu`)
 */

export default function RootLayout(): ReactNode {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void initI18n()
      .catch((error: unknown) => {
        logger.error('initI18n failed', error);
      })
      .finally(() => {
        // Render either way; i18next falls back to keys, keeping screens functional.
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Inner Stack that consumes the theme to set a theme-aware
 * `contentStyle.backgroundColor`. Without this the default white system
 * container flashes through under our dark screens during slide transitions
 * (см. `02_Specification/06-ui-spec.md` § "Анимации").
 */
function ThemedStack(): ReactNode {
  const { theme } = useTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: tokens.colors[theme.resolved].bgScreen },
    }),
    [theme.resolved],
  );

  return (
    <NumericKeypadProvider>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="disclaimer" options={{ gestureEnabled: false }} />
        <Stack.Screen name="error" />
        <Stack.Screen name="(main)" />
      </Stack>
      <NumericKeypadHost />
    </NumericKeypadProvider>
  );
}
