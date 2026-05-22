import { createContext, useContext } from 'react';

import type { NumericKeypadKey } from './keys';

// Stored in the Provider's ref, not in state. `getValue` is a function so
// the keypad always reads the latest input value — avoids stale closures
// across re-renders of the registered NumericInput.
export interface RegisteredField {
  readonly id: string;
  readonly getValue: () => string;
  readonly setValue: (next: string) => void;
  readonly isRegular: boolean;
}

export interface NumericKeypadContextValue {
  readonly activeFieldId: string | null;
  readonly activeIsRegular: boolean;
  readonly registerField: (field: RegisteredField) => void;
  readonly clearActiveField: () => void;
  readonly pressKey: (key: NumericKeypadKey) => void;
  readonly done: () => void;
}

export const NumericKeypadContext = createContext<NumericKeypadContextValue | null>(null);

export function useNumericKeypadContext(): NumericKeypadContextValue {
  const ctx = useContext(NumericKeypadContext);
  if (ctx === null) {
    throw new Error('useNumericKeypadContext: NumericKeypadProvider not mounted');
  }
  return ctx;
}
