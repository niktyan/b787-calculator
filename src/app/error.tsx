import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { logger, useTranslation } from '../core';
import { Button, Screen, Stack, Text } from '../design-system';

/**
 * Fail-safe error screen (см. `02_Specification/06-ui-spec.md` Экран 7).
 *
 * Reached when initialization times out or bundled reference data fails to
 * load. Retry re-enters the splash flow; Contact support opens the system
 * mail composer. The screen has no other navigation paths.
 */

// Support email is finalised in Phase B per
// `02_Specification/07-app-store-compliance.md` Open questions #2.
const SUPPORT_MAILTO = 'mailto:?subject=B787%20Calculator%20support';

export default function ErrorScreen(): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();

  const onRetry = useCallback((): void => {
    router.replace('/');
  }, [router]);

  const onContactSupport = useCallback((): void => {
    void Linking.openURL(SUPPORT_MAILTO).catch((error: unknown) => {
      logger.warn('error.contactSupport failed', error);
    });
  }, []);

  const styles = useMemo(() => StyleSheet.create({ fill: { flex: 1 } }), []);
  const version = Application.nativeApplicationVersion ?? '0.0.0';

  return (
    <Screen testID="error-screen">
      <Stack gap="xl" justify="space-between" align="center" style={styles.fill}>
        <Stack gap="md" align="center">
          <Text variant="heading1" align="center">
            {t('error.referenceDataUnavailable')}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {t('error.referenceDataDescription')}
          </Text>
        </Stack>
        <Stack gap="md" align="stretch">
          <Button label={t('common.retry')} onPress={onRetry} testID="error-retry" />
          <Button
            label={t('error.contactSupport')}
            onPress={onContactSupport}
            variant="secondary"
            testID="error-contact"
          />
        </Stack>
        <Text variant="caption" color="textTertiary" align="center" testID="error-version">
          v{version}
        </Text>
      </Stack>
    </Screen>
  );
}
