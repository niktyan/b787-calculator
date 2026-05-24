import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { resetFlags, setFlag } from '../../../../core/feature-flags';
import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { NumericKeypad } from '../NumericKeypad';
import type { NumericKeypadKey } from '../keys';

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

const ALL_KEYS: readonly NumericKeypadKey[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '.',
  'backspace',
];

describe('NumericKeypad', () => {
  beforeEach(() => {
    resetFlags();
    impactAsyncMock.mockClear();
  });

  it('renders compact layout snapshot (dark theme)', () => {
    const tree = renderWithTheme(
      <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders regular layout snapshot (light theme)', () => {
    const tree = renderWithTheme(
      <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} isRegular testID="kp" />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('key dispatch', () => {
    it.each(ALL_KEYS)('forwards "%s" to onKeyPress', (key) => {
      const onKeyPress = jest.fn();
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={onKeyPress} onDone={jest.fn()} testID="kp" />,
      );
      fireEvent.press(getByTestId(`kp-key-${key}`));
      expect(onKeyPress).toHaveBeenCalledWith(key);
    });
  });

  describe('Done button', () => {
    it('forwards Done press to onDone', () => {
      const onDone = jest.fn();
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={onDone} testID="kp" />,
      );
      fireEvent.press(getByTestId('kp-done'));
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('haptic feedback', () => {
    it('fires light impact on digit key press', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      fireEvent.press(getByTestId('kp-key-7'));
      expect(impactAsyncMock).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('fires medium impact on Done press', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      fireEvent.press(getByTestId('kp-done'));
      expect(impactAsyncMock).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('does not fire haptics when enableHapticFeedback is off', () => {
      setFlag('enableHapticFeedback', false);
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      fireEvent.press(getByTestId('kp-key-3'));
      fireEvent.press(getByTestId('kp-done'));
      expect(impactAsyncMock).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('labels digit keys with the digit itself', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      expect(getByTestId('kp-key-7').props.accessibilityLabel).toBe('7');
    });

    it('labels the decimal separator key via i18n', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      // Falls back to the raw key (i18n keys themselves) in unit-test setup;
      // we just verify the label is non-empty and comes from the keypad
      // namespace rather than the digit literal.
      const label = getByTestId('kp-key-.').props.accessibilityLabel as string;
      expect(label).not.toBe('.');
      expect(label.length).toBeGreaterThan(0);
    });

    it('labels the backspace key via i18n', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      const label = getByTestId('kp-key-backspace').props.accessibilityLabel as string;
      expect(label).not.toBe('backspace');
      expect(label.length).toBeGreaterThan(0);
    });

    it('marks every key as a button role', () => {
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      for (const key of ALL_KEYS) {
        expect(getByTestId(`kp-key-${key}`).props.accessibilityRole).toBe('button');
      }
    });
  });

  describe('layout', () => {
    it('stretches the outer container to full popover width', () => {
      // Without `width: 100%` on the root, the keypad takes the intrinsic
      // width of its children — keys collapse via `flex: 1` and Done overflows.
      // See ADR-0011 Iteration 3 §1.
      const { getByTestId } = renderWithTheme(
        <NumericKeypad onKeyPress={jest.fn()} onDone={jest.fn()} testID="kp" />,
      );
      const root = getByTestId('kp');
      const rootStyle = root.props.style as { readonly width?: string } | undefined;
      expect(rootStyle?.width).toBe('100%');
    });
  });
});
