/**
 * Empty-state body for CrosswindChart — shown when the active runway
 * condition has no bundled lookup data (Polish-3: any non-`dry` value).
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart"
 * (Empty state subsection).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme, useTranslation } from '../../../../../core';
import { Text, tokens } from '../../../../../design-system';

const ICON_SIZE = 32;
const TEXT_MAX_WIDTH = 240;

interface ChartEmptyProps {
  readonly height: number;
}

export function ChartEmpty({ height }: ChartEmptyProps): ReactNode {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderRadius: tokens.radii.md,
      gap: tokens.spacing.sm,
      height,
      justifyContent: 'center',
      padding: tokens.spacing.md,
      width: '100%',
    }),
    [palette.bgCard, height],
  );

  return (
    <View accessibilityRole="summary" style={containerStyle} testID="crosswind-chart-empty">
      <MaterialIcons name="inbox" size={ICON_SIZE} color={palette.textTertiary} />
      <View style={styles.message}>
        <Text variant="caption" color="textSecondary" align="center">
          {t('crosswind.chartEmpty')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    maxWidth: TEXT_MAX_WIDTH,
  },
});
