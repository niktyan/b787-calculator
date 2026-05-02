import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Screen, Stack, Text } from '../../design-system';

/**
 * Main Menu placeholder. Will be replaced by the real Main Menu in a later sprint
 * (see `02_Specification/06-ui-spec.md` Экран 3). Splash and Disclaimer flow
 * navigate here on success.
 */
export default function MainMenu(): ReactNode {
  return (
    <Screen testID="main-menu-screen">
      <Stack gap="sm" justify="center" align="center" style={styles.fill}>
        <Text variant="heading1">B787 Calculator</Text>
        <Text variant="body" color="textSecondary">
          Main Menu placeholder
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
