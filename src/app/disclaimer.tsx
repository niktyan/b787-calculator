import * as Application from 'expo-application';
import { Stack as RouterStack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { acceptDisclaimer, useTheme, useTranslation } from '../core';
import {
  Button,
  Disclaimer as DisclaimerCard,
  Screen,
  Stack,
  Text,
  tokens,
} from '../design-system';

/**
 * First-launch advisory disclaimer (см. `02_Specification/06-ui-spec.md` Экран 2).
 *
 * Body text is intentionally fixed English in every locale per
 * `02_Specification/07-app-store-compliance.md` — legal unambiguity. The
 * `disclaimer.title` / `disclaimer.body` keys ship the same English string
 * in both `en.json` and `ru.json` to make this invariant explicit and
 * keep the screen on the standard `useTranslation()` path.
 *
 * Layout mirrors `03_Mockups/index.html` "Splash + first-launch" composition:
 * brand block (B7 logo + heading + subtitle), amber disclaimer card, and the
 * accept button — all stacked centred.
 */

const LOGO_SIZE = 56;
const LOGO_RADIUS = 14;

export default function Disclaimer(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const onAccept = useCallback((): void => {
    void acceptDisclaimer().then(() => {
      router.replace('/menu');
    });
  }, [router]);

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
          borderRadius: LOGO_RADIUS,
          height: LOGO_SIZE,
          justifyContent: 'center',
          width: LOGO_SIZE,
        },
      }),
    [palette.accent],
  );

  const version = Application.nativeApplicationVersion ?? '0.0.0';

  return (
    <Screen testID="disclaimer-screen">
      <RouterStack.Screen options={{ gestureEnabled: false }} />
      <Stack gap="lg" justify="center" align="center" style={styles.fill}>
        <View accessibilityLabel="B787 logo" style={styles.logo} testID="disclaimer-logo">
          <Text variant="monoLarge" color="textOnAccent">
            B7
          </Text>
        </View>
        <Stack gap="xs" align="center">
          <Text variant="heading3">B787 Tools</Text>
          <Text variant="caption" color="textSecondary">
            {t('splash.tagline')} · v{version}
          </Text>
        </Stack>
        <DisclaimerCard
          title={t('disclaimer.title')}
          body={t('disclaimer.body')}
          testID="disclaimer-card"
        />
        <Button label={t('disclaimer.continue')} onPress={onAccept} testID="disclaimer-accept" />
      </Stack>
    </Screen>
  );
}
