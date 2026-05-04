/**
 * Operational-envelope dashed verticals at weightMin and weightMax.
 *
 * Each is a 1pt dashed stroke with vertical fade gradient (full opacity
 * in the middle, fading to 0 at top and bottom ~10% of the line).
 * Implemented via SVG `<LinearGradient>` referenced as the line's
 * stroke pattern through a stroke="url(#...)" reference.
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart"
 * (Operational envelope subsection).
 */

import type { ReactNode } from 'react';
import {
  Defs as SvgDefs,
  G,
  Line as SvgLine,
  LinearGradient as SvgLinearGradient,
  Stop as SvgStop,
} from 'react-native-svg';

import type { ColorPalette } from '../../../../../design-system';

import type { ChartGeometry } from './chartGeometry';

const STROKE_WIDTH = 1;
const STROKE_DASHARRAY = '4 4';
const FADE_TOP_OFFSET = 0.1;
const FADE_BOTTOM_OFFSET = 0.9;
const GRADIENT_ID_MIN = 'envelopeFadeMin';
const GRADIENT_ID_MAX = 'envelopeFadeMax';

interface ChartEnvelopeProps {
  readonly geometry: ChartGeometry;
  readonly palette: ColorPalette;
}

export function ChartEnvelope({ geometry, palette }: ChartEnvelopeProps): ReactNode {
  const { plotArea, envelopeWeightMinX, envelopeWeightMaxX } = geometry;
  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;

  return (
    <G>
      <SvgDefs>
        {[GRADIENT_ID_MIN, GRADIENT_ID_MAX].map((id) => (
          <SvgLinearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <SvgStop offset="0" stopColor={palette.envelopeBarOutOfLookup} stopOpacity={0} />
            <SvgStop
              offset={FADE_TOP_OFFSET}
              stopColor={palette.envelopeBarOutOfLookup}
              stopOpacity={1}
            />
            <SvgStop
              offset={FADE_BOTTOM_OFFSET}
              stopColor={palette.envelopeBarOutOfLookup}
              stopOpacity={1}
            />
            <SvgStop offset="1" stopColor={palette.envelopeBarOutOfLookup} stopOpacity={0} />
          </SvgLinearGradient>
        ))}
      </SvgDefs>
      <SvgLine
        x1={envelopeWeightMinX}
        y1={top}
        x2={envelopeWeightMinX}
        y2={bottom}
        stroke={`url(#${GRADIENT_ID_MIN})`}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={STROKE_DASHARRAY}
      />
      <SvgLine
        x1={envelopeWeightMaxX}
        y1={top}
        x2={envelopeWeightMaxX}
        y2={bottom}
        stroke={`url(#${GRADIENT_ID_MAX})`}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={STROKE_DASHARRAY}
      />
    </G>
  );
}
