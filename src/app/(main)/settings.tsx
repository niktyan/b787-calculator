import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { useTranslation } from '../../core';
import { Screen, Stack, Text } from '../../design-system';

/**
 * Settings placeholder. Will be replaced by the real Settings screen in
 * Sprint 06 (см. `02_Specification/06-ui-spec.md` Экран 5).
 */
export default function SettingsPlaceholder(): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen testID="settings-screen">
      <Stack gap="sm" justify="center" align="center" style={styles.fill}>
        <Text variant="heading2">{t('settings.title')}</Text>
        <Text variant="body" color="textSecondary" align="center">
          {t('placeholder.settingsBody')}
        </Text>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
