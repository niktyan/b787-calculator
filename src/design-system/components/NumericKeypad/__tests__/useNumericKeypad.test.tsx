import { act, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';

import { NumericKeypadProvider } from '../NumericKeypadProvider';
import { useNumericKeypadContext } from '../NumericKeypadContext';
import { useNumericKeypad } from '../useNumericKeypad';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

interface HarnessProps {
  readonly initialValue?: string;
  readonly disabled?: boolean;
  readonly isRegular?: boolean;
  readonly testID?: string;
  readonly onValueChange?: (next: string) => void;
}

function Harness({
  initialValue = '',
  disabled = false,
  isRegular = false,
  testID = 'field',
  onValueChange,
}: HarnessProps): ReactElement {
  const [value, setValue] = useState(initialValue);
  const { isActive, handleFieldPress } = useNumericKeypad({
    value,
    onChange: (next): void => {
      setValue(next);
      onValueChange?.(next);
    },
    isRegular,
    disabled,
  });
  return (
    <Pressable onPress={handleFieldPress} testID={testID}>
      <Text testID={`${testID}-active`}>{isActive ? 'active' : 'inactive'}</Text>
      <Text testID={`${testID}-value`}>{value}</Text>
    </Pressable>
  );
}

describe('useNumericKeypad', () => {
  it('starts inactive', () => {
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Harness />
      </NumericKeypadProvider>,
    );
    expect(getByTestId('field-active').props.children).toBe('inactive');
  });

  it('becomes active after handleFieldPress', () => {
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Harness />
      </NumericKeypadProvider>,
    );
    fireEvent.press(getByTestId('field'));
    expect(getByTestId('field-active').props.children).toBe('active');
  });

  it('only allows one active field at a time', () => {
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Harness testID="a" />
        <Harness testID="b" />
      </NumericKeypadProvider>,
    );
    fireEvent.press(getByTestId('a'));
    expect(getByTestId('a-active').props.children).toBe('active');
    expect(getByTestId('b-active').props.children).toBe('inactive');
    fireEvent.press(getByTestId('b'));
    expect(getByTestId('a-active').props.children).toBe('inactive');
    expect(getByTestId('b-active').props.children).toBe('active');
  });

  it('handleFieldPress while active is a no-op (re-press the same field)', () => {
    function Probe(): ReactElement | null {
      const ctx = useNumericKeypadContext();
      probeSink.value = ctx.activeFieldId;
      return null;
    }
    const probeSink: { value: string | null } = { value: null };
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Probe />
        <Harness />
      </NumericKeypadProvider>,
    );
    fireEvent.press(getByTestId('field'));
    const firstId = probeSink.value;
    fireEvent.press(getByTestId('field'));
    expect(probeSink.value).toBe(firstId);
  });

  it('handleFieldPress is a no-op when the field is disabled', () => {
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Harness disabled />
      </NumericKeypadProvider>,
    );
    fireEvent.press(getByTestId('field'));
    expect(getByTestId('field-active').props.children).toBe('inactive');
  });

  it('clears the active field on unmount when active', () => {
    function Probe(): ReactElement | null {
      const ctx = useNumericKeypadContext();
      probeSink.value = ctx.activeFieldId;
      return null;
    }
    const probeSink: { value: string | null } = { value: null };
    function Container({ mountField }: { readonly mountField: boolean }): ReactElement {
      return (
        <NumericKeypadProvider>
          <Probe />
          {mountField ? <Harness /> : null}
        </NumericKeypadProvider>
      );
    }
    const { getByTestId, rerender } = render(<Container mountField />);
    fireEvent.press(getByTestId('field'));
    expect(probeSink.value).not.toBeNull();
    act(() => {
      rerender(<Container mountField={false} />);
    });
    expect(probeSink.value).toBeNull();
  });

  it('keypad press updates the field value via setValue', () => {
    function KeypadButton(): ReactElement {
      const { pressKey } = useNumericKeypadContext();
      return (
        <Pressable onPress={(): void => pressKey('5')} testID="press-5">
          <Text>5</Text>
        </Pressable>
      );
    }
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <NumericKeypadProvider>
        <Harness initialValue="17" onValueChange={onValueChange} />
        <KeypadButton />
      </NumericKeypadProvider>,
    );
    fireEvent.press(getByTestId('field'));
    fireEvent.press(getByTestId('press-5'));
    expect(onValueChange).toHaveBeenCalledWith('175');
    expect(getByTestId('field-value').props.children).toBe('175');
  });
});
