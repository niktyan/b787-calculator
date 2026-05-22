import { useCallback, useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';

import { useNumericKeypadContext } from './NumericKeypadContext';
import type { FieldAnchor } from './NumericKeypadContext';

export interface UseNumericKeypadArgs {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly isRegular: boolean;
  readonly disabled?: boolean;
}

export interface UseNumericKeypadResult {
  readonly isActive: boolean;
  readonly handleFieldPress: () => void;
  readonly fieldRef: RefObject<View | null>;
}

const ZERO_ANCHOR: FieldAnchor = { x: 0, y: 0, width: 0, height: 0 };

export function useNumericKeypad(args: UseNumericKeypadArgs): UseNumericKeypadResult {
  const { value, onChange, isRegular, disabled = false } = args;
  const fieldId = useId();
  const { activeFieldId, registerField, clearActiveField } = useNumericKeypadContext();
  const isActive = activeFieldId === fieldId;

  // Latest `value` reference lets the keypad's `getValue` closure observe
  // the current state on every keystroke instead of the snapshot captured
  // when the field was registered.
  const valueRef = useRef(value);
  valueRef.current = value;

  // `fieldRef` is attached by the consumer to the outermost View of the
  // input. The Host reads its window-relative geometry via measureInWindow
  // to position the floating popover next to (rather than on top of) the
  // field. See ADR-0011 § Iteration 1.
  const fieldRef = useRef<View | null>(null);

  const setValue = useCallback((next: string) => onChange(next), [onChange]);

  const getAnchor = useCallback(
    (): Promise<FieldAnchor> =>
      new Promise((resolve) => {
        const node = fieldRef.current;
        if (node === null || typeof node.measureInWindow !== 'function') {
          // Test environments may render the View without a real native
          // handle. Falling back to a zero anchor lets unit tests proceed
          // without mocking the native module.
          resolve(ZERO_ANCHOR);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      }),
    [],
  );

  const handleFieldPress = useCallback((): void => {
    if (disabled || isActive) {
      return;
    }
    registerField({
      id: fieldId,
      getValue: () => valueRef.current,
      setValue,
      isRegular,
      getAnchor,
    });
  }, [disabled, isActive, registerField, fieldId, setValue, isRegular, getAnchor]);

  // Cleanup: if this field is still active when it unmounts (e.g., screen
  // navigates away with the keypad open), the keypad must close. Read the
  // active flag through a ref because we explicitly only want the cleanup
  // to run on unmount, not on every isActive flip.
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  useEffect(
    () => () => {
      if (isActiveRef.current) {
        clearActiveField();
      }
    },
    [clearActiveField],
  );

  return { isActive, handleFieldPress, fieldRef };
}
