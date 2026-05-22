import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { sanitizeDecimalInput } from '../NumericInput/sanitizeDecimalInput';
import { NumericKeypadContext } from './NumericKeypadContext';
import type {
  FieldAnchor,
  NumericKeypadContextValue,
  RegisteredField,
} from './NumericKeypadContext';
import type { NumericKeypadKey } from './keys';

interface ActiveFieldState {
  readonly id: string;
  readonly isRegular: boolean;
}

interface NumericKeypadProviderProps {
  readonly children: ReactNode;
}

export function NumericKeypadProvider({ children }: NumericKeypadProviderProps): ReactNode {
  // `activeField` + `activeAnchor` are the two reactive bits driving the
  // Host's popover visibility and positioning. The full RegisteredField
  // (including the setValue/getValue/getAnchor closures) lives in a ref so
  // re-registrations don't re-render the whole subtree.
  const [activeField, setActiveField] = useState<ActiveFieldState | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<FieldAnchor | null>(null);
  const fieldRef = useRef<RegisteredField | null>(null);

  const refreshAnchor = useCallback((field: RegisteredField): void => {
    // `getAnchor` is async (measureInWindow is callback-based) but we don't
    // await — the Host renders nothing while activeAnchor is null, and the
    // first measurement lands within a frame on real devices.
    void field.getAnchor().then((anchor) => {
      setActiveAnchor(anchor);
    });
  }, []);

  const registerField = useCallback(
    (field: RegisteredField): void => {
      if (fieldRef.current?.id === field.id) {
        // Same field re-focused — refresh closures (`getValue` / `getAnchor`
        // might have captured new state) and re-measure the anchor (covers
        // orientation changes), but skip the state update for activeField.
        fieldRef.current = field;
        refreshAnchor(field);
        return;
      }
      fieldRef.current = field;
      setActiveField({ id: field.id, isRegular: field.isRegular });
      refreshAnchor(field);
    },
    [refreshAnchor],
  );

  const clearActiveField = useCallback((): void => {
    fieldRef.current = null;
    setActiveField(null);
    setActiveAnchor(null);
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
      activeAnchor,
      registerField,
      clearActiveField,
      pressKey,
      done,
    }),
    [activeField, activeAnchor, registerField, clearActiveField, pressKey, done],
  );

  return <NumericKeypadContext.Provider value={value}>{children}</NumericKeypadContext.Provider>;
}
