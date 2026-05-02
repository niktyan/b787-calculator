import { useContext } from 'react';

import { ThemeContext } from './ThemeProvider';
import type { Theme, ThemeMode } from './types';

export interface UseThemeResult {
  readonly theme: Theme;
  readonly setMode: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeResult {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be called within a <ThemeProvider>.');
  }
  return ctx;
}
