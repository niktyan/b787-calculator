import { fireEvent } from '@testing-library/react-native';
import { Keyboard, Text, TextInput } from 'react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { KeyboardDismissView } from '../KeyboardDismissView';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('KeyboardDismissView', () => {
  let dismissSpy: jest.SpyInstance;

  beforeEach(() => {
    dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  });

  afterEach(() => {
    dismissSpy.mockRestore();
  });

  it('matches snapshot', () => {
    const tree = renderWithTheme(
      <KeyboardDismissView testID="kdv">
        <Text>child</Text>
      </KeyboardDismissView>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calls Keyboard.dismiss exactly once when wrapper itself is pressed', () => {
    const { getByTestId } = renderWithTheme(
      <KeyboardDismissView testID="kdv">
        <Text>outer area</Text>
      </KeyboardDismissView>,
    );
    fireEvent.press(getByTestId('kdv'));
    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT dismiss the keyboard when an inner TextInput is focused via press', () => {
    // Pressable's onPress fires only when the press target is the
    // Pressable itself, not a descendant TextInput. So focusing the
    // input through fireEvent should not bubble up as a wrapper press.
    const { getByTestId } = renderWithTheme(
      <KeyboardDismissView testID="kdv">
        <TextInput testID="inner-input" />
      </KeyboardDismissView>,
    );
    fireEvent(getByTestId('inner-input'), 'focus');
    expect(dismissSpy).not.toHaveBeenCalled();
  });

  it('is not exposed to VoiceOver as a tappable region (accessible=false)', () => {
    const { getByTestId } = renderWithTheme(
      <KeyboardDismissView testID="kdv">
        <Text>x</Text>
      </KeyboardDismissView>,
    );
    expect(getByTestId('kdv').props.accessible).toBe(false);
  });
});
