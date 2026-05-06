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
});
