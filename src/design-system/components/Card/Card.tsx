import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { RadiusToken, ShadowToken, SpacingToken } from '../../tokens';

export interface CardProps {
  readonly children: ReactNode;
  readonly padding?: SpacingToken;
  readonly radius?: RadiusToken;
  readonly elevation?: ShadowToken;
  /** When set, renders a tinted accent border (used by the active module card). */
  readonly highlighted?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export function Card({
  children,
  padding = 'lg',
  radius = 'lg',
  elevation = 'none',
  highlighted = false,
  style,
  testID,
}: CardProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: palette.bgCard,
          borderColor: highlighted ? palette.accent : palette.border,
          borderRadius: tokens.radii[radius],
          borderWidth: 1,
          padding: tokens.spacing[padding],
          ...tokens.shadows[elevation],
        },
      }),
    [elevation, highlighted, padding, palette.accent, palette.bgCard, palette.border, radius],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      {children}
    </View>
  );
}
