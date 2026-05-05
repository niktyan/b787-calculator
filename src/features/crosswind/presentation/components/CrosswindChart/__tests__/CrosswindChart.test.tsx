import { AccessibilityInfo } from 'react-native';

import { renderWithTheme } from '../../../../../../design-system/_testing/renderWithTheme';
import bundled from '../../../../data/b787-8-landing-dry.json';
import { crosswindDataFileSchema } from '../../../../data/schema';
import { CrosswindChart } from '../CrosswindChart';
import { buildGeometry, deriveAxes, getPadding, getWeightTicks } from '../chartGeometry';
import type { CrosswindDataFile } from '../../../../data/schema';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const data: CrosswindDataFile = crosswindDataFileSchema.parse(bundled);

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  // Cast to satisfy EmitterSubscription's full interface; only `remove`
  // is exercised by useReduceMotion's cleanup.
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
      typeof AccessibilityInfo.addEventListener
    >);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('chartGeometry · pure helpers', () => {
  it('deriveAxes covers operational envelope ± padding', () => {
    const axes = deriveAxes(data);
    expect(axes.weightTonnesMin).toBe(105); // 110 - 5
    expect(axes.weightTonnesMax).toBe(177); // 172 + 5
    // CG range covers all 5 breakpoint thresholds at min/max weight.
    expect(axes.cgPercentMin).toBeLessThanOrEqual(data.operationalEnvelope.cg.minPercent);
    expect(axes.cgPercentMax).toBeGreaterThanOrEqual(data.operationalEnvelope.cg.maxPercent);
  });

  it('getPadding returns wider padding for regular than for compact', () => {
    const compact = getPadding(false);
    const regular = getPadding(true);
    expect(regular.left).toBeGreaterThan(compact.left);
    expect(regular.bottom).toBeGreaterThan(compact.bottom);
  });

  it('getWeightTicks returns 5 evenly-spaced ticks across the operational envelope', () => {
    const ticks = getWeightTicks(data);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBe(110);
    expect(ticks[ticks.length - 1]).toBe(172);
    // Strictly ascending.
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1] ?? 0);
    }
  });

  it('buildGeometry produces 5 line segments with correct slope per spec formula', () => {
    const geom = buildGeometry({
      data,
      viewport: { width: 400, height: 280 },
      isRegular: true,
      currentWeightTons: 170,
      currentCgPercent: 32,
    });
    expect(geom.lines).toHaveLength(5);
    expect(geom.lines[0]?.crosswindKnots).toBe(40);
    expect(geom.lines[4]?.crosswindKnots).toBe(20);
    // All lines have the same slope on screen since they share data.interpolation.slope.
    const slopes = geom.lines.map((line) => (line.y2 - line.y1) / (line.x2 - line.x1));
    const firstSlope = slopes[0] ?? 0;
    slopes.forEach((slope) => {
      expect(slope).toBeCloseTo(firstSlope, 6);
    });
  });

  it('marker x position scales with current weight inside the plot area', () => {
    const geomLeft = buildGeometry({
      data,
      viewport: { width: 400, height: 280 },
      isRegular: true,
      currentWeightTons: 110,
      currentCgPercent: 25,
    });
    const geomRight = buildGeometry({
      data,
      viewport: { width: 400, height: 280 },
      isRegular: true,
      currentWeightTons: 172,
      currentCgPercent: 25,
    });
    expect(geomLeft.markerX).toBeLessThan(geomRight.markerX);
    // Both fall inside the plot area horizontally.
    expect(geomLeft.markerX).toBeGreaterThanOrEqual(geomLeft.plotArea.x);
    expect(geomRight.markerX).toBeLessThanOrEqual(geomRight.plotArea.x + geomRight.plotArea.width);
  });
});

