import type { ReactNode } from 'react';

import { Text } from '../Text/Text';
import type { TextProps } from '../Text/Text';

export type MonoTextProps = Omit<TextProps, 'variant'>;

/**
 * Convenience wrapper around Text with the `mono` typography variant — used for
 * numbers, codes and other tabular data where character alignment matters.
 */
export function MonoText(props: MonoTextProps): ReactNode {
  return <Text {...props} variant="mono" />;
}
