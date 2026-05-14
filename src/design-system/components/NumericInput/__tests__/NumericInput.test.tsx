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

  it('renders decimal field with value, unit and error', () => {
    const tree = renderWithTheme(
      <NumericInput
        label="CG"
        value="25.5"
        onChange={jest.fn()}
        decimal
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
    it('always mounts the error-slot view, even with no error', () => {
      const { getByTestId } = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      );
      expect(getByTestId('weight-error-slot')).toBeTruthy();
    });

    it('reserves the same slot minHeight for compact regardless of error state', () => {
      const compactNoError = renderWithTheme(
        <NumericInput label="Weight" value="" onChange={jest.fn()} testID="weight" />,
      ).getByTestId('weight-error-slot');
      const compactWithError = renderWithTheme(
        <NumericInput
          label="Weight"
          value="300"
          onChange={jest.fn()}
          error="Above maximum"
          testID="weight"
        />,
      ).getByTestId('weight-error-slot');
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
      ).getByTestId('weight-error-slot');
      const regularWithError = renderWithTheme(
        <NumericInput
          label="Weight"
          value="300"
          onChange={jest.fn()}
          size="regular"
          error="Above maximum"
          testID="weight"
        />,
      ).getByTestId('weight-error-slot');
      const heightOf = (node: { props: { style?: { minHeight?: number } } }): number | undefined =>
        node.props.style?.minHeight;
      expect(heightOf(regularNoError)).toBe(heightOf(regularWithError));
    });
  });
});
