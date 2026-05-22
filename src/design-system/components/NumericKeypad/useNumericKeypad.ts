import { useCallback, useEffect, useId, useRef } from 'react';

import { useNumericKeypadContext } from './NumericKeypadContext';

export interface UseNumericKeypadArgs {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly isRegular: boolean;
  readonly disabled?: boolean;
}

export interface UseNumericKeypadResult {
  readonly isActive: boolean;
  readonly handleFieldPress: () => void;
}

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

  const setValue = useCallback((next: string) => onChange(next), [onChange]);

  const handleFieldPress = useCallback((): void => {
    if (disabled || isActive) {
      return;
    }
    registerField({
      id: fieldId,
      getValue: () => valueRef.current,
      setValue,
      isRegular,
    });
  }, [disabled, isActive, registerField, fieldId, setValue, isRegular]);

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

  return { isActive, handleFieldPress };
}
