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

const CARD_MAX_WIDTH = 380;
const CARD_PADDING_VERTICAL = 14;
const CARD_PADDING_HORIZONTAL = 16;
const CARD_BORDER_RADIUS = 10;
const TITLE_PREFIX = '⚠  '; // ⚠ + double space (mockup uses prefix glyph + gap)

const titleStyle = { textTransform: 'uppercase' } as const;

export function Disclaimer({ title, body, testID }: DisclaimerProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: palette.warnSoft,
          borderColor: palette.warnBorder,
          borderRadius: CARD_BORDER_RADIUS,
          borderWidth: 1,
          maxWidth: CARD_MAX_WIDTH,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
          paddingVertical: CARD_PADDING_VERTICAL,
        },
      }),
    [palette.warnBorder, palette.warnSoft],
  );

  return (
    <View accessibilityLabel={title} accessibilityRole="alert" style={styles.root} testID={testID}>
      <Stack gap="xs">
        <Text variant="chipLabel" color="warn" style={titleStyle}>
          {TITLE_PREFIX}
          {title}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {body}
        </Text>
      </Stack>
    </View>
  );
}
