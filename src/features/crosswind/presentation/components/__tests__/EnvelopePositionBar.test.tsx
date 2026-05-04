import { AccessibilityInfo } from 'react-native';

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import { EnvelopePositionBar } from '../EnvelopePositionBar';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const BASE_PROPS = {
  axisMin: 8,
  axisMax: 50,
  operationalMin: 8,
  operationalMax: 35,
  lookupMax: 41.39,
};

describe('EnvelopePositionBar', () => {
  let isReduceMotionEnabledSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest-expo's default AccessibilityInfo mock returns undefined from
    // isReduceMotionEnabled, which breaks `.then(...)` inside
    // useReduceMotion. Provide a deterministic Promise<false> default
    // for every test; the reduce-motion-on test overrides locally.
    isReduceMotionEnabledSpy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    isReduceMotionEnabledSpy.mockRestore();
  });

  it('renders three zones + marker for default mid-range CG', () => {
    const tree = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={25} testID="envelope-bar" />,
    );
    expect(tree.getByTestId('envelope-bar')).toBeTruthy();
    expect(tree.getByTestId('envelope-bar-zone-safe')).toBeTruthy();
    expect(tree.getByTestId('envelope-bar-zone-boundary')).toBeTruthy();
    expect(tree.getByTestId('envelope-bar-zone-out-of-lookup')).toBeTruthy();
    expect(tree.getByTestId('envelope-bar-marker')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('snapshots marker pinned at left edge (currentCG = axisMin)', () => {
    const tree = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={BASE_PROPS.axisMin} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('snapshots marker centered (currentCG = midpoint)', () => {
    const midpoint = (BASE_PROPS.axisMin + BASE_PROPS.axisMax) / 2;
    const tree = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={midpoint} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('snapshots marker pinned at right edge (currentCG = axisMax)', () => {
    const tree = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={BASE_PROPS.axisMax} />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('snapshots regular-width variant (taller bar)', () => {
    const tree = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={25} isRegular />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('snapshots when Reduce Motion is enabled (marker snaps, no animation)', async () => {
    isReduceMotionEnabledSpy.mockResolvedValue(true);
    const tree = renderWithTheme(<EnvelopePositionBar {...BASE_PROPS} currentCG={25} />);
    // Allow the AccessibilityInfo subscription resolution to land.
    await Promise.resolve();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('clamps CG below axisMin to the left edge', () => {
    const tree = renderWithTheme(<EnvelopePositionBar {...BASE_PROPS} currentCG={-5} />);
    expect(tree.getByTestId('envelope-bar-marker')).toBeTruthy();
  });

  it('clamps CG above axisMax to the right edge', () => {
    const tree = renderWithTheme(<EnvelopePositionBar {...BASE_PROPS} currentCG={100} />);
    expect(tree.getByTestId('envelope-bar-marker')).toBeTruthy();
  });

  it('exposes accessibilityValue with min/max/now for VoiceOver', () => {
    const { getByTestId } = renderWithTheme(
      <EnvelopePositionBar {...BASE_PROPS} currentCG={25.7} testID="envelope-bar" />,
    );
    const root = getByTestId('envelope-bar');
    expect(root.props.accessibilityRole).toBe('adjustable');
    const accessibilityValue = root.props.accessibilityValue as {
      min: number;
      max: number;
      now: number;
    };
    expect(accessibilityValue).toEqual({ min: 8, max: 50, now: 26 });
  });
});
