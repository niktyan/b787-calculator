/**
 * Behaviour + snapshot coverage for the simplified CrosswindResult
 * panel (Block 5 single-card variant).
 */

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type { CrosswindKnots, CrosswindCalculationOutput } from '../../../domain/types';
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

// Verbatim FCOM B787 Tab.2.29.2 footer — kept in sync with
// `src/core/i18n/locales/en.json` / `ru.json` `crosswind.cautionText`.
const FCOM_CAUTION_TEXT =
  'CAUTION: Reduce all takeoff crosswind guidelines by 5 knots if thrust is above 40% N1 at brake release for takeoff roll (not rolling takeoff).';

describe('CrosswindResult', () => {
  it('renders the centred number with one decimal place (ADR-0017: 33 → "33.0")', () => {
    const state: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
    };
    const tree = renderWithTheme(<CrosswindResult state={state} testID="result" />);
    expect(tree.getByTestId('crosswind-result-panel')).toBeTruthy();
    // toFixed(1) renders integer-valued knots as "33.0", not "33".
    expect(tree.getByText('33.0')).toBeTruthy();
    expect(tree.getByText('KT')).toBeTruthy();
    // No warning chip is ever rendered in idle state (ADR-0012).
    expect(tree.queryByTestId('crosswind-warning-chip')).toBeNull();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the iPad-regular variant when isRegular={true}', () => {
    const state: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
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

  it('renders out-of-envelope caption (no number) for operational envelope violation per ADR-0012', () => {
    // The view-model collapses any operational-envelope violation to this
    // state with a localized reason. Verified here at the component level
    // — the caption renders and no number is shown.
    const state: CrosswindUIState = {
      kind: 'out-of-envelope',
      reason: 'Out of operational envelope — adjust inputs',
    };
    const tree = renderWithTheme(<CrosswindResult state={state} />);
    expect(tree.getByTestId('crosswind-result-panel-out-of-envelope')).toBeTruthy();
    expect(tree.getByText('Out of operational envelope — adjust inputs')).toBeTruthy();
    expect(tree.queryByTestId('crosswind-warning-chip')).toBeNull();
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

  it('updates the rendered value when the state changes (one decimal place per ADR-0017)', () => {
    const initial: CrosswindUIState = {
      kind: 'idle',
      output: idleOutput(33),
    };
    const tree = renderWithTheme(<CrosswindResult state={initial} />);
    expect(tree.getByText('33.0')).toBeTruthy();
    tree.rerender(<CrosswindResult state={{ kind: 'idle', output: idleOutput(28) }} />);
    expect(tree.getByText('28.0')).toBeTruthy();
  });

  // ADR-0020 — FCOM CAUTION advisory line under the takeoff result.
  describe('ADR-0020 FCOM CAUTION advisory line', () => {
    it('renders the verbatim FCOM CAUTION caption under the value in idle state', () => {
      const state: CrosswindUIState = {
        kind: 'idle',
        output: idleOutput(33),
      };
      const tree = renderWithTheme(<CrosswindResult state={state} />);
      const caution = tree.getByTestId('crosswind-result-caution');
      expect(caution).toBeTruthy();
      // Text content must match FCOM B787 Tab.2.29.2 footer byte-for-byte.
      // The Text component falls back to its children for the VoiceOver
      // readout when no explicit accessibilityLabel is supplied, so the
      // advisory caveat reaches screen-reader users in full.
      expect(caution.props.children).toBe(FCOM_CAUTION_TEXT);
    });

    it('does not cap the CAUTION caption with numberOfLines (full FCOM text never truncates)', () => {
      // ADR-0020 follow-up #2: at the bumped `body` typography variant
      // the verbatim FCOM string wraps to more than 3 lines on iPhone
      // compact, so a numberOfLines clamp would clip the tail ("not
      // rolling takeoff"). The CAUTION string is bounded by its i18n
      // key — unbounded wrap is safe. Asserting prop absence here is
      // viewport-independent: without `numberOfLines` RN never
      // ellipsizes, regardless of how many wrap lines the text takes
      // on iPhone SE (375 pt) through iPad 13" landscape (1366 pt).
      const tree = renderWithTheme(
        <CrosswindResult state={{ kind: 'idle', output: idleOutput(33) }} />,
      );
      const caution = tree.getByTestId('crosswind-result-caution');
      expect(caution.props.numberOfLines).toBeUndefined();
      // And the rendered children are the full FCOM string — no caller
      // is silently shortening it.
      expect(caution.props.children).toBe(FCOM_CAUTION_TEXT);
      expect((caution.props.children as string).endsWith('(not rolling takeoff).')).toBe(true);
    });

    it('renders the CAUTION caption on the iPad-regular variant too', () => {
      const state: CrosswindUIState = {
        kind: 'idle',
        output: idleOutput(33),
      };
      const tree = renderWithTheme(<CrosswindResult state={state} isRegular />);
      const caution = tree.getByTestId('crosswind-result-caution');
      expect(caution).toBeTruthy();
      expect(caution.props.children).toBe(FCOM_CAUTION_TEXT);
    });

    it('suppresses the CAUTION caption when the result panel is in out-of-envelope state', () => {
      // ADR-0020 §1: the CAUTION line is bound to the idle (real-result)
      // path. Showing it next to a "no result" caption would imply the
      // FCOM caveat applies to the non-result, which is misleading.
      const state: CrosswindUIState = {
        kind: 'out-of-envelope',
        reason: 'Out of operational envelope — adjust inputs',
      };
      const tree = renderWithTheme(<CrosswindResult state={state} />);
      expect(tree.queryByTestId('crosswind-result-caution')).toBeNull();
    });

    it('suppresses the CAUTION caption in empty / data-not-available / error states', () => {
      const empty = renderWithTheme(<CrosswindResult state={{ kind: 'empty' }} />);
      expect(empty.queryByTestId('crosswind-result-caution')).toBeNull();

      const dataMissing = renderWithTheme(
        <CrosswindResult
          state={{
            kind: 'data-not-available',
            description: 'No data available for the selected aircraft.',
          }}
        />,
      );
      expect(dataMissing.queryByTestId('crosswind-result-caution')).toBeNull();

      const errored = renderWithTheme(
        <CrosswindResult
          state={{
            kind: 'error',
            headline: 'Calculation unavailable',
            description: 'Verify inputs and try again.',
          }}
        />,
      );
      expect(errored.queryByTestId('crosswind-result-caution')).toBeNull();
    });

    it('paints the CAUTION caption with the light-theme textSecondary token', () => {
      const state: CrosswindUIState = {
        kind: 'idle',
        output: idleOutput(33),
      };
      const tree = renderWithTheme(<CrosswindResult state={state} />, { mode: 'light' });
      const caution = tree.getByTestId('crosswind-result-caution');
      // tokens.colors.light.textSecondary = '#4B5563'
      const flat = Array.isArray(caution.props.style)
        ? Object.assign({}, ...caution.props.style.filter(Boolean))
        : caution.props.style;
      expect(flat.color).toBe('#4B5563');
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('paints the CAUTION caption with the dark-theme textSecondary token', () => {
      const state: CrosswindUIState = {
        kind: 'idle',
        output: idleOutput(33),
      };
      const tree = renderWithTheme(<CrosswindResult state={state} />, { mode: 'dark' });
      const caution = tree.getByTestId('crosswind-result-caution');
      // tokens.colors.dark.textSecondary = '#8B949E'
      const flat = Array.isArray(caution.props.style)
        ? Object.assign({}, ...caution.props.style.filter(Boolean))
        : caution.props.style;
      expect(flat.color).toBe('#8B949E');
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });
});
