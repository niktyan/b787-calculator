/**
 * Visual indicator showing where the current CG sits relative to the
 * operational + lookup envelopes on the CG axis.
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Envelope-position bar"
 * (PR `feat/crosswind-polish-2`).
 *
 * Three zones along the CG axis (axisMin → axisMax), rendered as
 * contiguous flex children of a horizontal bar:
 *
 *   axisMin ─── safe (operational) ─── boundary ─── out-of-lookup ─── axisMax
 *
 *  - safe:           [operationalMin, operationalMax]   colors.accentSoft
 *  - boundary:       (operationalMax, lookupMax]        colors.envelopeBarBoundary
 *  - out-of-lookup:  (lookupMax, axisMax]               colors.envelopeBarOutOfLookup
 *
 * (The portion of the axis below operationalMin would also be a
 * violation, but the bar starts at axisMin = operationalMin in
 * practice — the wiring sets axisMin to operationalMin so there's
 * nothing to draw to its left.)
 *
 * A 2 pt vertical marker positioned at `currentCG` slides smoothly
 * via Reanimated `withTiming(200ms)`. Reduce-Motion bypass via
 * `useReduceMotion`: the marker snaps instantly when the system
 * preference is enabled.
 */

import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, useTranslation } from '../../../../core';
import { Text, tokens, useReduceMotion } from '../../../../design-system';

export interface EnvelopePositionBarProps {
  readonly currentCG: number;
  readonly axisMin: number;
  readonly axisMax: number;
  readonly operationalMin: number;
  readonly operationalMax: number;
  readonly lookupMax: number;
  readonly isRegular?: boolean;
  readonly testID?: string | undefined;
}

const BAR_HEIGHT_COMPACT = 8;
const BAR_HEIGHT_REGULAR = 12;
const BAR_RADIUS = 4;
const MARKER_WIDTH = 2;
const MARKER_OVERHANG = 4;
const MARKER_ANIMATION_MS = 200;
const MARKER_HORIZONTAL_OFFSET = MARKER_WIDTH / 2;
const FULL_PERCENT = 100;
const PROGRESS_INPUT_RANGE_END = 1;

const UPPERCASE_STYLE = { textTransform: 'uppercase' as const };

interface ZoneFlex {
  readonly safe: number;
  readonly boundary: number;
  readonly outOfLookup: number;
  readonly total: number;
}

function clamp01(x: number): number {
  if (x < 0) {
    return 0;
  }
  if (x > PROGRESS_INPUT_RANGE_END) {
    return PROGRESS_INPUT_RANGE_END;
  }
  return x;
}

function relativePosition(value: number, axisMin: number, axisMax: number): number {
  const span = axisMax - axisMin;
  if (span <= 0) {
    return 0;
  }
  return clamp01((value - axisMin) / span);
}

function computeZoneFlex(props: {
  readonly axisMin: number;
  readonly axisMax: number;
  readonly operationalMin: number;
  readonly operationalMax: number;
  readonly lookupMax: number;
}): ZoneFlex {
  const safeMin = Math.max(props.axisMin, props.operationalMin);
  const safeMax = Math.min(props.operationalMax, props.axisMax);
  const boundaryMax = Math.min(Math.max(props.lookupMax, safeMax), props.axisMax);
  const safe = Math.max(0, safeMax - safeMin);
  const boundary = Math.max(0, boundaryMax - safeMax);
  const outOfLookup = Math.max(0, props.axisMax - boundaryMax);
  return { safe, boundary, outOfLookup, total: safe + boundary + outOfLookup };
}

function formatBound(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(0);
}

interface BarTrackProps {
  readonly barHeight: number;
  readonly zones: ZoneFlex;
  readonly markerStyle: ViewStyle;
  readonly markerAnimatedStyle: ViewStyle;
}

function BarTrack({
  barHeight,
  zones,
  markerStyle,
  markerAnimatedStyle,
}: BarTrackProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const trackStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: BAR_RADIUS,
      flexDirection: 'row',
      height: barHeight,
      overflow: 'hidden',
      width: '100%',
    }),
    [barHeight],
  );
  const safeStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.accentSoft, flexGrow: zones.safe }),
    [palette.accentSoft, zones.safe],
  );
  const boundaryStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.envelopeBarBoundary, flexGrow: zones.boundary }),
    [palette.envelopeBarBoundary, zones.boundary],
  );
  const outOfLookupStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.envelopeBarOutOfLookup, flexGrow: zones.outOfLookup }),
    [palette.envelopeBarOutOfLookup, zones.outOfLookup],
  );

  return (
    <View style={trackStyle} testID="envelope-bar-track">
      {zones.total > 0 ? (
        <>
          <View style={safeStyle} testID="envelope-bar-zone-safe" />
          <View style={boundaryStyle} testID="envelope-bar-zone-boundary" />
          <View style={outOfLookupStyle} testID="envelope-bar-zone-out-of-lookup" />
        </>
      ) : null}
      <Animated.View style={[markerStyle, markerAnimatedStyle]} testID="envelope-bar-marker" />
    </View>
  );
}

function useMarkerProgress(targetProgress: number): {
  readonly animatedStyle: ViewStyle;
} {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue<number>(targetProgress);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = targetProgress;
      return;
    }
    progress.value = withTiming(targetProgress, {
      duration: MARKER_ANIMATION_MS,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, reduceMotion, targetProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: `${progress.value * FULL_PERCENT}%`,
  }));
  return { animatedStyle };
}

export function EnvelopePositionBar(props: EnvelopePositionBarProps): ReactNode {
  const { currentCG, axisMin, axisMax, isRegular = false, testID } = props;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];

  const zones = useMemo(() => computeZoneFlex(props), [props]);
  const barHeight = isRegular ? BAR_HEIGHT_REGULAR : BAR_HEIGHT_COMPACT;
  const markerHeight = barHeight + MARKER_OVERHANG;
  const targetProgress = relativePosition(currentCG, axisMin, axisMax);
  const { animatedStyle } = useMarkerProgress(targetProgress);

  const markerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.accent,
      height: markerHeight,
      marginLeft: -MARKER_HORIZONTAL_OFFSET,
      position: 'absolute',
      top: -(MARKER_OVERHANG / 2),
      width: MARKER_WIDTH,
    }),
    [markerHeight, palette.accent],
  );

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={t('crosswind.envelopeBarLabel')}
      accessibilityValue={{ min: axisMin, max: axisMax, now: Math.round(currentCG) }}
      style={styles.root}
      testID={testID}
    >
      <View style={styles.trackContainer}>
        <BarTrack
          barHeight={barHeight}
          zones={zones}
          markerStyle={markerStyle}
          markerAnimatedStyle={animatedStyle}
        />
      </View>
      <View style={styles.boundsRow}>
        <Text variant="microUppercase" color="textTertiary" style={UPPERCASE_STYLE}>
          {`${formatBound(axisMin)}%`}
        </Text>
        <Text variant="microUppercase" color="textTertiary" style={UPPERCASE_STYLE}>
          {`${formatBound(axisMax)}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.xs,
  },
  root: {
    width: '100%',
  },
  trackContainer: {
    paddingTop: MARKER_OVERHANG / 2,
  },
});
