/**
 * Empty-state body for CrosswindChart — shown when the active runway
 * condition has no bundled lookup data (Polish-3: any non-`dry` value).
 *
 * Polish-3 follow-up: surface is provided by the parent `<Card>`; this
 * component only paints centered icon + caption inside whatever box the
 * parent gives it.
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart"
 * (Empty state subsection).
 */

import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, useTranslation } from '../../../../../core';
import { Text, tokens } from '../../../../../design-system';

const ICON_SIZE = 32;
const TEXT_MAX_WIDTH = 240;

export function ChartEmpty(): ReactNode {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];

  return (
    <View accessibilityRole="summary" style={styles.container} testID="crosswind-chart-empty">
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
  container: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.sm,
    justifyContent: 'center',
    padding: tokens.spacing.md,
    width: '100%',
  },
  message: {
    maxWidth: TEXT_MAX_WIDTH,
  },
});
