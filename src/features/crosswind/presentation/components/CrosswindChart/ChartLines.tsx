/**
 * Five lookup-bracket lines + active-line gradient fill.
 *
 * Active line (current CG bracket): full opacity, accent color, 2.5pt
 * stroke; gradient fill below the line decorates the active band so
 * the eye finds it without color noise. Inactive lines: muted
 * `textSecondary`, 1.25pt stroke, opacity 0.18 — visible but
 * subordinate. On Reduce Motion the bracket-swap fade is instantaneous
 * (handled by parent's useEffect choreography).
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart".
 */

import type { ReactNode } from 'react';
import {
  Defs as SvgDefs,
  G,
  Line as SvgLine,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  Stop as SvgStop,
  Text as SvgText,
} from 'react-native-svg';

import type { ColorPalette } from '../../../../../design-system';
import { tokens } from '../../../../../design-system';

import type { ChartGeometry, DataLine } from './chartGeometry';

const ACTIVE_STROKE_WIDTH = 2.5;
const INACTIVE_STROKE_WIDTH = 1.25;
const INACTIVE_OPACITY = 0.18;
const INACTIVE_LABEL_OPACITY = 0.5;
const ACTIVE_FILL_OPACITY_TOP = 0.18;
const ACTIVE_FILL_OPACITY_BOTTOM = 0;
const GRADIENT_ID = 'crosswindChartActiveFill';
const LABEL_FONT_SIZE = 9;
const LABEL_OFFSET_X = 4;
const LABEL_OFFSET_Y = 3;

interface ChartLinesProps {
  readonly geometry: ChartGeometry;
  readonly activeBracketIndex: number;
  readonly palette: ColorPalette;
  readonly showEndpointLabels?: boolean;
}

function buildActiveFillPath(line: DataLine, plotBottomY: number): string {
  // Active line + close down to plot baseline + back to start = filled
  // polygon below the line. SVG Path: M start L end L bottom-right L
  // bottom-left Z.
  return `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2} L ${line.x2} ${plotBottomY} L ${line.x1} ${plotBottomY} Z`;
}

export function ChartLines({
  geometry,
  activeBracketIndex,
  palette,
  showEndpointLabels = false,
}: ChartLinesProps): ReactNode {
  const plotBottomY = geometry.plotArea.y + geometry.plotArea.height;
  const activeLine = geometry.lines[activeBracketIndex];

  return (
    <G>
      <SvgDefs>
        <SvgLinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <SvgStop offset="0" stopColor={palette.accent} stopOpacity={ACTIVE_FILL_OPACITY_TOP} />
          <SvgStop offset="1" stopColor={palette.accent} stopOpacity={ACTIVE_FILL_OPACITY_BOTTOM} />
        </SvgLinearGradient>
      </SvgDefs>

      {activeLine !== undefined ? (
        <SvgPath d={buildActiveFillPath(activeLine, plotBottomY)} fill={`url(#${GRADIENT_ID})`} />
      ) : null}

      {geometry.lines.map((line) => {
        if (line.bracketIndex === activeBracketIndex) return null;
        return (
          <SvgLine
            key={`line-${line.bracketIndex}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={palette.textSecondary}
            strokeWidth={INACTIVE_STROKE_WIDTH}
            opacity={INACTIVE_OPACITY}
          />
        );
      })}

      {activeLine !== undefined ? (
        <SvgLine
          x1={activeLine.x1}
          y1={activeLine.y1}
          x2={activeLine.x2}
          y2={activeLine.y2}
          stroke={palette.accent}
          strokeWidth={ACTIVE_STROKE_WIDTH}
        />
      ) : null}

      {/* Per-line "X KT" endpoint labels at the right edge — gives the
          KT-bracket context that the Y-axis (CG % MAC) doesn't carry. */}
      {showEndpointLabels
        ? geometry.lines.map((line) => {
            const isActive = line.bracketIndex === activeBracketIndex;
            return (
              <SvgText
                key={`label-${line.bracketIndex}`}
                x={line.x2 + LABEL_OFFSET_X}
                y={line.y2 + LABEL_OFFSET_Y}
                fontSize={LABEL_FONT_SIZE}
                fontFamily={tokens.typography.fontFamily.sans}
                fontWeight="600"
                fill={isActive ? palette.accent : palette.textTertiary}
                opacity={isActive ? 1 : INACTIVE_LABEL_OPACITY}
                textAnchor="start"
              >
                {/* eslint-disable-next-line react-native/no-raw-text */}
                {`${line.crosswindKnots} KT`}
              </SvgText>
            );
          })
        : null}
    </G>
  );
}
