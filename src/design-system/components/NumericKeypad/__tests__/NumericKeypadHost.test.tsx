import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../../../../core/theming';
import { NumericKeypadHost } from '../NumericKeypadHost';
import { NumericKeypadProvider } from '../NumericKeypadProvider';
import { useNumericKeypadContext } from '../NumericKeypadContext';
import type { NumericKeypadContextValue, RegisteredField } from '../NumericKeypadContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

interface HarnessSetup {
  readonly tree: ReturnType<typeof render>;
  readonly sink: { value: NumericKeypadContextValue | null };
}

function renderHost(): HarnessSetup {
  const sink: { value: NumericKeypadContextValue | null } = { value: null };
  function Tap(): ReactElement {
    const ctx = useNumericKeypadContext();
    sink.value = ctx;
    return null as unknown as ReactElement;
  }
  const tree = render(
    <ThemeProvider initialMode="dark">
      <NumericKeypadProvider>
        <Tap />
        <NumericKeypadHost />
      </NumericKeypadProvider>
    </ThemeProvider>,
  );
  return { tree, sink };
}

function valueRef(initial: string): { current: string } {
  return { current: initial };
}

function fieldOn(state: { current: string }, id: string, isRegular = false): RegisteredField {
  return {
    id,
    getValue: () => state.current,
    setValue: (next): void => {
      state.current = next;
    },
    isRegular,
  };
}

describe('NumericKeypadHost', () => {
  it('renders BottomSheet hidden when no field is active', () => {
    const { tree } = renderHost();
    // Modal is rendered with visible=false; the backdrop is not interactable.
    // We verify by attempting to query the keypad — it should not be found.
    expect(tree.queryByTestId('numeric-keypad')).toBeNull();
  });

  it('shows the keypad after a field is registered', () => {
    const { tree, sink } = renderHost();
    const state = valueRef('');
    act(() => {
      sink.value?.registerField(fieldOn(state, 'weight'));
    });
    expect(tree.getByTestId('numeric-keypad')).toBeTruthy();
  });

  it('forwards key presses to the active field', () => {
    const { tree, sink } = renderHost();
    const state = valueRef('17');
    act(() => {
      sink.value?.registerField(fieldOn(state, 'weight'));
    });
    fireEvent.press(tree.getByTestId('numeric-keypad-key-0'));
    expect(state.current).toBe('170');
  });

  it('closes the keypad when Done is tapped', () => {
    const { tree, sink } = renderHost();
    act(() => {
      sink.value?.registerField(fieldOn(valueRef(''), 'weight'));
    });
    expect(tree.queryByTestId('numeric-keypad')).toBeTruthy();
    fireEvent.press(tree.getByTestId('numeric-keypad-done'));
    expect(sink.value?.activeFieldId).toBeNull();
  });

  it('closes the keypad when the backdrop is tapped', () => {
    const { tree, sink } = renderHost();
    act(() => {
      sink.value?.registerField(fieldOn(valueRef(''), 'weight'));
    });
    fireEvent.press(tree.getByTestId('numeric-keypad-host-backdrop'));
    expect(sink.value?.activeFieldId).toBeNull();
  });

  it('propagates the active field isRegular flag to the keypad', () => {
    // Regular and compact are visually distinguished by snapshot tests in
    // NumericKeypad.test.tsx; here we just verify the Host wires the bit
    // through. We assert via the Provider context — `activeIsRegular` flips
    // when a regular field is registered, which Host reads to pick sizing.
    const { sink } = renderHost();
    act(() => {
      sink.value?.registerField(fieldOn(valueRef(''), 'weight', true));
    });
    expect(sink.value?.activeIsRegular).toBe(true);
  });
});
