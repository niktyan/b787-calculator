import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Text } from 'react-native';

import { NumericKeypadProvider } from '../NumericKeypadProvider';
import { useNumericKeypadContext } from '../NumericKeypadContext';
import type { NumericKeypadContextValue, RegisteredField } from '../NumericKeypadContext';
import type { NumericKeypadKey } from '../keys';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Test consumer that copies the live context value into a sink ref. Lets
// each test assert on activeFieldId / call the actions imperatively without
// mounting a real NumericInput.
function captureContext(sink: { value: NumericKeypadContextValue | null }): () => ReactElement {
  return function ContextSink(): ReactElement {
    const ctx = useNumericKeypadContext();
    sink.value = ctx;
    return <Text testID="probe">{ctx.activeFieldId ?? 'none'}</Text>;
  };
}

function withProvider(children: ReactNode): ReactElement {
  return <NumericKeypadProvider>{children}</NumericKeypadProvider>;
}

function makeField(overrides: Partial<RegisteredField>): RegisteredField {
  const value = { current: '' };
  return {
    id: 'field-1',
    getValue: () => value.current,
    setValue: (next): void => {
      value.current = next;
    },
    isRegular: false,
    ...overrides,
  };
}

describe('NumericKeypadProvider', () => {
  function renderProbe(): { sink: { value: NumericKeypadContextValue | null } } {
    const sink: { value: NumericKeypadContextValue | null } = { value: null };
    const Consumer = captureContext(sink);
    render(withProvider(<Consumer />));
    return { sink };
  }

  it('starts with no active field', () => {
    const { sink } = renderProbe();
    expect(sink.value?.activeFieldId).toBeNull();
    expect(sink.value?.activeIsRegular).toBe(false);
  });

  it('registerField updates activeFieldId and isRegular', () => {
    const { sink } = renderProbe();
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight', isRegular: true }));
    });
    expect(sink.value?.activeFieldId).toBe('weight');
    expect(sink.value?.activeIsRegular).toBe(true);
  });

  it('registerField with the same id is a no-op for state', () => {
    const { sink } = renderProbe();
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight' }));
    });
    const firstValue = sink.value;
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight' }));
    });
    // Reference equality is the simplest proxy for "state did not update":
    // a no-op skips setState and keeps the same context value object.
    expect(sink.value).toBe(firstValue);
  });

  it('registerField with a new id swaps the active field', () => {
    const { sink } = renderProbe();
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight', isRegular: false }));
    });
    act(() => {
      sink.value?.registerField(makeField({ id: 'cg', isRegular: true }));
    });
    expect(sink.value?.activeFieldId).toBe('cg');
    expect(sink.value?.activeIsRegular).toBe(true);
  });

  it('clearActiveField resets to no active field', () => {
    const { sink } = renderProbe();
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight' }));
    });
    act(() => {
      sink.value?.clearActiveField();
    });
    expect(sink.value?.activeFieldId).toBeNull();
  });

  it('done() clears the active field', () => {
    const { sink } = renderProbe();
    act(() => {
      sink.value?.registerField(makeField({ id: 'weight' }));
    });
    act(() => {
      sink.value?.done();
    });
    expect(sink.value?.activeFieldId).toBeNull();
  });

  describe('pressKey', () => {
    function mountWithField(opts: {
      readonly initialValue: string;
      readonly key: NumericKeypadKey;
    }): { readonly setValue: jest.Mock; readonly getValueAfter: () => string } {
      const sink: { value: NumericKeypadContextValue | null } = { value: null };
      const Consumer = captureContext(sink);
      render(withProvider(<Consumer />));
      const valueState = { current: opts.initialValue };
      const setValue = jest.fn((next: string) => {
        valueState.current = next;
      });
      act(() => {
        sink.value?.registerField({
          id: 'field',
          getValue: () => valueState.current,
          setValue,
          isRegular: false,
        });
      });
      act(() => {
        sink.value?.pressKey(opts.key);
      });
      return { setValue, getValueAfter: () => valueState.current };
    }

    it('does nothing when no field is active', () => {
      const { sink } = renderProbe();
      // Should not throw despite the absence of a registered field.
      expect(() => {
        act(() => {
          sink.value?.pressKey('5');
        });
      }).not.toThrow();
    });

    it('appends a digit to the active field value', () => {
      const { setValue, getValueAfter } = mountWithField({ initialValue: '17', key: '0' });
      expect(setValue).toHaveBeenCalledWith('170');
      expect(getValueAfter()).toBe('170');
    });

    it('appends a decimal separator', () => {
      const { setValue } = mountWithField({ initialValue: '170', key: '.' });
      expect(setValue).toHaveBeenCalledWith('170.');
    });

    it('drops a duplicate decimal separator via the sanitizer', () => {
      const { setValue } = mountWithField({ initialValue: '17.5', key: '.' });
      // sanitizeDecimalInput collapses "17.5." to "17.5"
      expect(setValue).toHaveBeenCalledWith('17.5');
    });

    it('removes the last character on backspace', () => {
      const { setValue } = mountWithField({ initialValue: '170', key: 'backspace' });
      expect(setValue).toHaveBeenCalledWith('17');
    });

    it('keeps the value empty when backspace is pressed on an empty field', () => {
      const { setValue } = mountWithField({ initialValue: '', key: 'backspace' });
      expect(setValue).toHaveBeenCalledWith('');
    });
  });
});

describe('useNumericKeypadContext', () => {
  it('throws when no provider is mounted', () => {
    function Consumer(): ReactElement {
      useNumericKeypadContext();
      return <Text>x</Text>;
    }
    // Suppress the React error-boundary console.error spam in this test:
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => render(<Consumer />)).toThrow(/NumericKeypadProvider not mounted/);
    } finally {
      spy.mockRestore();
    }
  });

  it('returns the context value when a provider is mounted', () => {
    const sink: { value: NumericKeypadContextValue | null } = { value: null };
    function Consumer(): ReactElement {
      const ctx = useNumericKeypadContext();
      useEffect(() => {
        sink.value = ctx;
      }, [ctx]);
      return <Text>x</Text>;
    }
    render(withProvider(<Consumer />));
    expect(sink.value).not.toBeNull();
  });
});
