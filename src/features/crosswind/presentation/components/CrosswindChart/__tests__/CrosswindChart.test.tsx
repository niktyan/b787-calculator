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
});
