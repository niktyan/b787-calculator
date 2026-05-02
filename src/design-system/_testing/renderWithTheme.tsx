/**
 * Test helper that wraps a component in `<ThemeProvider>` so design-system
 * snapshot tests can call `useTheme()` without a global provider. AsyncStorage
 * is mocked at the test-file level — `mockAsyncStorageForTheme()` exposes a
 * one-line setup that consumers can call from their `beforeEach`.
 */

import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '../../core/theming';
import type { ThemeMode } from '../../core/theming';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  readonly mode?: ThemeMode;
}

export function renderWithTheme(node: ReactElement, options: Options = {}): RenderResult {
  const { mode = 'dark', ...rest } = options;
  const Wrapper = ({ children }: { readonly children: ReactNode }): ReactElement => (
    <ThemeProvider initialMode={mode}>{children}</ThemeProvider>
  );
  return render(node, { ...rest, wrapper: Wrapper });
}
