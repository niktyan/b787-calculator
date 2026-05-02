import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { tokens } from '../../tokens';
import { Button } from '../Button/Button';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

export interface ErrorStateProps {
  readonly title: string;
  readonly description: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
  readonly icon?: ReactNode;
  readonly testID?: string;
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  icon,
  testID,
}: ErrorStateProps): ReactNode {
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

  const showRetry = onRetry !== undefined && retryLabel !== undefined;

  return (
    <View accessibilityRole="alert" style={styles.root} testID={testID}>
      <Stack gap="md" align="center">
        {icon}
        <Text variant="heading2" color="textPrimary" align="center">
          {title}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {description}
        </Text>
        {showRetry ? (
          <Button
            label={retryLabel}
            onPress={onRetry}
            variant="secondary"
            testID={testID === undefined ? undefined : `${testID}-retry`}
          />
        ) : null}
      </Stack>
    </View>
  );
}
