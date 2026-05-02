import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { tokens } from '../../tokens';
import type { SpacingToken } from '../../tokens';

type Align = 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
type Justify = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';

export interface RowProps {
  readonly children: ReactNode;
  readonly gap?: SpacingToken;
  readonly align?: Align;
  readonly justify?: Justify;
  readonly wrap?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export function Row({
  children,
  gap = 'sm',
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
  testID,
}: RowProps): ReactNode {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: align,
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: tokens.spacing[gap],
          justifyContent: justify,
        },
      }),
    [align, gap, justify, wrap],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      {children}
    </View>
  );
}
