import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDisclaimerStatus, useTheme, useTranslation } from '../core';
import { Screen, Stack, Text, tokens } from '../design-system';

/**
 * Splash route. Shows the brand placeholder while providers initialise, then
 * navigates per `02_Specification/06-ui-spec.md` Экран 1:
 *   - data ready & disclaimer accepted  → `/`     (Main Menu)
 *   - data ready & disclaimer pending   → `/disclaimer`
 *   - max wait exceeded with no status  → `/error`
 *
 * Min display time prevents flicker on warm starts; max wait acts as a
 * fail-safe upper bound on initialization.
 */

const SPLASH_MIN_MS = 800;
const SPLASH_MAX_MS = 5000;
const LOGO_SIZE = 96;

export default function Splash(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { status } = useDisclaimerStatus();
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    const maxTimer = setTimeout(() => setTimedOut(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (timedOut && status === 'unknown') {
      router.replace('/error');
      return;
    }
    if (minElapsed && status !== 'unknown') {
      router.replace(status === 'accepted' ? '/' : '/disclaimer');
    }
  }, [minElapsed, status, timedOut, router]);

  const palette = tokens.colors[theme.resolved];
  const styles = useMemo(
    () =>
      StyleSheet.create({
        fill: {
          flex: 1,
        },
        logo: {
          alignItems: 'center',
          backgroundColor: palette.accent,
          borderRadius: tokens.radii.xl,
          height: LOGO_SIZE,
          justifyContent: 'center',
          width: LOGO_SIZE,
        },
      }),
    [palette.accent],
  );

  const version = Application.nativeApplicationVersion ?? '0.0.0';

  return (
    <Screen testID="splash-screen">
      <Stack gap="lg" justify="center" align="center" style={styles.fill}>
        <View accessibilityLabel="B787 logo" style={styles.logo} testID="splash-logo">
          <Text variant="display" color="textOnAccent">
            B7
          </Text>
        </View>
        <Stack gap="xs" align="center">
          <Text variant="heading1">B787 Calculator</Text>
          <Text variant="body" color="textSecondary">
            {t('splash.tagline')}
          </Text>
          <Text variant="caption" color="textTertiary" testID="splash-version">
            v{version}
          </Text>
        </Stack>
      </Stack>
    </Screen>
  );
}
