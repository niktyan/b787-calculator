import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { BackButton } from '../BackButton';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('BackButton', () => {
  it('renders with default label in dark theme', () => {
    const tree = renderWithTheme(<BackButton onPress={jest.fn()} testID="back" />, {
      mode: 'dark',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with custom label in light theme', () => {
    const tree = renderWithTheme(<BackButton onPress={jest.fn()} label="Modules" testID="back" />, {
      mode: 'light',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(<BackButton onPress={onPress} testID="back" />);
    fireEvent.press(getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
