import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, initI18n, logger } from '../core';

/**
 * Composition root for the app shell:
 *   - SafeAreaProvider — required by the design-system `<Screen>` component.
 *   - ThemeProvider    — supplies design-system colour tokens.
 *   - i18n init        — runs once, gates rendering of children.
 *
 * Routes registered here:
 *   - `splash`     (initial route)
 *   - `disclaimer` (no swipe-back; locked screen during first launch)
 *   - `error`      (fail-safe; reachable from splash timeout)
 *   - `(main)`     (group with the rest of the app)
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
        <Stack initialRouteName="splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="disclaimer" options={{ gestureEnabled: false }} />
          <Stack.Screen name="error" />
          <Stack.Screen name="(main)" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
