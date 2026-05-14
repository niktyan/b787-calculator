import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { tokens } from '../../tokens';
import { Row } from '../Row/Row';
import { Text } from '../Text/Text';

export interface BackButtonProps {
  readonly onPress: () => void;
  readonly label?: string;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

const ARROW = '←';

export function BackButton({
  onPress,
  label = 'Back',
  accessibilityLabel,
  testID,
}: BackButtonProps): ReactNode {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        pressed: {
          opacity: 0.6,
        },
        root: {
          alignSelf: 'flex-start',
          minHeight: tokens.layout.minTouchTarget,
          minWidth: tokens.layout.minTouchTarget,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.sm,
        },
      }),
    [],
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      hitSlop={tokens.spacing.sm}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.root, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <Row gap="xs" align="center">
        <Text variant="body" color="accentText">
          {ARROW}
        </Text>
        <Text variant="body" color="accentText">
          {label}
        </Text>
      </Row>
    </Pressable>
  );
}
