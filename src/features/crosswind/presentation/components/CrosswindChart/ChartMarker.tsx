/**
 * Animated chart marker — circle with halo glow at the user's current
 * (Weight, CG) position. Slides smoothly via Reanimated when inputs
 * change; snaps when Reduce Motion is enabled.
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Visualization · CG / Crosswind chart"
 * (Marker subsection + Animations C/D).
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle as SvgCircle } from 'react-native-svg';

import type { ColorPalette } from '../../../../../design-system';
import { useReduceMotion } from '../../../../../design-system';

const MARKER_RADIUS = 6;
const MARKER_STROKE_WIDTH = 2.5;
const HALO_RADIUS = 12;
const HALO_OPACITY = 0.12;
const MARKER_TIMING_MS = 250;

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

interface ChartMarkerProps {
  readonly cx: number;
  readonly cy: number;
  readonly palette: ColorPalette;
}

export function ChartMarker({ cx, cy, palette }: ChartMarkerProps): ReactNode {
  const reduceMotion = useReduceMotion();
  const animatedCx = useSharedValue<number>(cx);
  const animatedCy = useSharedValue<number>(cy);

  useEffect(() => {
    if (reduceMotion) {
      animatedCx.value = cx;
      animatedCy.value = cy;
      return;
    }
    const easing = Easing.inOut(Easing.quad);
    animatedCx.value = withTiming(cx, { duration: MARKER_TIMING_MS, easing });
    animatedCy.value = withTiming(cy, { duration: MARKER_TIMING_MS, easing });
  }, [cx, cy, reduceMotion, animatedCx, animatedCy]);

  const haloProps = useAnimatedProps(() => ({
    cx: animatedCx.value,
    cy: animatedCy.value,
  }));
  const dotProps = useAnimatedProps(() => ({
    cx: animatedCx.value,
    cy: animatedCy.value,
  }));

  return (
    <>
      <AnimatedCircle
        animatedProps={haloProps}
        r={HALO_RADIUS}
        fill={palette.accent}
        opacity={HALO_OPACITY}
      />
      <AnimatedCircle
        animatedProps={dotProps}
        r={MARKER_RADIUS}
        fill={palette.accent}
        stroke={palette.bgCard}
        strokeWidth={MARKER_STROKE_WIDTH}
      />
    </>
  );
}
