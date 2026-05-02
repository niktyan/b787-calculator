import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Text as RNText } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorToken, TypographyToken } from '../../tokens';

export type TextVariant = TypographyToken;

export interface TextProps {
  readonly children: ReactNode;
  readonly variant?: TextVariant;
  /** Palette token to colour the text with. Defaults to `textPrimary`. */
  readonly color?: ColorToken;
  readonly align?: 'left' | 'right' | 'center' | 'justify';
  readonly numberOfLines?: number;
  /** Set to false for fixed-size content like the calculator result number. */
  readonly allowFontScaling?: boolean;
  readonly accessibilityLabel?: string | undefined;
  readonly testID?: string | undefined;
  readonly style?: StyleProp<TextStyle>;
}

export function Text({
  children,
  variant = 'body',
  color = 'textPrimary',
  align,
  numberOfLines,
  allowFontScaling = true,
  accessibilityLabel,
  testID,
  style,
}: TextProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const variantStyle = tokens.typography.variants[variant];

  const composed = useMemo<TextStyle>(
    () => ({
      color: palette[color],
      fontFamily: variantStyle.fontFamily,
      fontSize: variantStyle.fontSize,
      fontWeight: variantStyle.fontWeight,
      letterSpacing: variantStyle.letterSpacing,
      lineHeight: variantStyle.lineHeight,
      textAlign: align ?? 'auto',
    }),
    [
      align,
      color,
      palette,
      variantStyle.fontFamily,
      variantStyle.fontSize,
      variantStyle.fontWeight,
      variantStyle.letterSpacing,
      variantStyle.lineHeight,
    ],
  );

  return (
    <RNText
      accessibilityLabel={accessibilityLabel}
      allowFontScaling={allowFontScaling}
      numberOfLines={numberOfLines}
      style={[composed, style]}
      testID={testID}
    >
      {children}
    </RNText>
  );
}
