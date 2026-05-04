import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { SegmentedControl } from '../SegmentedControl';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock useWindowDimensions via the submodule path so per-test viewport
// fixtures drive the wrap-vs-single-row decision in SegmentedControl.
// Same pattern as src/__tests__/app/crosswind.test.tsx.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 0, height: 0, scale: 1, fontScale: 1 })),
}));

interface ViewportFixture {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly fontScale: number;
}

const COMPACT: ViewportFixture = { width: 480, height: 800, scale: 2, fontScale: 1 };
const REGULAR: ViewportFixture = { width: 1024, height: 768, scale: 2, fontScale: 1 };
const DEFAULT_VIEWPORT: ViewportFixture = { width: 0, height: 0, scale: 1, fontScale: 1 };

function getViewportMock(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native/Libraries/Utilities/useWindowDimensions').default as jest.Mock;
}

function mockViewport(viewport: ViewportFixture): void {
  getViewportMock().mockReturnValue(viewport);
}

afterEach(() => {
  getViewportMock().mockReturnValue(DEFAULT_VIEWPORT);
});

type Surface3 = 'dry' | 'wet' | 'contaminated';
type Surface6 = 'dry' | 'wet' | 'slipperyWet' | 'compactedSnow' | 'drySnow' | 'wetSnow';

const surface3Options = [
  { value: 'dry' as const, label: 'Dry' },
  { value: 'wet' as const, label: 'Wet', disabled: true },
  { value: 'contaminated' as const, label: 'Contaminated', disabled: true },
];

const surface6Options = [
  { value: 'dry' as const, label: 'Dry' },
  { value: 'wet' as const, label: 'Wet', disabled: true },
  { value: 'slipperyWet' as const, label: 'Slippery Wet', disabled: true },
  { value: 'compactedSnow' as const, label: 'Compacted Snow', disabled: true },
  { value: 'drySnow' as const, label: 'Dry Snow', disabled: true },
  { value: 'wetSnow' as const, label: 'Wet Snow', disabled: true },
];

describe('SegmentedControl', () => {
  it('renders three options with one active in dark theme', () => {
    const tree = renderWithTheme(
      <SegmentedControl<Surface3>
        value="dry"
        options={surface3Options}
        onChange={jest.fn()}
        testID="rwy"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders in light theme', () => {
    const tree = renderWithTheme(
      <SegmentedControl<Surface3>
        value="dry"
        options={surface3Options}
        onChange={jest.fn()}
        testID="rwy"
      />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('changes value on segment press', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <SegmentedControl<Surface3>
        value="dry"
        options={[
          { value: 'dry', label: 'Dry' },
          { value: 'wet', label: 'Wet' },
        ]}
        onChange={onChange}
        testID="rwy"
      />,
    );
    fireEvent.press(getByTestId('rwy-wet'));
    expect(onChange).toHaveBeenCalledWith('wet');
  });

  it('does not fire onChange for a disabled segment', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <SegmentedControl<Surface3>
        value="dry"
        options={surface3Options}
        onChange={onChange}
        testID="rwy"
      />,
    );
    fireEvent.press(getByTestId('rwy-wet'));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('wrap-on-compact (Polish-3)', () => {
    it('compact width + 6 options: track wraps with rowGap and segments adopt flexBasis', () => {
      mockViewport(COMPACT);
      const tree = renderWithTheme(
        <SegmentedControl<Surface6>
          value="dry"
          options={surface6Options}
          onChange={jest.fn()}
          testID="rwy"
        />,
        { mode: 'dark' },
      );
      const json = JSON.stringify(tree.toJSON());
      // Track gets flexWrap + rowGap when wrap is active.
      expect(json).toContain('"flexWrap":"wrap"');
      expect(json).toContain('"rowGap":8');
      // Segments adopt flexBasis "32%" instead of flex:1 only.
      expect(json).toContain('"flexBasis":"32%"');
    });

    it('regular width + 6 options: single-row track (no wrap), no rowGap', () => {
      mockViewport(REGULAR);
      const tree = renderWithTheme(
        <SegmentedControl<Surface6>
          value="dry"
          options={surface6Options}
          onChange={jest.fn()}
          testID="rwy"
        />,
        { mode: 'dark' },
      );
      const json = JSON.stringify(tree.toJSON());
      expect(json).not.toContain('"flexWrap":"wrap"');
      expect(json).not.toContain('"rowGap":8');
      expect(json).not.toContain('"flexBasis":"32%"');
    });

    it('compact width + 3 options: no wrap (count <= threshold)', () => {
      mockViewport(COMPACT);
      const tree = renderWithTheme(
        <SegmentedControl<Surface3>
          value="dry"
          options={surface3Options}
          onChange={jest.fn()}
          testID="rwy"
        />,
        { mode: 'dark' },
      );
      const json = JSON.stringify(tree.toJSON());
      expect(json).not.toContain('"flexWrap":"wrap"');
      expect(json).not.toContain('"rowGap":8');
      expect(json).not.toContain('"flexBasis":"32%"');
    });
  });
});
