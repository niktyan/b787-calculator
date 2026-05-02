import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';

export interface ScreenProps {
  readonly children: ReactNode;
  readonly testID?: string;
  /** Disable horizontal padding when the screen lays out content edge-to-edge. */
  readonly edgeToEdge?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function Screen({ children, testID, edgeToEdge = false, style }: ScreenProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          flex: 1,
          paddingHorizontal: edgeToEdge ? 0 : tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        safe: {
          backgroundColor: palette.bgPage,
          flex: 1,
        },
      }),
    [palette.bgPage, edgeToEdge],
  );

  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}
