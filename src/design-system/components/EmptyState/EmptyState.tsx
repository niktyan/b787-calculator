import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { tokens } from '../../tokens';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  /** Optional decorative or informational icon — caller supplies a node. */
  readonly icon?: ReactNode;
  readonly testID?: string;
}

export function EmptyState({ title, description, icon, testID }: EmptyStateProps): ReactNode {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          padding: tokens.spacing.xl,
        },
      }),
    [],
  );

  return (
    <View accessibilityLabel={title} accessibilityRole="text" style={styles.root} testID={testID}>
      <Stack gap="md" align="center">
        {icon}
        <Text variant="heading2" color="textPrimary" align="center">
          {title}
        </Text>
        {description !== undefined ? (
          <Text variant="body" color="textSecondary" align="center">
            {description}
          </Text>
        ) : null}
      </Stack>
    </View>
  );
}
