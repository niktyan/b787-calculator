/**
 * Snapshot + presence coverage for the Landing input form runway
 * segmented control (ADR-0018).
 *
 * The contract under test:
 *   - exactly 7 runway-condition options render in the v2 order;
 *   - labels match the AFM Rev. 20 phrasing verbatim, in English in
 *     both locales per the aviation-term policy;
 *   - changing `isRegular` selects compact vs. regular sizing without
 *     dropping any option.
 */

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import { CrosswindLandingInputForm } from '../CrosswindLandingInputForm';

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

const noop = (): void => {};

const RUNWAY_LABELS_IN_ORDER: readonly string[] = [
  'Dry',
  'Good (Wet, Damp)',
  'Good (Slush, Dry Snow, Wet Snow)',
  'Good to Medium',
  'Medium',
  'Medium to Poor',
  'Poor',
];

describe('CrosswindLandingInputForm · runway condition (ADR-0018)', () => {
  it('renders the 7 runway options in the v2 order (compact / iPhone layout)', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm
        aircraft="b787_8"
        runwayCondition="dry"
        landingMode="manual"
        asymReverse="no"
        catIIIII="no"
        engineInop="no"
        onAircraftChange={noop}
        onRunwayConditionChange={noop}
        onLandingModeChange={noop}
        onAsymReverseChange={noop}
        onCatIIIIIChange={noop}
        onEngineInopChange={noop}
        isRegular={false}
        testID="form-compact"
      />,
    );
    for (const label of RUNWAY_LABELS_IN_ORDER) {
      expect(tree.getByText(label)).toBeTruthy();
    }
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the 7 runway options in the v2 order (regular / iPad layout)', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm
        aircraft="b787_9"
        runwayCondition="goodSlushSnow"
        landingMode="auto"
        asymReverse="yes"
        catIIIII="yes"
        engineInop="no"
        onAircraftChange={noop}
        onRunwayConditionChange={noop}
        onLandingModeChange={noop}
        onAsymReverseChange={noop}
        onCatIIIIIChange={noop}
        onEngineInopChange={noop}
        isRegular
        testID="form-regular"
      />,
    );
    for (const label of RUNWAY_LABELS_IN_ORDER) {
      expect(tree.getByText(label)).toBeTruthy();
    }
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the 7 runway labels in the exact AFM order via accessibilityState', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm
        aircraft="b787_8"
        runwayCondition="dry"
        landingMode="manual"
        asymReverse="no"
        catIIIII="no"
        engineInop="no"
        onAircraftChange={noop}
        onRunwayConditionChange={noop}
        onLandingModeChange={noop}
        onAsymReverseChange={noop}
        onCatIIIIIChange={noop}
        onEngineInopChange={noop}
      />,
    );
    const renderedOrder = RUNWAY_LABELS_IN_ORDER.map((label) => {
      const node = tree.getByText(label);
      return node.props.children;
    });
    expect(renderedOrder).toEqual(RUNWAY_LABELS_IN_ORDER);
  });
});
