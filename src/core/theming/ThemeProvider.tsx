import { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { storage } from '../storage';

import { colorsFor, typography } from './tokens';
import type { ResolvedColorScheme, Theme, ThemeMode } from './types';

interface ThemeContextValue {
  readonly theme: Theme;
  readonly setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(mode: ThemeMode, system: ResolvedColorScheme): ResolvedColorScheme {
  if (mode === 'auto') {
    return system;
  }
  return mode;
}

function buildTheme(mode: ThemeMode, system: ResolvedColorScheme): Theme {
  const resolved = resolve(mode, system);
  return {
    mode,
    resolved,
    colors: colorsFor(resolved),
    typography,
  };
}

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'auto' }: ThemeProviderProps): ReactNode {
  const systemScheme: ResolvedColorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    let active = true;
    void storage.get('theme').then((stored) => {
      if (active && stored !== null) {
        setModeState(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: buildTheme(mode, systemScheme),
      setMode: (next: ThemeMode): void => {
        setModeState(next);
        storage.set('theme', next);
      },
    }),
    [mode, systemScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
