import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { tokens } from '../../tokens';
import type { SpacingToken } from '../../tokens';

type Align = 'stretch' | 'flex-start' | 'flex-end' | 'center';
type Justify = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';

export interface StackProps {
  readonly children: ReactNode;
  readonly gap?: SpacingToken;
  readonly align?: Align;
  readonly justify?: Justify;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export function Stack({
  children,
  gap = 'md',
  align = 'stretch',
  justify = 'flex-start',
  style,
  testID,
}: StackProps): ReactNode {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: align,
          flexDirection: 'column',
          gap: tokens.spacing[gap],
          justifyContent: justify,
        },
      }),
    [align, gap, justify],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      {children}
    </View>
  );
}
