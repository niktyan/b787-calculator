/**
 * iPad-regular-width idle body for the Crosswind result panel.
 *
 * Bypasses the design-system `<ResultPanel>` because the
 * regular-width variant uses the new `displayLarge` (72 pt) value,
 * `monoXL` (36 pt) KT suffix, and full-height `flex: 1` layout — all
 * three would require extending `ResultPanelState`, which is sealed
 * by C2 decision (см. `02_Specification/module-contracts/design-system.md`).
 *
 * Rendered only when `width >= tokens.breakpoints.regularHeader`.
 * Compact-width path remains in `CrosswindResult` and continues to
 * use `<ResultPanel>` unchanged.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../../core';
import { Text, tokens } from '../../../../design-system';
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

interface TopGroupProps {
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly statusLabel: string;
  readonly footnote: string;
  readonly warningText: string;
}

function TopGroup({
  output,
  warning,
  statusLabel,
  footnote,
  warningText,
}: TopGroupProps): ReactNode {
  return (
    <View style={styles.topGroup}>
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
    </View>
  );
}

interface BottomGroupProps {
  readonly chart: ChartInputs | null;
  readonly meta: readonly ResultPanelMetaItem[];
  readonly dividerStyle: ViewStyle;
}

function BottomGroup({ chart, meta, dividerStyle }: BottomGroupProps): ReactNode {
  return (
    <View style={styles.bottomGroup}>
      {chart !== null ? (
        <View style={styles.chart} testID="crosswind-chart-slot">
          <CrosswindChart
            data={chart.data}
            weightTons={chart.weightTons}
            cgPercent={chart.cgPercent}
            activeBracketIndex={chart.activeBracketIndex}
            isRegular
            testID="crosswind-chart"
          />
        </View>
      ) : null}
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
  );
}

export function RegularIdleBody(props: RegularIdleBodyProps): ReactNode {
  const { output, warning, chart, meta, statusLabel, footnote, warningText } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const panelStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: REGULAR_BORDER_WIDTH,
      flex: 1,
      justifyContent: 'space-between',
      padding: tokens.spacing.lg,
    }),
    [palette.bgCard, palette.border],
  );
  const dividerStyle = useMemo<ViewStyle>(
    () => ({
      borderTopColor: palette.border,
      borderTopWidth: REGULAR_BORDER_WIDTH,
      paddingTop: tokens.spacing.md,
    }),
    [palette.border],
  );

  // Layout split into two anchored groups so the meta-grid never escapes
  // the panel's bottom border. With the previous flat 6-children layout
  // and `justifyContent: 'space-between'`, the wrapped second row of a
  // 3-item meta-grid (CG / RWY / Range) rendered visually below the
  // panel border on iPad regular. By containing meta-grid inside a
  // bottom-group wrapper, space-between only distributes the two top
  // and bottom groups, and the wrapped row stays inside the bottom
  // wrapper's bounds.
  return (
    <View style={panelStyle} testID="crosswind-result-panel">
      <TopGroup
        output={output}
        warning={warning}
        statusLabel={statusLabel}
        footnote={footnote}
        warningText={warningText}
      />
      <BottomGroup chart={chart} meta={meta} dividerStyle={dividerStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomGroup: {
    gap: tokens.spacing.sm,
  },
  chart: {
    paddingHorizontal: tokens.spacing.sm,
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
  topGroup: {
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
