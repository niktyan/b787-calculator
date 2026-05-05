/**
 * iPad-regular-width idle body for the Crosswind result panel.
 *
 * Polish-3 follow-up: the right column is now TWO sibling Cards
 * stacked vertically — `crosswind-result-summary` (status / value /
 * footnote / meta-grid) and `crosswind-chart-card` (chart with
 * `flex: 1` to fill remaining vertical space). The previous single
 * panel had `flex: 1` + `justifyContent: 'space-between'` which left
 * the chart and meta-grid visually escaping the panel border on
 * landscape; the two-Card structure scopes each subsection to its
 * own surface.
 *
 * Bypasses the design-system `<ResultPanel>` because the
 * regular-width variant uses the new `displayLarge` (72 pt) value,
 * `monoXL` (36 pt) KT suffix, and dual-Card layout — none of which
 * fit `ResultPanelState` (sealed by C2).
 *
 * Rendered only when `width >= tokens.breakpoints.regular`.
 * Compact-width path remains in `CrosswindResult` and uses
 * `<ResultPanel>` plus its own chart Card (sibling Stack).
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../../core';
import { Card, Text, tokens } from '../../../../design-system';
import type { ResultPanelMetaItem } from '../../../../design-system';
import type { CrosswindCalculationOutput, EnvelopeViolation } from '../../domain/types';
import type { ChartInputs } from '../useCrosswindCalculator';

import { CrosswindChart } from './CrosswindChart';

const KT_UNIT = 'KT';
const REGULAR_BORDER_WIDTH = 1;
const REGULAR_STATUS_LETTER_SPACING = 0.72; // ≈ 0.08em at 9pt
const REGULAR_META_LABEL_LETTER_SPACING = 0.36; // ≈ 0.04em at 9pt
const REGULAR_KT_SUFFIX_MARGIN_LEFT = 8;
const REGULAR_META_VALUE_MARGIN_TOP = 4;
const REGULAR_META_GRID_GAP = 12;
const REGULAR_META_BASIS = '48%';

const STATUS_STYLE: TextStyle = {
  letterSpacing: REGULAR_STATUS_LETTER_SPACING,
  textTransform: 'uppercase',
};
const META_LABEL_STYLE: TextStyle = {
  letterSpacing: REGULAR_META_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};

export interface RegularIdleBodyProps {
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly chart: ChartInputs | null;
  readonly meta: readonly ResultPanelMetaItem[];
  readonly statusLabel: string;
  readonly footnote: string;
  readonly warningText: string;
}

interface ResultSummaryProps {
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly meta: readonly ResultPanelMetaItem[];
  readonly statusLabel: string;
  readonly footnote: string;
  readonly warningText: string;
  readonly dividerStyle: ViewStyle;
}

function ResultSummaryCard(props: ResultSummaryProps): ReactNode {
  const { output, warning, meta, statusLabel, footnote, warningText, dividerStyle } = props;
  return (
    <Card padding="lg" radius="lg" testID="crosswind-result-summary">
      <View style={styles.summaryStack}>
        <Text variant="microUppercase" color="accent" style={STATUS_STYLE}>
          {statusLabel}
        </Text>
        <View style={styles.valueBlock}>
          <Text
            variant="displayLarge"
            color="accent"
            allowFontScaling={false}
            accessibilityLabel={`${output.maxCrosswindKnots} ${KT_UNIT}`}
          >
            {String(output.maxCrosswindKnots)}
          </Text>
          <Text variant="monoXL" color="textSecondary" style={styles.ktSuffix}>
            {KT_UNIT}
          </Text>
        </View>
        {warning !== null ? (
          <View style={styles.warningChip} testID="crosswind-warning-chip">
            <Text variant="caption" color="warn">
              {warningText}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" color="textSecondary" align="center">
          {footnote}
        </Text>
        <View style={dividerStyle}>
          <View style={styles.metaGrid} testID="crosswind-meta-grid">
            {meta.map((item) => (
              <View key={item.label} style={styles.metaItem}>
                <Text variant="microUppercase" color="textTertiary" style={META_LABEL_STYLE}>
                  {item.label}
                </Text>
                <Text variant="mono" color="textPrimary" style={styles.metaValue}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}

interface ChartCardProps {
  readonly chart: ChartInputs | null;
}

function ChartCard({ chart }: ChartCardProps): ReactNode {
  if (chart === null) {
    return null;
  }
  return (
    <Card padding="lg" radius="lg" style={styles.chartCard} testID="crosswind-chart-card">
      <CrosswindChart
        data={chart.data}
        weightTons={chart.weightTons}
        cgPercent={chart.cgPercent}
        activeBracketIndex={chart.activeBracketIndex}
        isRegular
        testID="crosswind-chart"
      />
    </Card>
  );
}

export function RegularIdleBody(props: RegularIdleBodyProps): ReactNode {
  const { output, warning, chart, meta, statusLabel, footnote, warningText } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const dividerStyle = useMemo<ViewStyle>(
    () => ({
      borderTopColor: palette.border,
      borderTopWidth: REGULAR_BORDER_WIDTH,
      paddingTop: tokens.spacing.md,
    }),
    [palette.border],
  );

  return (
    <View style={styles.column} testID="crosswind-result-panel">
      <ResultSummaryCard
        output={output}
        warning={warning}
        meta={meta}
        statusLabel={statusLabel}
        footnote={footnote}
        warningText={warningText}
        dividerStyle={dividerStyle}
      />
      <ChartCard chart={chart} />
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    flex: 1,
  },
  column: {
    flex: 1,
    gap: tokens.spacing.md,
  },
  ktSuffix: {
    marginLeft: REGULAR_KT_SUFFIX_MARGIN_LEFT,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: REGULAR_META_GRID_GAP,
  },
  metaItem: {
    flexBasis: REGULAR_META_BASIS,
  },
  metaValue: {
    marginTop: REGULAR_META_VALUE_MARGIN_TOP,
  },
  summaryStack: {
    gap: tokens.spacing.md,
  },
  valueBlock: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  warningChip: {
    marginTop: tokens.spacing.sm,
  },
});
