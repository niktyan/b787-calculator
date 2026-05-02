import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { useTranslation } from '../../core';
import { Screen, Stack, Text } from '../../design-system';

/**
 * About placeholder. Will be replaced by the real About screen in
 * Sprint 06 (см. `02_Specification/06-ui-spec.md` Экран 6).
 */
export default function AboutPlaceholder(): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen testID="about-screen">
      <Stack gap="sm" justify="center" align="center" style={styles.fill}>
        <Text variant="heading2">{t('about.title')}</Text>
        <Text variant="body" color="textSecondary" align="center">
          {t('placeholder.aboutBody')}
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