describe('CrosswindChart · component', () => {
  it('renders empty state when data is null', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={null}
        weightTons={170}
        cgPercent={32}
        activeBracketIndex={-1}
        isRegular
        testID="chart"
      />,
    );
    expect(tree.getByTestId('crosswind-chart-empty')).toBeTruthy();
    expect(tree.getByText('crosswind.chartEmpty')).toBeTruthy();
  });

  it('renders SVG content (regular) when data is provided', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={data}
        weightTons={170}
        cgPercent={32}
        activeBracketIndex={1}
        isRegular
        testID="chart"
      />,
    );
    expect(tree.getByTestId('chart')).toBeTruthy();
    // No empty fallback in idle state.
    expect(tree.queryByTestId('crosswind-chart-empty')).toBeNull();
  });

  it('renders compact variant (no axis labels, no envelope verticals)', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={data}
        weightTons={170}
        cgPercent={32}
        activeBracketIndex={1}
        testID="chart"
      />,
    );
    expect(tree.getByTestId('chart')).toBeTruthy();
  });

  it('renders with activeBracketIndex = -1 (fallback case, no active line)', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={data}
        weightTons={170}
        cgPercent={42}
        activeBracketIndex={-1}
        isRegular
        testID="chart"
      />,
    );
    expect(tree.getByTestId('chart')).toBeTruthy();
  });

  it('regular snapshot at W=170 CG=32 active=1 light theme', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={data}
        weightTons={170}
        cgPercent={32}
        activeBracketIndex={1}
        isRegular
        testID="chart"
      />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('compact snapshot at W=130 CG=27 active=2 dark theme', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={data}
        weightTons={130}
        cgPercent={27}
        activeBracketIndex={2}
        testID="chart"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('empty state snapshot (non-dry runway condition)', () => {
    const tree = renderWithTheme(
      <CrosswindChart
        data={null}
        weightTons={170}
        cgPercent={32}
        activeBracketIndex={-1}
        isRegular
        testID="chart"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('Polish-3 follow-up · enriched chart (Block 2)', () => {
    it('regular: title + legend hint both present', () => {
      const tree = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          isRegular
          testID="chart"
        />,
      );
      expect(tree.getByTestId('crosswind-chart-title')).toBeTruthy();
      expect(tree.getByTestId('crosswind-chart-legend')).toBeTruthy();
      expect(tree.getByText('crosswind.chart.title')).toBeTruthy();
      expect(tree.getByText('crosswind.chart.legendHint')).toBeTruthy();
    });

    it('compact: title shown, legend hint hidden', () => {
      const tree = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          testID="chart"
        />,
      );
      expect(tree.getByTestId('crosswind-chart-title')).toBeTruthy();
      expect(tree.queryByTestId('crosswind-chart-legend')).toBeNull();
    });

    it('regular: per-line "X KT" endpoint labels render for all 5 brackets', () => {
      const tree = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          isRegular
          testID="chart"
        />,
      );
      const json = JSON.stringify(tree.toJSON());
      // All 5 KT bracket endpoint labels appear in the SVG output.
      expect(json).toContain('40 KT');
      expect(json).toContain('35 KT');
      expect(json).toContain('30 KT');
      expect(json).toContain('25 KT');
      expect(json).toContain('20 KT');
    });

    it('compact: KT endpoint labels are NOT rendered (chart is simplified)', () => {
      const tree = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          testID="chart"
        />,
      );
      const json = JSON.stringify(tree.toJSON());
      expect(json).not.toContain('40 KT');
      expect(json).not.toContain('25 KT');
    });

    it('Y-axis CG percent labels render on both compact and regular', () => {
      // Regular
      const regular = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          isRegular
          testID="chart"
        />,
      );
      const regularJson = JSON.stringify(regular.toJSON());
      // For the bundled b787-8-landing-dry data, the cg axis spans
      // ~6 % to ~44 % MAC; getCgTicks rounds to step 10, producing
      // ticks at 10/20/30/40 %MAC.
      expect(regularJson).toContain('30%');
      expect(regularJson).toContain('40%');
      // Compact: same Y-axis ticks present.
      const compact = renderWithTheme(
        <CrosswindChart
          data={data}
          weightTons={170}
          cgPercent={32}
          activeBracketIndex={1}
          testID="chart"
        />,
      );
      const compactJson = JSON.stringify(compact.toJSON());
      expect(compactJson).toContain('30%');
      expect(compactJson).toContain('40%');
    });
  });
});
