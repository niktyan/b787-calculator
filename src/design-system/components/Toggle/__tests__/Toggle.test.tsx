import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Toggle } from '../Toggle';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Toggle', () => {
  it('renders OFF state in dark theme', () => {
    const tree = renderWithTheme(
      <Toggle value={false} onChange={jest.fn()} accessibilityLabel="Show source" testID="t" />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders ON state in light theme', () => {
    const tree = renderWithTheme(
      <Toggle value onChange={jest.fn()} accessibilityLabel="Show source" testID="t" />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders disabled state', () => {
    const tree = renderWithTheme(
      <Toggle value onChange={jest.fn()} disabled accessibilityLabel="Wind units" />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('flips value on press', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Toggle value={false} onChange={onChange} accessibilityLabel="Show source" testID="t" />,
    );
    fireEvent.press(getByTestId('t'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Toggle
        value={false}
        onChange={onChange}
        disabled
        accessibilityLabel="Show source"
        testID="t"
      />,
    );
    fireEvent.press(getByTestId('t'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
