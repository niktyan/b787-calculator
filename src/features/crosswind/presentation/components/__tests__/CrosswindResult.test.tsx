/**
 * Behaviour + snapshot coverage for the simplified CrosswindResult
 * panel (Block 5 single-card variant).
 */

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type {
  CrosswindKnots,
  CrosswindCalculationOutput,
  EnvelopeViolation,
} from '../../../domain/types';
import type { CrosswindUIState } from '../../useCrosswindCalculator';
import { CrosswindResult } from '../CrosswindResult';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => {
  const en = require('../../../../../core/i18n/locales/en.json') as Record<string, unknown>;
  const resolve = (key: string): string => {
    const parts = key.split('.');
    let cur: unknown = en;
    for (const p of parts) {
      if (cur !== null && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return key;
      }
    }
    return typeof cur === 'string' ? cur : key;
  };
  return {
    useTranslation: () => ({ t: resolve }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

function idleOutput(value: number): CrosswindCalculationOutput {
  return {
    maxCrosswindKnots: value as CrosswindKnots,
    metadata: {
      dataVersion: '2026-05-05.001',
      referenceDocument: 'Boeing 787 FCOM',
      aircraft: 'b787_8',
      weightBracket: { lower: 170, upper: 170 },
      cgBracket: { lower: 27.7, upper: 30.9 },
      bracketCrosswindRange: { lower: 35 as CrosswindKnots, upper: 40 as CrosswindKnots },
      calculationStrategy: 'within-bracket',
    },
  };
}

describe('CrosswindResult', () => {
  it('renders the centred number for idle state (default W=170, CG=25 dry → 33 KT)', () => {
    const state: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
      warning: null,
    };
    const tree = renderWithTheme(<CrosswindResult state={state} testID="result" />);
    expect(tree.getByTestId('crosswind-result-panel')).toBeTruthy();
    expect(tree.getByText('33')).toBeTruthy();
    expect(tree.getByText('KT')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the iPad-regular variant when isRegular={true}', () => {
    const state: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
      warning: null,
    };
    const tree = renderWithTheme(<CrosswindResult state={state} isRegular testID="result" />);
    const json = JSON.stringify(tree.toJSON());
    // Regular variant uses displayLarge (72 pt) value + monoXL (36 pt) suffix.
    expect(json).toContain('"fontSize":72');
    expect(json).toContain('"fontSize":36');
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the empty caption when fields are blank', () => {
    const state: CrosswindUIState = { kind: 'empty' };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByTestId('crosswind-result-panel-empty')).toBeTruthy();
    expect(tree.getByText('Enter weight and CG to see result')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('shows the operational-envelope warning chip alongside the value', () => {
    const violation: EnvelopeViolation = { kind: 'cg.above', given: 40, maxPercent: 35 };
    const state: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(23),
      warning: violation,
    };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByText('23')).toBeTruthy();
    expect(tree.getByTestId('crosswind-warning-chip')).toBeTruthy();
  });

  it('renders the data-not-available caption for unimplemented aircraft / condition', () => {
    const state: CrosswindUIState = {
      kind: 'data-not-available',
      description: 'No data available for the selected aircraft.',
    };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByTestId('crosswind-result-panel-data-not-available')).toBeTruthy();
    expect(tree.getByText('No data available for the selected aircraft.')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the out-of-envelope caption (NoLookupData fallback)', () => {
    const state: CrosswindUIState = {
      kind: 'out-of-envelope',
      reason: 'Inputs cannot be evaluated by the lookup table. Adjust inputs.',
    };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByTestId('crosswind-result-panel-out-of-envelope')).toBeTruthy();
  });

  it('renders the error variant with headline + description', () => {
    const state: CrosswindUIState = {
      kind: 'error',
      headline: 'Calculation unavailable',
      description: 'Verify inputs and try again.',
    };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByTestId('crosswind-result-panel-error')).toBeTruthy();
    expect(tree.getByText('Calculation unavailable')).toBeTruthy();
    expect(tree.getByText('Verify inputs and try again.')).toBeTruthy();
  });

  it('updates the rendered value when the state changes', () => {
    const initial: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
      warning: null,
    };
    const tree = renderWithTheme(<CrosswindResult state={initial} />);
    expect(tree.getByText('33')).toBeTruthy();
    tree.rerender(
      <CrosswindResult state={{ kind: 'idle', output: idleOutput(28), warning: null }} />,
    );
    expect(tree.getByText('28')).toBeTruthy();
  });
});
