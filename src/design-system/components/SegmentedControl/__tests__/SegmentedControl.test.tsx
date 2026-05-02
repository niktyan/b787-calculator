import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { SegmentedControl } from '../SegmentedControl';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Surface = 'dry' | 'wet' | 'contaminated';

const surfaceOptions = [
  { value: 'dry' as const, label: 'Dry' },
  { value: 'wet' as const, label: 'Wet', disabled: true },
  { value: 'contaminated' as const, label: 'Contaminated', disabled: true },
];

describe('SegmentedControl', () => {
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
});
