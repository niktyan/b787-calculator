import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { resetFlags, setFlag } from '../../../../core/feature-flags';
import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { SegmentedControl } from '../SegmentedControl';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

const impactAsyncMock = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;

type Surface = 'dry' | 'wet' | 'contaminated';

const surfaceOptions = [
  { value: 'dry' as const, label: 'Dry' },
  { value: 'wet' as const, label: 'Wet', disabled: true },
  { value: 'contaminated' as const, label: 'Contaminated', disabled: true },
];

describe('SegmentedControl', () => {
  beforeEach(() => {
    resetFlags();
    impactAsyncMock.mockClear();
  });

  it('renders three options with one active in dark theme', () => {
    const tree = renderWithTheme(
      <SegmentedControl<Surface>
        value="dry"
        options={surfaceOptions}
        onChange={jest.fn()}
        testID="rwy"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders in light theme', () => {
    const tree = renderWithTheme(
      <SegmentedControl<Surface>
        value="dry"
        options={surfaceOptions}
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
      <SegmentedControl<Surface>
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
      <SegmentedControl<Surface>
        value="dry"
        options={surfaceOptions}
        onChange={onChange}
        testID="rwy"
      />,
    );
    fireEvent.press(getByTestId('rwy-wet'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders 6 wrap-able options as a single row when wrap=false', () => {
    type RWYCC = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
    const options = [
      { value: 'a' as const, label: 'A' },
      { value: 'b' as const, label: 'B' },
      { value: 'c' as const, label: 'C' },
      { value: 'd' as const, label: 'D' },
      { value: 'e' as const, label: 'E' },
      { value: 'f' as const, label: 'F' },
    ];
    const tree = renderWithTheme(
      <SegmentedControl<RWYCC>
        value="a"
        options={options}
        onChange={jest.fn()}
        wrap={false}
        testID="rwy"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders 6 options as two rows of 3 when wrap=true', () => {
    type RWYCC = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
    const options = [
      { value: 'a' as const, label: 'A' },
      { value: 'b' as const, label: 'B' },
      { value: 'c' as const, label: 'C' },
      { value: 'd' as const, label: 'D' },
      { value: 'e' as const, label: 'E' },
      { value: 'f' as const, label: 'F' },
    ];
    const tree = renderWithTheme(
      <SegmentedControl<RWYCC>
        value="a"
        options={options}
        onChange={jest.fn()}
        wrap
        testID="rwy"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the regular size variant with larger track', () => {
    const tree = renderWithTheme(
      <SegmentedControl<Surface>
        value="dry"
        options={surfaceOptions}
        onChange={jest.fn()}
        size="regular"
        testID="rwy"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('haptic feedback', () => {
    it('fires light impact when selecting a non-disabled segment', () => {
      const { getByTestId } = renderWithTheme(
        <SegmentedControl<Surface>
          value="dry"
          options={[
            { value: 'dry', label: 'Dry' },
            { value: 'wet', label: 'Wet' },
          ]}
          onChange={jest.fn()}
          testID="rwy"
        />,
      );
      fireEvent.press(getByTestId('rwy-wet'));
      expect(impactAsyncMock).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('does not fire haptics when pressing a disabled segment', () => {
      const { getByTestId } = renderWithTheme(
        <SegmentedControl<Surface>
          value="dry"
          options={surfaceOptions}
          onChange={jest.fn()}
          testID="rwy"
        />,
      );
      fireEvent.press(getByTestId('rwy-wet'));
      expect(impactAsyncMock).not.toHaveBeenCalled();
    });

    it('does not fire haptics when enableHapticFeedback is off', () => {
      setFlag('enableHapticFeedback', false);
      const { getByTestId } = renderWithTheme(
        <SegmentedControl<Surface>
          value="dry"
          options={[
            { value: 'dry', label: 'Dry' },
            { value: 'wet', label: 'Wet' },
          ]}
          onChange={jest.fn()}
          testID="rwy"
        />,
      );
      fireEvent.press(getByTestId('rwy-wet'));
      expect(impactAsyncMock).not.toHaveBeenCalled();
    });
  });
});
