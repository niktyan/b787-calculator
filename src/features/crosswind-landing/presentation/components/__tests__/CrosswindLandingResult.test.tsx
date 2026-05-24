/**
 * Behaviour + snapshot coverage for the Landing result panel.
 *
 * The component mirrors the takeoff CrosswindResult states minus the
 * takeoff-only paths (empty, out-of-envelope). Landing's view-model
 * never produces those states because there are no numeric inputs to
 * parse or an envelope to violate.
 */

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type { CrosswindLandingOutput } from '../../../domain/types';
import type { CrosswindLandingUIState } from '../../useCrosswindLandingCalculator';
import { CrosswindLandingResult } from '../CrosswindLandingResult';

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

function idleOutput(value: number): CrosswindLandingOutput {
  return {
    maxCrosswindKnots: value,
    metadata: {
      dataVersion: '2026-05-23.001',
      referenceDocument: 'Boeing 787 FCOM',
      aircraft: 'b787_8',
      landingMode: 'manual',
      appliedAdjustments: { catCap: false, asymPenalty: false, inopCap: false },
    },
  };
}

describe('CrosswindLandingResult', () => {
  it('renders the centred number for idle state (default B787-8 manual dry → 37 KT)', () => {
    const state: CrosswindLandingUIState = { kind: 'idle', output: idleOutput(37) };
    const tree = renderWithTheme(<CrosswindLandingResult state={state} testID="result" />);
    expect(tree.getByTestId('crosswind-landing-result-panel')).toBeTruthy();
    expect(tree.getByText('37')).toBeTruthy();
    expect(tree.getByText('KT')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the regular-size variant when isRegular={true}', () => {
    const state: CrosswindLandingUIState = { kind: 'idle', output: idleOutput(33) };
    const tree = renderWithTheme(
      <CrosswindLandingResult state={state} isRegular testID="result" />,
    );
    const json = JSON.stringify(tree.toJSON());
    // Regular variant uses displayLarge (72 pt baseline overridden to 96 here) + monoXL.
    expect(json).toContain('"fontSize":96');
    expect(json).toContain('"fontSize":48');
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the data-not-available caption for an unimplemented aircraft', () => {
    const state: CrosswindLandingUIState = {
      kind: 'data-not-available',
      description: 'No data available for the selected aircraft.',
    };
    const tree = renderWithTheme(<CrosswindLandingResult state={state} />);
    expect(tree.getByTestId('crosswind-landing-result-panel-data-not-available')).toBeTruthy();
    expect(tree.getByText('No data available for the selected aircraft.')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the error variant with headline + description', () => {
    const state: CrosswindLandingUIState = {
      kind: 'error',
      headline: 'Calculation unavailable',
      description: 'Verify inputs and try again.',
    };
    const tree = renderWithTheme(<CrosswindLandingResult state={state} />);
    expect(tree.getByTestId('crosswind-landing-result-panel-error')).toBeTruthy();
    expect(tree.getByText('Calculation unavailable')).toBeTruthy();
    expect(tree.getByText('Verify inputs and try again.')).toBeTruthy();
  });

  it('updates the rendered value when the state changes', () => {
    const initial: CrosswindLandingUIState = { kind: 'idle', output: idleOutput(33) };
    const tree = renderWithTheme(<CrosswindLandingResult state={initial} />);
    expect(tree.getByText('33')).toBeTruthy();
    tree.rerender(<CrosswindLandingResult state={{ kind: 'idle', output: idleOutput(20) }} />);
    expect(tree.getByText('20')).toBeTruthy();
  });
});
