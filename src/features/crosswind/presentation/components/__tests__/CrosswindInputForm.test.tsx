/**
 * Coverage for the Crosswind Takeoff input form after G2 (ADR-0021) —
 * the runway-condition row switched from a 6-segment SegmentedControl
 * to the design-system `RunwayConditionPicker`.
 *
 * Groups:
 *   1. Viewport snapshots (iPhone compact / iPad portrait / iPad
 *      landscape) — the runway section renders the picker, not a
 *      segmented control.
 *   2. Picker integration — open sheet, list all 6 takeoff conditions
 *      in fixed order, select one, callback fires, sheet closes.
 *   3. Presentation parity — modal-centre on iPhone + iPad portrait,
 *      anchored popover on iPad landscape (same rule as Landing).
 *   4. Restore regression — for each of the 6 conditions × 2 aircraft
 *      variants the closed field shows the matching label (Recent
 *      Calculations restore path feeds the value prop the same way).
 */

import { fireEvent } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type { AircraftVariant, RunwayCondition } from '../../../domain/types';
import { CrosswindInputForm } from '../CrosswindInputForm';
import type { CrosswindInputFormProps } from '../CrosswindInputForm';

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

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useWindowDimensionsMock = useWindowDimensions as unknown as jest.Mock;

interface Viewport {
  readonly width: number;
  readonly height: number;
}

const IPHONE_15_PRO: Viewport = { width: 393, height: 852 };
const IPAD_11_PORTRAIT: Viewport = { width: 834, height: 1194 };
const IPAD_11_LANDSCAPE: Viewport = { width: 1194, height: 834 };

function setViewport(viewport: Viewport): void {
  useWindowDimensionsMock.mockReturnValue({ ...viewport, fontScale: 1, scale: 1 });
}

const noop = (): void => {};

function makeProps(overrides: Partial<CrosswindInputFormProps>): CrosswindInputFormProps {
  return {
    weightText: '',
    cgText: '',
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    weightError: null,
    cgError: null,
    onWeightChange: noop,
    onCGChange: noop,
    onAircraftChange: noop,
    onRunwayConditionChange: noop,
    isRegular: false,
    testID: 'form',
    ...overrides,
  };
}

// Fixed UI order — must match RUNWAY_OPTIONS in CrosswindInputForm.
const EXPECTED_ORDER: readonly { value: RunwayCondition; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'good', label: 'Good' },
  { value: 'mediumToGood', label: 'Medium to Good' },
  { value: 'medium', label: 'Medium' },
  { value: 'mediumToPoor', label: 'Medium to Poor' },
  { value: 'poor', label: 'Poor' },
];

beforeEach(() => {
  setViewport(IPHONE_15_PRO);
});

describe('CrosswindInputForm · viewport snapshots (G2 picker)', () => {
  it('iPhone compact (393x852) — runway row renders the picker', () => {
    const tree = renderWithTheme(<CrosswindInputForm {...makeProps({})} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('iPad 11" portrait (834x1194, isRegular) — runway row renders the picker', () => {
    setViewport(IPAD_11_PORTRAIT);
    const tree = renderWithTheme(<CrosswindInputForm {...makeProps({ isRegular: true })} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('iPad 11" landscape (1194x834, isRegular) — runway row renders the picker', () => {
    setViewport(IPAD_11_LANDSCAPE);
    const tree = renderWithTheme(<CrosswindInputForm {...makeProps({ isRegular: true })} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe('CrosswindInputForm · runway picker integration', () => {
  it('closed field shows the current selection with picker a11y contract', () => {
    const tree = renderWithTheme(<CrosswindInputForm {...makeProps({})} />);
    const field = tree.getByTestId('crosswind-runway');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityState).toEqual({ expanded: false });
    expect(field.props.accessibilityValue).toEqual({ text: 'Dry' });
  });

  it('opening the sheet lists all 6 takeoff conditions in fixed order', () => {
    const tree = renderWithTheme(<CrosswindInputForm {...makeProps({})} />);
    fireEvent.press(tree.getByTestId('crosswind-runway'));
    for (const option of EXPECTED_ORDER) {
      const row = tree.getByTestId(`crosswind-runway-sheet-option-${option.value}`);
      expect(row.props.accessibilityLabel).toBe(option.label);
    }
    // No 7th (Landing-only) option leaks into the takeoff picker.
    expect(tree.queryByTestId('crosswind-runway-sheet-option-goodWetDamp')).toBeNull();
    expect(tree.queryByTestId('crosswind-runway-sheet-option-goodSlushSnow')).toBeNull();
  });

  it('tapping "Medium to Good" fires onRunwayConditionChange and closes the sheet', () => {
    const onRunwayConditionChange = jest.fn<void, [RunwayCondition]>();
    const tree = renderWithTheme(
      <CrosswindInputForm {...makeProps({ onRunwayConditionChange })} />,
    );
    fireEvent.press(tree.getByTestId('crosswind-runway'));
    fireEvent.press(tree.getByTestId('crosswind-runway-sheet-option-mediumToGood'));
    expect(onRunwayConditionChange).toHaveBeenCalledWith('mediumToGood');
    expect(tree.getByTestId('crosswind-runway').props.accessibilityState).toEqual({
      expanded: false,
    });
  });

  it('modal-centre presentation on iPhone and iPad portrait; anchored popover on iPad landscape', () => {
    // iPhone → centred modal card mounts.
    const phone = renderWithTheme(<CrosswindInputForm {...makeProps({ testID: 'f1' })} />);
    fireEvent.press(phone.getByTestId('crosswind-runway'));
    expect(phone.getByTestId('crosswind-runway-sheet-card')).toBeTruthy();
    phone.unmount();

    // iPad portrait → still centred modal.
    setViewport(IPAD_11_PORTRAIT);
    const portrait = renderWithTheme(
      <CrosswindInputForm {...makeProps({ isRegular: true, testID: 'f2' })} />,
    );
    fireEvent.press(portrait.getByTestId('crosswind-runway'));
    expect(portrait.getByTestId('crosswind-runway-sheet-card')).toBeTruthy();
    portrait.unmount();

    // iPad landscape → anchored popover branch (no centred card).
    setViewport(IPAD_11_LANDSCAPE);
    const landscape = renderWithTheme(
      <CrosswindInputForm {...makeProps({ isRegular: true, testID: 'f3' })} />,
    );
    fireEvent.press(landscape.getByTestId('crosswind-runway'));
    expect(landscape.queryByTestId('crosswind-runway-sheet-card')).toBeNull();
    expect(landscape.getByTestId('crosswind-runway-sheet-backdrop')).toBeTruthy();
  });
});

describe('CrosswindInputForm · restore regression (6 conditions × 2 aircraft)', () => {
  const AIRCRAFT: readonly AircraftVariant[] = ['b787_8', 'b787_9'];
  for (const aircraft of AIRCRAFT) {
    for (const option of EXPECTED_ORDER) {
      it(`${aircraft} + ${option.value} → closed field shows "${option.label}"`, () => {
        // Recent Calculations restore drives the screen state, which
        // reaches the form through the same `runwayCondition` prop —
        // the picker must surface the restored value as its label.
        const tree = renderWithTheme(
          <CrosswindInputForm {...makeProps({ aircraft, runwayCondition: option.value })} />,
        );
        const field = tree.getByTestId('crosswind-runway');
        expect(field.props.accessibilityValue).toEqual({ text: option.label });
        expect(tree.getByText(option.label)).toBeTruthy();
      });
    }
  }
});
