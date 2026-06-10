/**
 * Test helper that wraps a component in `<ThemeProvider>` so design-system
 * snapshot tests can call `useTheme()` without a global provider. AsyncStorage
 * is mocked at the test-file level — `mockAsyncStorageForTheme()` exposes a
 * one-line setup that consumers can call from their `beforeEach`.
 */

import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '../../core/theming';
import type { ThemeMode } from '../../core/theming';
import { NumericKeypadProvider } from '../components/NumericKeypad';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  readonly mode?: ThemeMode;
}

// Zero-inset metrics — keeps `useSafeAreaInsets()` callers from throwing
// without changing any prior snapshot. `SafeAreaView` itself renders the
// same RNCSafeAreaView host node whether the provider is mounted or not,
// so existing screen snapshots are unaffected. Consumers that want to
// simulate a real device (e.g., iPhone home indicator) should mount
// their own `SafeAreaProvider` with `initialMetrics={withInsets(34)}`.
const ZERO_METRICS: Metrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 0, height: 0 },
};

// `NumericKeypadProvider` is included unconditionally so any component that
// reads `useNumericKeypadContext` (NumericInput, NumericKeypadHost, …) can be
// rendered in a test without bespoke setup. The provider renders no host node,
// so it has no impact on snapshot output.
export function renderWithTheme(node: ReactElement, options: Options = {}): RenderResult {
  const { mode = 'dark', ...rest } = options;
  const Wrapper = ({ children }: { readonly children: ReactNode }): ReactElement => (
    <SafeAreaProvider initialMetrics={ZERO_METRICS}>
      <ThemeProvider initialMode={mode}>
        <NumericKeypadProvider>{children}</NumericKeypadProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return render(node, { ...rest, wrapper: Wrapper });
}
