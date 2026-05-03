import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { useTranslation } from '../../core';
import { Screen, Stack, Text } from '../../design-system';

/**
 * Crosswind module placeholder. Will be replaced by the real Crosswind
 * Calculator screen in the next sprint
 * (см. `02_Specification/06-ui-spec.md` Экран 4).
 */
export default function CrosswindPlaceholder(): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen testID="crosswind-screen">
      <Stack gap="sm" justify="center" align="center" style={styles.fill}>
        <Text variant="heading2">Crosswind · Landing</Text>
        <Text variant="body" color="textSecondary" align="center">
          {t('placeholder.crosswindBody')}
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
