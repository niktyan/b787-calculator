/**
 * Static axis layer for CrosswindChart — X / Y baselines + tick marks +
 * tick labels.
 *
 * Y axis is CG % MAC (the actual quantity plotted on the vertical
 * axis); each chart line carries a separate "X KT" endpoint label
 * (rendered by ChartLines) so the pilot sees both axis position and
 * KT-bracket context.
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

import { getCgTicks, getWeightTicks } from './chartGeometry';
import type { ChartGeometry } from './chartGeometry';
import type { CrosswindDataFile } from '../../../data/schema';

const AXIS_BASELINE_OPACITY = 0.5;
const TICK_HEIGHT = 3;
const TICK_LABEL_GAP = 4;
const LABEL_FONT_SIZE = 9;
const LABEL_LETTER_SPACING = 0.54;
const Y_LABEL_VERTICAL_OFFSET = 3;

interface ChartAxisProps {
  readonly data: CrosswindDataFile;
  readonly geometry: ChartGeometry;
  readonly palette: ColorPalette;
  readonly isRegular: boolean;
}

interface XAxisProps {
  readonly data: CrosswindDataFile;
  readonly geometry: ChartGeometry;
  readonly palette: ColorPalette;
  readonly isRegular: boolean;
}

function XAxis({ data, geometry, palette, isRegular }: XAxisProps): ReactNode {
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
      <SvgLine
        x1={plotArea.x}
        y1={baselineY}
        x2={plotArea.x + plotArea.width}
        y2={baselineY}
        stroke={palette.border}
        strokeWidth={1}
        opacity={AXIS_BASELINE_OPACITY}
      />
      {ticks.map((tickValue) => {
        if (tickValue === undefined) return null;
        const x = mapX(tickValue);
        return (
          <G key={`tick-x-${tickValue}`}>
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
              {/* eslint-disable-next-line react-native/no-raw-text */}
              {`${tickValue.toFixed(0)} t`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

interface YAxisProps {
  readonly geometry: ChartGeometry;
  readonly palette: ColorPalette;
}

function YAxis({ geometry, palette }: YAxisProps): ReactNode {
  const { plotArea, axes } = geometry;
  const ticks = useMemo(() => getCgTicks(axes), [axes]);
  const cgRange = axes.cgPercentMax - axes.cgPercentMin;
  const mapY = (cg: number): number =>
    plotArea.y + plotArea.height - ((cg - axes.cgPercentMin) / cgRange) * plotArea.height;

  return (
    <G>
      <SvgLine
        x1={plotArea.x}
        y1={plotArea.y}
        x2={plotArea.x}
        y2={plotArea.y + plotArea.height}
        stroke={palette.border}
        strokeWidth={1}
        opacity={AXIS_BASELINE_OPACITY}
      />
      {ticks.map((tickValue) => {
        const y = mapY(tickValue);
        return (
          <G key={`tick-y-${tickValue}`}>
            <SvgLine
              x1={plotArea.x - TICK_HEIGHT}
              y1={y}
              x2={plotArea.x}
              y2={y}
              stroke={palette.border}
              strokeWidth={1}
              opacity={AXIS_BASELINE_OPACITY}
            />
            <SvgText
              x={plotArea.x - TICK_HEIGHT - TICK_LABEL_GAP}
              y={y + Y_LABEL_VERTICAL_OFFSET}
              fontSize={LABEL_FONT_SIZE}
              fontFamily={tokens.typography.fontFamily.sans}
              fontWeight="600"
              letterSpacing={LABEL_LETTER_SPACING}
              fill={palette.textTertiary}
              textAnchor="end"
            >
              {/* eslint-disable-next-line react-native/no-raw-text */}
              {`${tickValue.toFixed(0)}%`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

export function ChartAxis({ data, geometry, palette, isRegular }: ChartAxisProps): ReactNode {
  return (
    <G>
      <XAxis data={data} geometry={geometry} palette={palette} isRegular={isRegular} />
      <YAxis geometry={geometry} palette={palette} />
    </G>
  );
}
