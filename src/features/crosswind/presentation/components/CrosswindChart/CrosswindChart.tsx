/**
 * CG / Crosswind chart — Polish-3 visualization replacing the
 * EnvelopePositionBar.
 *
 * Visual: 5 piecewise-linear lookup-bracket lines in (Weight, CG) space,
 * each labeled by its crosswind KT value (40/35/30/25/20). Active line
 * (current CG bracket) accent-colored with subtle gradient fill below;
 * inactive lines muted at 0.18 opacity. Marker circle (with halo glow)
 * at the user's (Weight, CG) input. Operational-envelope dashed
 * verticals at weightMin / weightMax with vertical fade.
 *
 * Compact variant (< 768 pt): only active line + marker, height 140 pt.
 * Regular variant (≥ 768 pt): full chart, height 280 pt.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4 → "Visualization · CG /
 * Crosswind chart"; ADR-0007 (react-native-svg adoption).
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { useTheme, useTranslation } from '../../../../../core';
import { Text, tokens, useReduceMotion } from '../../../../../design-system';
import type { CrosswindDataFile } from '../../../data/schema';

import { buildGeometry } from './chartGeometry';
import { ChartAxis } from './ChartAxis';
import { ChartEmpty } from './ChartEmpty';
import { ChartEnvelope } from './ChartEnvelope';
import { ChartLines } from './ChartLines';
import { ChartMarker } from './ChartMarker';

const COMPACT_HEIGHT = 140;
const REGULAR_HEIGHT = 280;
const SURFACE_FADE_DURATION_MS = 200;
const DEFAULT_VIEWPORT_WIDTH = 320;

export interface CrosswindChartProps {
  readonly data: CrosswindDataFile | null;
  readonly weightTons: number;
  readonly cgPercent: number;
  /**
   * Index 0–4 into `data.interpolation.breakpoints` of the active CG
   * bracket's upper edge. -1 means no active line (below/above-envelope
   * fallback cases — marker still renders, no line is highlighted).
   */
  readonly activeBracketIndex: number;
  readonly isRegular?: boolean;
  readonly testID?: string;
}

export function CrosswindChart(props: CrosswindChartProps): ReactNode {
  const { data, weightTons, cgPercent, activeBracketIndex, isRegular = false, testID } = props;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const palette = tokens.colors[theme.resolved];

  const [measuredWidth, setMeasuredWidth] = useState<number>(DEFAULT_VIEWPORT_WIDTH);
  const onLayout = (event: LayoutChangeEvent): void => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && next !== measuredWidth) {
      setMeasuredWidth(next);
    }
  };

  // Polish-3 follow-up: chart no longer carries its own bgCard / border /
  // radius — it renders as transparent SVG content inside a parent
  // `<Card>` provided by RegularIdleBody / CrosswindResult. This avoids
  // double-surface visual artefacts when the parent already has its own
  // border. ChartEmpty also drops its surface for the same reason.
  const height = isRegular ? REGULAR_HEIGHT : COMPACT_HEIGHT;
  const svgWrapperStyle = useMemo<ViewStyle>(() => ({ height, width: '100%' }), [height]);

  const title = (
    <Text variant="caption" color="textSecondary" testID="crosswind-chart-title">
      {t('crosswind.chart.title')}
    </Text>
  );

  if (data === null) {
    return (
      <View style={styles.container} testID={testID}>
        {title}
        <View style={svgWrapperStyle} onLayout={onLayout}>
          <ChartEmpty />
        </View>
      </View>
    );
  }

  const geometry = buildGeometry({
    data,
    viewport: { width: measuredWidth, height },
    isRegular,
    currentWeightTons: weightTons,
    currentCgPercent: cgPercent,
  });

  return (
    <View style={styles.container} testID={testID}>
      {title}
      <Animated.View
        {...(reduceMotion ? {} : { entering: FadeIn.duration(SURFACE_FADE_DURATION_MS) })}
        onLayout={onLayout}
        style={svgWrapperStyle}
      >
        <Svg width={measuredWidth} height={height}>
          {isRegular ? <ChartEnvelope geometry={geometry} palette={palette} /> : null}
          <ChartLines
            geometry={geometry}
            activeBracketIndex={activeBracketIndex}
            palette={palette}
            showEndpointLabels={isRegular}
          />
          <ChartAxis data={data} geometry={geometry} palette={palette} isRegular={isRegular} />
          <ChartMarker cx={geometry.markerX} cy={geometry.markerY} palette={palette} />
        </Svg>
      </Animated.View>
      {isRegular ? (
        <Text variant="caption" color="textTertiary" testID="crosswind-chart-legend">
          {t('crosswind.chart.legendHint')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
    width: '100%',
  },
});
