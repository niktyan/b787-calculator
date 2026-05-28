/**
 * Coverage for the Landing input form runway-condition row (ADR-0018).
 *
 * The runway condition row is now a single-line `RunwayConditionPicker`
 * (closed-state field showing the current label + a chevron-down icon)
 * that opens a `BottomSheet` modal listing all 7 options. These tests
 * confirm:
 *   - the field renders with the current selection's label by default
 *     (closed);
 *   - the chevron icon is present;
 *   - accessibility role + expanded state are correct for the closed
 *     field.
 *
 * The full picker behaviour (open / select / cancel / a11y of rows)
 * is covered in `RunwayConditionPicker.test.tsx`.
 */

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import { tokens } from '../../../../../design-system';
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

describe('CrosswindLandingInputForm · runway condition row (ADR-0018)', () => {
  it('renders the closed-state picker showing the current selection (compact)', () => {
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
    // Closed picker field is the radio-group trigger; it renders the
    // selected option's label as its child Text.
    expect(tree.getByText('Dry')).toBeTruthy();
    const field = tree.getByTestId('landing-runway');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityState).toEqual({ expanded: false });
    expect(field.props.accessibilityValue).toEqual({ text: 'Dry' });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders the closed-state picker showing the current selection (regular)', () => {
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
    expect(tree.getByText('Good (Slush, Dry Snow, Wet Snow)')).toBeTruthy();
    const field = tree.getByTestId('landing-runway');
    expect(field.props.accessibilityValue).toEqual({
      text: 'Good (Slush, Dry Snow, Wet Snow)',
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('picker field at isRegular=true reaches the regular settings-row min-height (size parity)', () => {
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
        isRegular
        testID="form-regular"
      />,
    );
    const field = tree.getByTestId('landing-runway');
    const styleArray = Array.isArray(field.props.style) ? field.props.style : [field.props.style];
    const flat = Object.assign({}, ...styleArray) as { minHeight?: number };
    // Same value the regular SegmentedControl reaches via REGULAR_TRACK_HEIGHT.
    expect(flat.minHeight).toBe(tokens.sizing.settingsRow.regular.minHeight);
  });
});
