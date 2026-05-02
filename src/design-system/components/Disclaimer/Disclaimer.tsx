import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

export interface DisclaimerProps {
  readonly title: string;
  readonly body: string;
  readonly testID?: string;
}

export function Disclaimer({ title, body, testID }: DisclaimerProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: palette.warnSoft,
          borderColor: palette.warn,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: tokens.spacing.lg,
        },
      }),
    [palette.warn, palette.warnSoft],
  );

  return (
    <View accessibilityLabel={title} accessibilityRole="alert" style={styles.root} testID={testID}>
      <Stack gap="sm">
        <Text variant="label" color="warn">
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {body}
        </Text>
      </Stack>
    </View>
  );
}
