import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { NumericInput } from '../NumericInput';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('NumericInput', () => {
  it('renders empty integer field with placeholder in dark theme', () => {
    const tree = renderWithTheme(
      <NumericInput
        label="TOW actual"
        value=""
        onChange={jest.fn()}
        placeholder="e.g. 170"
        unit="t"
        testID="weight"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders empty integer field with placeholder in light theme', () => {
    const tree = renderWithTheme(
      <NumericInput
        label="TOW actual"
        value=""
        onChange={jest.fn()}
        placeholder="e.g. 170"
        unit="t"
        testID="weight"
      />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders populated field with value, unit and error', () => {
    const tree = renderWithTheme(
      <NumericInput
        label="CG"
        value="25.5"
        onChange={jest.fn()}
        unit="%MAC"
        error="Above maximum 35 %MAC"
        testID="cg"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('keyboard configuration (system keyboard fully suppressed)', () => {
    // The iOS system keyboard is fully suppressed by combining
    // `editable={false}` (the load-bearing guarantee — iOS never shows a
    // keyboard for non-editable TextInputs) with `caretHidden` (no blinking
    // cursor on a non-typeable field) and `showSoftInputOnFocus={false}`
    // (belt-and-braces against any platform regression). Input flows
    // exclusively through the custom in-app keypad (ADR-0011 Iteration 1).
    it('marks the underlying TextInput as non-editable', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.editable).toBe(false);
    });

    it('hides the caret so the non-editable field reads as display-only', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.caretHidden).toBe(true);
    });

    it('also sets showSoftInputOnFocus={false} as a belt-and-braces signal', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.showSoftInputOnFocus).toBe(false);
    });

    it('keeps keyboardType="decimal-pad" (still useful for Bluetooth hardware keyboards)', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.keyboardType).toBe('decimal-pad');
    });

    it('sets inputMode="decimal" (HTML semantic complement to keyboardType)', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.inputMode).toBe('decimal');
    });

    it('disables autocorrect / autocomplete / spell-check / textContentType', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      const input = getByTestId('weight-input');
      expect(input.props.autoCorrect).toBe(false);
      expect(input.props.autoComplete).toBe('off');
      expect(input.props.spellCheck).toBe(false);
      expect(input.props.textContentType).toBe('none');
    });
  });

  describe('custom keypad integration', () => {
    it('does not throw on field press (registers with the Provider)', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      // The visible side-effect (popover open + isActive=true) is owned by
      // the Host, which isn't part of this test tree. A press that does
      // not throw is the smoke check.
      expect(() => fireEvent.press(getByTestId('weight'))).not.toThrow();
    });

    it('does not invoke onChange on field press', () => {
      const onChange = jest.fn();
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={onChange} disabled testID="weight" />,
      );
      fireEvent.press(getByTestId('weight'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('exposes the error message via testID', () => {
    const { getByTestId } = renderWithTheme(
      <NumericInput
        label="Weight"
        value="95"
        onChange={jest.fn()}
        error="Below minimum"
        testID="weight"
      />,
    );
    expect(getByTestId('weight-error')).toBeTruthy();
  });

  it('configures the underlying TextInput with returnKeyType="done"', () => {
    const { getByTestId } = renderWithTheme(
      <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
    );
    expect(getByTestId('weight-input').props.returnKeyType).toBe('done');
  });

  describe('reserved warning slot', () => {
    // The error slot is rendered unconditionally with a fixed minHeight
    // so toggling `error` on or off does NOT change the outer node's
    // height. This is what keeps the Crosswind input form stable when a
    // user types an out-of-envelope value (see 06-ui-spec.md § Экран 4).
    // The empty error slot is hidden from the accessibility tree
    // (`accessible={false}` + `importantForAccessibility="no-hide-descendants"`),
    // so queries must pass `includeHiddenElements: true` to find it via
    // testID. See `accessibility` describe block below.
    const QUERY_HIDDEN = { includeHiddenElements: true } as const;

    it('always mounts the error-slot view, even with no error', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-error-slot', QUERY_HIDDEN)).toBeTruthy();
    });

    it('reserves the same slot minHeight for compact regardless of error state', () => {
      const compactNoError = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      ).getByTestId('weight-error-slot', QUERY_HIDDEN);
      const compactWithError = renderWithTheme(
        <NumericInput
          label="Weight"
          value="300"
          onChange={jest.fn()}
          error="Above maximum"
          testID="weight"
        />,
      ).getByTestId('weight-error-slot', QUERY_HIDDEN);
      const heightOf = (node: { props: { style?: { minHeight?: number } } }): number | undefined =>
        node.props.style?.minHeight;
      expect(heightOf(compactNoError)).toBe(heightOf(compactWithError));
    });

    it('reserves the same slot minHeight for regular regardless of error state', () => {
      const regularNoError = renderWithTheme(
        <NumericInput
          label="Weight"
          value=""
          onChange={jest.fn()}
          size="regular"
          testID="weight"
        />,
      ).getByTestId('weight-error-slot', QUERY_HIDDEN);
      const regularWithError = renderWithTheme(
        <NumericInput
          label="Weight"
          value="300"
          onChange={jest.fn()}
          size="regular"
          error="Above maximum"
          testID="weight"
        />,
      ).getByTestId('weight-error-slot', QUERY_HIDDEN);
      const heightOf = (node: { props: { style?: { minHeight?: number } } }): number | undefined =>
        node.props.style?.minHeight;
      expect(heightOf(regularNoError)).toBe(heightOf(regularWithError));
    });

    it('hides the empty slot from screen readers (accessible=false)', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      const slot = getByTestId('weight-error-slot', QUERY_HIDDEN);
      expect(slot.props.accessible).toBe(false);
      expect(slot.props.importantForAccessibility).toBe('no-hide-descendants');
    });

    it('exposes the populated slot to screen readers (accessible=true)', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput
          label="Weight"
          value="300"
          onChange={jest.fn()}
          error="Above maximum 254 t"
          testID="weight"
        />,
      );
      const slot = getByTestId('weight-error-slot');
      expect(slot.props.accessible).toBe(true);
      expect(slot.props.importantForAccessibility).toBe('auto');
    });
  });

  describe('accessibility', () => {
    it('uses the label as accessibilityLabel by default', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="TOW actual" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-input').props.accessibilityLabel).toBe('TOW actual');
    });

    it('uses an explicit accessibilityLabel when provided', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput
          label="TOW"
          value=""
          onChange={jest.fn()}
          accessibilityLabel="Takeoff weight in tons"
          testID="weight"
        />,
      );
      expect(getByTestId('weight-input').props.accessibilityLabel).toBe('Takeoff weight in tons');
    });
  });
});
