/**
 * Accessibility-focused tests for `BottomSheet` + `BottomSheetOption`. Other
 * behavior (visibility toggle, backdrop tap to close, animation surface)
 * is covered indirectly through Settings screen integration tests; here we
 * assert the screen-reader contract that the accessibility audit relies on.
 */

import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { BottomSheet, BottomSheetOption } from '../BottomSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('BottomSheet', () => {
  it('exposes the close affordance via accessibilityLabel on the backdrop', () => {
    const { getByTestId } = renderWithTheme(
      <BottomSheet
        visible
        onClose={jest.fn()}
        closeAccessibilityLabel="Close picker"
        testID="sheet"
      >
        <BottomSheetOption label="English" selected onPress={jest.fn()} testID="opt-en" />
      </BottomSheet>,
    );
    const backdrop = getByTestId('sheet-backdrop');
    expect(backdrop.props.accessibilityRole).toBe('button');
    expect(backdrop.props.accessibilityLabel).toBe('Close picker');
  });

  it('invokes onClose when the backdrop is tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithTheme(
      <BottomSheet visible onClose={onClose} closeAccessibilityLabel="Close" testID="sheet">
        <BottomSheetOption label="Dark" selected={false} onPress={jest.fn()} testID="opt-dark" />
      </BottomSheet>,
    );
    fireEvent.press(getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheetOption', () => {
  it('exposes role="button" and the label as accessibilityLabel', () => {
    const { getByTestId } = renderWithTheme(
      <BottomSheetOption label="Russian" selected={false} onPress={jest.fn()} testID="opt-ru" />,
    );
    const node = getByTestId('opt-ru');
    expect(node.props.accessibilityRole).toBe('button');
    expect(node.props.accessibilityLabel).toBe('Russian');
  });

  it('reflects the selected state via accessibilityState', () => {
    const { getByTestId } = renderWithTheme(
      <BottomSheetOption label="Light" selected onPress={jest.fn()} testID="opt-light" />,
    );
    expect(getByTestId('opt-light').props.accessibilityState).toEqual({ selected: true });
  });

  it('reflects an unselected state via accessibilityState', () => {
    const { getByTestId } = renderWithTheme(
      <BottomSheetOption label="Light" selected={false} onPress={jest.fn()} testID="opt-light" />,
    );
    expect(getByTestId('opt-light').props.accessibilityState).toEqual({ selected: false });
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <BottomSheetOption label="Auto" selected={false} onPress={onPress} testID="opt-auto" />,
    );
    fireEvent.press(getByTestId('opt-auto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
