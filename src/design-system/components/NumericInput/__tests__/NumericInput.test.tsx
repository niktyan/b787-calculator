import { fireEvent } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

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

  it('forwards user input to onChange', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <NumericInput label="TOW actual" value="" onChange={onChange} testID="weight" />,
    );
    fireEvent.changeText(getByTestId('weight-input'), '170');
    expect(onChange).toHaveBeenCalledWith('170');
  });

  describe('keyboard configuration (always decimal-pad)', () => {
    // iPad's system keyboard exposes an "ABC" mode that can flip a
    // numeric pad into a full QWERTY. We pin keyboardType +
    // inputMode + disable autocorrect/autocomplete/spellcheck/text
    // content suggestions so the OS never offers letters or
    // password-manager fills on numeric fields. See 06-ui-spec.md
    // § Экран 4 "Keyboard behavior".
    it('forces keyboardType="decimal-pad" on every NumericInput', () => {
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

  describe('input sanitizer (defence in depth)', () => {
    // Defence-in-depth normalizer fires on every onChangeText so the
    // value held by callers is always a clean decimal string, regardless
    // of how it arrived (iPad ABC mode, paste, 3rd-party keyboard).
    const cases: readonly (readonly [string, string, string])[] = [
      ['strips letters mixed into a decimal value', '12abc.5kg', '12.5'],
      ['normalizes the European decimal comma to a dot', '12,5', '12.5'],
      ['keeps only the first dot when multiple dots are entered', '12.5.7', '12.57'],
      ['treats a comma after a dot as a duplicate separator', '12.5,7', '12.57'],
      ['returns an empty string when input has no digits', 'abc', ''],
      ['preserves a leading dot (user is mid-typing ".5")', '.5', '.5'],
      ['preserves a trailing dot (user is mid-typing "12.")', '12.', '12.'],
    ];

    it.each(cases)('%s', (_label, raw, expected) => {
      const onChange = jest.fn();
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={onChange} testID="weight" />,
      );
      fireEvent.changeText(getByTestId('weight-input'), raw);
      expect(onChange).toHaveBeenCalledWith(expected);
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

  it('dismisses the keyboard on submit (Done button)', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    try {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="170" onChange={jest.fn()} testID="weight" />,
      );
      fireEvent(getByTestId('weight-input'), 'submitEditing');
      expect(dismissSpy).toHaveBeenCalledTimes(1);
    } finally {
      dismissSpy.mockRestore();
    }
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
