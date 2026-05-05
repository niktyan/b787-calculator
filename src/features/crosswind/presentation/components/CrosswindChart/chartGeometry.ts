/**
 * Pure geometry helpers for CrosswindChart.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4 → "Visualization · CG /
 * Crosswind chart". The chart plots 5 parallel lines in (Weight, CG)
 * space — each line is the CG-threshold for one bracket value
 * (40/35/30/25/20 KT) at varying landing weights, computed from the
 * Excel-equivalent formula `cgPercent = slope × weightKilolbs +
 * intercept[i]`.
 *
 * No React, no react-native, no SVG primitives — pure functions only.
 * Imported by CrosswindChart.tsx (and tested independently).
 */

import type { CrosswindDataFile } from '../../../data/schema';

export interface ChartViewport {
  readonly width: number;
  readonly height: number;
}

export interface ChartPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ChartAxes {
  readonly weightTonnesMin: number;
  readonly weightTonnesMax: number;
  readonly cgPercentMin: number;
  readonly cgPercentMax: number;
}

export interface DataLine {
  readonly bracketIndex: number;
  readonly crosswindKnots: number;
  /** Line endpoint at axis weightTonnesMin. */
  readonly x1: number;
  readonly y1: number;
  /** Line endpoint at axis weightTonnesMax. */
  readonly x2: number;
  readonly y2: number;
}

export interface ChartGeometry {
  readonly axes: ChartAxes;
  readonly plotArea: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly lines: readonly DataLine[];
  readonly markerX: number;
  readonly markerY: number;
  readonly envelopeWeightMinX: number;
  readonly envelopeWeightMaxX: number;
}

/**
 * Padding around the plot area (axis labels + chart whitespace).
 * Compact gets tighter padding because there are no Y-axis labels.
 */
const COMPACT_PADDING: ChartPadding = { top: 8, right: 12, bottom: 16, left: 36 };
// Regular keeps extra room on the right for per-line "X KT" endpoint
// labels (Polish-3 follow-up Block 2).
const REGULAR_PADDING: ChartPadding = { top: 16, right: 48, bottom: 24, left: 44 };

const WEIGHT_PADDING_TONNES = 5;
const CG_PADDING_PERCENT = 2;

export function getPadding(isRegular: boolean): ChartPadding {
  return isRegular ? REGULAR_PADDING : COMPACT_PADDING;
}

/**
 * Computes the chart's axis ranges from the bundled lookup data.
 *
 * Weight axis: covers operational envelope ± 5 t padding (so envelope
 * markers stay visible inside the plot).
 * CG axis: covers the lookup CG range at any weight inside the
 * operational envelope, ± 2 % MAC padding.
 */
export function deriveAxes(data: CrosswindDataFile): ChartAxes {
  const env = data.operationalEnvelope;
  const slope = data.interpolation.slope;
  const factor = data.weightConversion.tonsToKilolbsFactor;
  const breakpoints = data.interpolation.breakpoints;
  const firstBp = breakpoints[0];
  const lastBp = breakpoints[breakpoints.length - 1];

  const weightTonnesMin = env.weight.minTons - WEIGHT_PADDING_TONNES;
  const weightTonnesMax = env.weight.maxTons + WEIGHT_PADDING_TONNES;

  // CG range from line at minWeight, first breakpoint (lowest threshold)
  // to line at maxWeight, last breakpoint (highest threshold).
  const cgAtMinW =
    firstBp === undefined
      ? env.cg.minPercent
      : slope * (env.weight.minTons * factor) + firstBp.intercept;
  const cgAtMaxW =
    lastBp === undefined
      ? env.cg.maxPercent
      : slope * (env.weight.maxTons * factor) + lastBp.intercept;
  const cgPercentMin = Math.min(cgAtMinW, env.cg.minPercent) - CG_PADDING_PERCENT;
  const cgPercentMax = Math.max(cgAtMaxW, env.cg.maxPercent) + CG_PADDING_PERCENT;

  return { weightTonnesMin, weightTonnesMax, cgPercentMin, cgPercentMax };
}

interface ScreenMapper {
  readonly mapX: (weightTonnes: number) => number;
  readonly mapY: (cgPercent: number) => number;
}

