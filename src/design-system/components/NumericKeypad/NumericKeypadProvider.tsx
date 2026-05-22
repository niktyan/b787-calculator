import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { sanitizeDecimalInput } from '../NumericInput/sanitizeDecimalInput';
import { NumericKeypadContext } from './NumericKeypadContext';
import type { NumericKeypadContextValue, RegisteredField } from './NumericKeypadContext';
import type { NumericKeypadKey } from './keys';

interface ActiveFieldState {
  readonly id: string;
  readonly isRegular: boolean;
}

interface NumericKeypadProviderProps {
  readonly children: ReactNode;
}

export function NumericKeypadProvider({ children }: NumericKeypadProviderProps): ReactNode {
  // `activeField` is the single reactive bit that drives BottomSheet visibility
  // and the per-field `isActive` flag. The full RegisteredField (including the
  // setValue/getValue closures) lives in a ref so re-registrations don't
  // re-render the whole subtree.
  const [activeField, setActiveField] = useState<ActiveFieldState | null>(null);
  const fieldRef = useRef<RegisteredField | null>(null);

  const registerField = useCallback((field: RegisteredField): void => {
    if (fieldRef.current?.id === field.id) {
      // Same field re-focused — refresh closures (`getValue` might have
      // captured a new state) but skip the state update.
      fieldRef.current = field;
      return;
    }
    fieldRef.current = field;
    setActiveField({ id: field.id, isRegular: field.isRegular });
  }, []);

  const clearActiveField = useCallback((): void => {
    fieldRef.current = null;
    setActiveField(null);
  }, []);

  const pressKey = useCallback((key: NumericKeypadKey): void => {
    const field = fieldRef.current;
    if (field === null) {
      return;
    }
    const current = field.getValue();
    if (key === 'backspace') {
      // slice from a previously-sanitized string stays sanitized, so we skip
      // the sanitizer pass for backspace.
      field.setValue(current.slice(0, -1));
      return;
    }
    field.setValue(sanitizeDecimalInput(current + key));
  }, []);

  const done = useCallback((): void => {
    clearActiveField();
  }, [clearActiveField]);

  const value = useMemo<NumericKeypadContextValue>(
    () => ({
      activeFieldId: activeField === null ? null : activeField.id,
      activeIsRegular: activeField?.isRegular ?? false,
      registerField,
      clearActiveField,
      pressKey,
      done,
    }),
    [activeField, registerField, clearActiveField, pressKey, done],
  );

  return <NumericKeypadContext.Provider value={value}>{children}</NumericKeypadContext.Provider>;
}
