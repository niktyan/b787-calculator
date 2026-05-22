/**
 * Per-field validation timing matrix for the Crosswind route.
 *
 * Pins the UX rule that field-level errors (format failure OR envelope
 * violation) surface the moment the pilot enters a value in a single
 * field — regardless of whether the other field is still empty. The
 * result panel still gates on BOTH fields being parsed.
 *
 * Pre-bugfix (PR #83 first round) the view-model gated all validation
 * on both fields being parseable, hiding single-field errors until the
 * second field was also filled. Reproducing scenario: pilot enters
 * weight=300 first, sees nothing, gives up before reaching the CG
 * field. Each test below would have failed against the pre-bugfix
 * useCrosswindCalculator.
 *
 * Lives in its own file (sibling to crosswind.test.tsx) because the
 * main route test file is already near the 300-line ESLint cap and
 * adding ~120 lines of timing-matrix tests would push it over.
 */

import { act } from '@testing-library/react-native';

import CrosswindRoute from '../../app/(main)/crosswind';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

interface TestInstance {
  readonly props: { readonly onChangeText?: (next: string) => void };
}

function setNumericInput(input: TestInstance, value: string): void {
  const onChangeText = input.props.onChangeText;
  if (onChangeText === undefined) {
    throw new Error('NumericInput is missing onChangeText prop');
  }
  act(() => {
    onChangeText(value);
  });
}

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: (): null => null },
}));

jest.mock('react-i18next', () => {
  const en = require('../../core/i18n/locales/en.json') as Record<string, unknown>;
  const resolve = (key: string, options?: Record<string, unknown>): string => {
    const parts = key.split('.');
    let cur: unknown = en;
    for (const p of parts) {
      if (cur !== null && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return key;
      }
    }
    if (typeof cur !== 'string') {
      return key;
    }
    if (options === undefined) {
      return cur;
    }
    return cur.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      name in options ? String(options[name]) : `{{${name}}}`,
    );
  };
  return {
    useTranslation: () => ({ t: resolve }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 0, height: 0, scale: 1, fontScale: 1 })),
}));

describe('Crosswind route · per-field validation timing', () => {
  it('both fields empty → no errors, result panel in empty state', () => {
    const { getByTestId, queryByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(queryByTestId('crosswind-warning-chip')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
    expect(getByText('Enter weight and CG to see result')).toBeTruthy();
  });

  it('only weight above max (cg empty) → weight error immediately, panel stays empty', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-weight-input'), '300');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(queryByTestId('crosswind-warning-chip')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('only cg above max (weight empty) → cg error immediately, panel stays empty', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-cg-input'), '50');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(getByTestId('crosswind-cg-error')).toBeTruthy();
    expect(queryByTestId('crosswind-warning-chip')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('only weight below min (cg empty) → weight error immediately', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-weight-input'), '50');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('only cg below min (weight empty) → cg error immediately', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-cg-input'), '2');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(getByTestId('crosswind-cg-error')).toBeTruthy();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('valid weight (cg empty) → no errors, panel stays empty', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-weight-input'), '170');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('valid cg (weight empty) → no errors, panel stays empty', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-cg-input'), '25');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });

  it('both fields out of envelope → both errors + idle panel + warning chip', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-weight-input'), '300');
    setNumericInput(getByTestId('crosswind-cg-input'), '50');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    expect(getByTestId('crosswind-cg-error')).toBeTruthy();
    expect(getByTestId('crosswind-warning-chip')).toBeTruthy();
  });

  it('transitions: empty → bad-weight → both-bad → fix-weight → fix-cg', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();

    setNumericInput(getByTestId('crosswind-weight-input'), '300');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();

    setNumericInput(getByTestId('crosswind-cg-input'), '50');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    expect(getByTestId('crosswind-cg-error')).toBeTruthy();
    expect(getByTestId('crosswind-warning-chip')).toBeTruthy();

    setNumericInput(getByTestId('crosswind-weight-input'), '170');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(getByTestId('crosswind-cg-error')).toBeTruthy();
    expect(getByTestId('crosswind-warning-chip')).toBeTruthy();

    setNumericInput(getByTestId('crosswind-cg-input'), '25');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(queryByTestId('crosswind-cg-error')).toBeNull();
    expect(queryByTestId('crosswind-warning-chip')).toBeNull();
  });

  it('clearing a field with an envelope error removes the error (transitions back to empty)', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<CrosswindRoute />);
    setNumericInput(getByTestId('crosswind-weight-input'), '300');
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
    setNumericInput(getByTestId('crosswind-weight-input'), '');
    expect(queryByTestId('crosswind-weight-error')).toBeNull();
    expect(getByTestId('crosswind-result-panel-empty')).toBeTruthy();
  });
});