function buildMapper(
  viewport: ChartViewport,
  padding: ChartPadding,
  axes: ChartAxes,
): ScreenMapper {
  const plotW = viewport.width - padding.left - padding.right;
  const plotH = viewport.height - padding.top - padding.bottom;
  const wRange = axes.weightTonnesMax - axes.weightTonnesMin;
  const cgRange = axes.cgPercentMax - axes.cgPercentMin;
  return {
    mapX: (weightTonnes: number): number =>
      padding.left + ((weightTonnes - axes.weightTonnesMin) / wRange) * plotW,
    // Y axis is inverted: higher CG → lower screen Y.
    mapY: (cgPercent: number): number =>
      padding.top + plotH - ((cgPercent - axes.cgPercentMin) / cgRange) * plotH,
  };
}

/**
 * Build the full chart geometry from data + viewport + current input.
 *
 * Produces screen-space coordinates ready for SVG rendering. Caller
 * passes weights in tonnes and CG in % MAC; geometry handles the
 * tons-to-kilolbs conversion internally for the line equations.
 */
export function buildGeometry(args: {
  readonly data: CrosswindDataFile;
  readonly viewport: ChartViewport;
  readonly isRegular: boolean;
  readonly currentWeightTons: number;
  readonly currentCgPercent: number;
}): ChartGeometry {
  const { data, viewport, isRegular, currentWeightTons, currentCgPercent } = args;
  const padding = getPadding(isRegular);
  const axes = deriveAxes(data);
  const { mapX, mapY } = buildMapper(viewport, padding, axes);
  const slope = data.interpolation.slope;
  const factor = data.weightConversion.tonsToKilolbsFactor;

  const lines: DataLine[] = data.interpolation.breakpoints.map((bp, i) => {
    const cgAtMinW = slope * (axes.weightTonnesMin * factor) + bp.intercept;
    const cgAtMaxW = slope * (axes.weightTonnesMax * factor) + bp.intercept;
    return {
      bracketIndex: i,
      crosswindKnots: bp.crosswindKnots,
      x1: mapX(axes.weightTonnesMin),
      y1: mapY(cgAtMinW),
      x2: mapX(axes.weightTonnesMax),
      y2: mapY(cgAtMaxW),
    };
  });

  return {
    axes,
    plotArea: {
      x: padding.left,
      y: padding.top,
      width: viewport.width - padding.left - padding.right,
      height: viewport.height - padding.top - padding.bottom,
    },
    lines,
    markerX: mapX(currentWeightTons),
    markerY: mapY(currentCgPercent),
    envelopeWeightMinX: mapX(data.operationalEnvelope.weight.minTons),
    envelopeWeightMaxX: mapX(data.operationalEnvelope.weight.maxTons),
  };
}

const WEIGHT_TICK_COUNT = 5;
const WEIGHT_TICK_INTERVALS = WEIGHT_TICK_COUNT - 1;
const WEIGHT_TICK_STEP_3 = 3;
const CG_TICK_COUNT = 5;
const CG_TICK_ROUND_TO = 5;

/**
 * Tick label values for the X axis (weight in tonnes). 5 evenly-spaced
 * inside the operational envelope range.
 */
export function getWeightTicks(data: CrosswindDataFile): readonly number[] {
  const env = data.operationalEnvelope.weight;
  const span = env.maxTons - env.minTons;
  const step = span / WEIGHT_TICK_INTERVALS;
  return [
    env.minTons,
    env.minTons + step,
    env.minTons + 2 * step,
    env.minTons + WEIGHT_TICK_STEP_3 * step,
    env.maxTons,
  ];
}

/**
 * Tick label values for the Y axis (CG % MAC). 5 evenly-spaced ticks
 * rounded to the nearest 5 for readable axis labels (e.g., 25, 30, 35,
 * 40, 45 % MAC).
 */
export function getCgTicks(axes: ChartAxes): readonly number[] {
  const span = axes.cgPercentMax - axes.cgPercentMin;
  const stepRaw = span / (CG_TICK_COUNT - 1);
  // Round step up to nearest 5 for clean labels.
  const step = Math.max(CG_TICK_ROUND_TO, Math.ceil(stepRaw / CG_TICK_ROUND_TO) * CG_TICK_ROUND_TO);
  const start = Math.ceil(axes.cgPercentMin / CG_TICK_ROUND_TO) * CG_TICK_ROUND_TO;
  const ticks: number[] = [];
  for (let i = 0; i < CG_TICK_COUNT; i += 1) {
    const value = start + i * step;
    if (value > axes.cgPercentMax) break;
    ticks.push(value);
  }
  return ticks;
}
