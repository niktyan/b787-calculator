import { Stack as RouterStack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';

import { acceptDisclaimer, useTranslation } from '../core';
import { Button, Screen, Stack, Text } from '../design-system';

/**
 * First-launch advisory disclaimer (см. `02_Specification/06-ui-spec.md` Экран 2).
 *
 * Body text is intentionally fixed English in every locale per
 * `02_Specification/07-app-store-compliance.md` — legal unambiguity.
 * Title and button label remain on the i18n path so non-legal copy can
 * still be localised; today both locales show the same English wording.
 */

const DISCLAIMER_TITLE_EN = 'Advisory only';

const DISCLAIMER_BODY_EN =
  'Advisory only. Calculations provide conservative reference values for ' +
  'Boeing 787 operations. Final operational decisions must always be based ' +
  "on official Boeing FCOM/QRH and your operator's procedures. Not for " +
  'primary navigation or operational use.';

export default function Disclaimer(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const onAccept = useCallback((): void => {
    void acceptDisclaimer().then(() => {
      router.replace('/menu');
    });
  }, [router]);

  const styles = useMemo(() => StyleSheet.create({ fill: { flex: 1 } }), []);

  return (
    <Screen testID="disclaimer-screen">
      <RouterStack.Screen options={{ gestureEnabled: false }} />
      <Stack gap="xl" justify="space-between" style={styles.fill}>
        <Stack gap="lg">
          <Text variant="heading1" testID="disclaimer-title">
            {DISCLAIMER_TITLE_EN}
          </Text>
          <Text variant="body" testID="disclaimer-body">
            {DISCLAIMER_BODY_EN}
          </Text>
        </Stack>
        <Button label={t('disclaimer.continue')} onPress={onAccept} testID="disclaimer-accept" />
      </Stack>
    </Screen>
  );
}
