/**
 * Static axis layer for CrosswindChart — baseline + tick marks + labels.
 *
 * No animation, no shared values; pure SVG primitives. Spec:
 * 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart"
 * (Axis subsection).
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { G, Line as SvgLine, Text as SvgText } from 'react-native-svg';

import type { ColorPalette } from '../../../../../design-system';
import { tokens } from '../../../../../design-system';

import { getWeightTicks } from './chartGeometry';
import type { ChartGeometry } from './chartGeometry';
import type { CrosswindDataFile } from '../../../data/schema';

const AXIS_BASELINE_OPACITY = 0.5;
const TICK_HEIGHT = 3;
const TICK_LABEL_GAP = 4;
const LABEL_FONT_SIZE = 9;
const LABEL_LETTER_SPACING = 0.54;

interface ChartAxisProps {
  readonly data: CrosswindDataFile;
  readonly geometry: ChartGeometry;
  readonly palette: ColorPalette;
  readonly isRegular: boolean;
}

export function ChartAxis({ data, geometry, palette, isRegular }: ChartAxisProps): ReactNode {
  const { plotArea } = geometry;
  const baselineY = plotArea.y + plotArea.height;

  const allTicks = useMemo(() => getWeightTicks(data), [data]);
  // Compact: only first + last tick. Regular: all 5.
  const ticks = isRegular ? allTicks : [allTicks[0], allTicks[allTicks.length - 1]];

  const wRange = geometry.axes.weightTonnesMax - geometry.axes.weightTonnesMin;
  const mapX = (w: number): number =>
    plotArea.x + ((w - geometry.axes.weightTonnesMin) / wRange) * plotArea.width;

  return (
    <G>
      {/* X-axis baseline (no Y-axis line per spec). */}
      <SvgLine
        x1={plotArea.x}
        y1={baselineY}
        x2={plotArea.x + plotArea.width}
        y2={baselineY}
        stroke={palette.border}
        strokeWidth={1}
        opacity={AXIS_BASELINE_OPACITY}
      />
      {/* Tick marks + labels. */}
      {ticks.map((tickValue) => {
        if (tickValue === undefined) return null;
        const x = mapX(tickValue);
        return (
          <G key={`tick-${tickValue}`}>
            <SvgLine
              x1={x}
              y1={baselineY}
              x2={x}
              y2={baselineY + TICK_HEIGHT}
              stroke={palette.border}
              strokeWidth={1}
              opacity={AXIS_BASELINE_OPACITY}
            />
            <SvgText
              x={x}
              y={baselineY + TICK_HEIGHT + TICK_LABEL_GAP + LABEL_FONT_SIZE}
              fontSize={LABEL_FONT_SIZE}
              fontFamily={tokens.typography.fontFamily.sans}
              fontWeight="600"
              letterSpacing={LABEL_LETTER_SPACING}
              fill={palette.textTertiary}
              textAnchor="middle"
            >
              {/* SvgText is a react-native-svg primitive, not RN's Text;
                  the no-raw-text rule misfires here. */}
              {/* eslint-disable-next-line react-native/no-raw-text */}
              {`${tickValue.toFixed(0)} t`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}
