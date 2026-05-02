import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';

import { STORAGE_KEYS } from '../../storage/keys';
import { storage } from '../../storage/storage';
import { ThemeProvider } from '../ThemeProvider';
import { colorsFor, typography } from '../tokens';
import { THEME_MODES } from '../types';
import { useTheme } from '../useTheme';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mock: unknown = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return mock;
});

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: (): 'dark' | 'light' => 'dark',
}));

function wrap(
  initialMode?: 'auto' | 'light' | 'dark',
): (props: { children: ReactNode }) => ReactNode {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <ThemeProvider {...(initialMode === undefined ? {} : { initialMode })}>
        {children}
      </ThemeProvider>
    );
  }
  return Wrapper;
}

describe('THEME_MODES', () => {
  it('contains the three supported theme modes', () => {
    expect(THEME_MODES).toEqual(['auto', 'light', 'dark']);
  });
});

describe('tokens', () => {
  it('colorsFor("dark") returns a populated dark palette', () => {
    const colors = colorsFor('dark');
    expect(colors.background).toMatch(/^#/);
    expect(colors.textPrimary).toMatch(/^#/);
  });

  it('colorsFor("light") returns a populated light palette distinct from dark', () => {
    const dark = colorsFor('dark');
    const light = colorsFor('light');
    expect(light.background).not.toBe(dark.background);
  });

  it('typography exposes expected font fields', () => {
    expect(typography.fontFamilyBase.length).toBeGreaterThan(0);
    expect(typography.fontFamilyMono.length).toBeGreaterThan(0);
    expect(typography.fontSizeBody).toBeGreaterThan(0);
    expect(typography.fontSizeHeading).toBeGreaterThan(typography.fontSizeBody);
  });
});

describe('useTheme', () => {
  beforeEach(async () => {
    await storage.flushNow();
    await AsyncStorage.clear();
  });

  it('throws when used outside a ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/within a <ThemeProvider>/);
  });

  it('default mode is "auto" and resolves to the system color scheme (dark)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap() });
    expect(result.current.theme.mode).toBe('auto');
    expect(result.current.theme.resolved).toBe('dark');
    expect(result.current.theme.colors).toEqual(colorsFor('dark'));
  });

  it('explicit "light" mode overrides the system scheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap('light') });
    expect(result.current.theme.mode).toBe('light');
    expect(result.current.theme.resolved).toBe('light');
  });

  it('explicit "dark" mode is honored even when initial', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap('dark') });
    expect(result.current.theme.resolved).toBe('dark');
  });

  it('setMode switches the theme and persists it to storage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: wrap('auto') });

    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.theme.mode).toBe('light');

    await storage.flushNow();
    expect(await storage.get('theme')).toBe('light');
  });

  it('hydrates from storage on mount when a saved mode exists', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify('light'));
    const { result } = renderHook(() => useTheme(), { wrapper: wrap('auto') });
    await waitFor(() => {
      expect(result.current.theme.mode).toBe('light');
    });
  });
});
