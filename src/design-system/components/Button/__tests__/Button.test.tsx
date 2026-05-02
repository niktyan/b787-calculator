import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Button } from '../Button';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Button', () => {
  it('renders primary variant in dark theme', () => {
    const tree = renderWithTheme(<Button label="Continue" onPress={jest.fn()} testID="btn" />, {
      mode: 'dark',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders primary variant in light theme', () => {
    const tree = renderWithTheme(<Button label="Continue" onPress={jest.fn()} testID="btn" />, {
      mode: 'light',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders secondary and ghost variants', () => {
    const tree = renderWithTheme(
      <>
        <Button label="Cancel" onPress={jest.fn()} variant="secondary" />
        <Button label="Skip" onPress={jest.fn()} variant="ghost" />
      </>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders disabled state with accessibility flag', () => {
    const tree = renderWithTheme(
      <Button label="Confirm" onPress={jest.fn()} disabled testID="btn" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Button label="Tap me" onPress={onPress} testID="btn" />,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPress when disabled (no Pressable rendered)', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Button label="Tap me" onPress={onPress} disabled testID="btn" />,
    );
    fireEvent.press(getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
