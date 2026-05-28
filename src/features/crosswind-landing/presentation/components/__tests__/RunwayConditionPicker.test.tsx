/**
 * RunwayConditionPicker — dropdown + bottom-sheet modal listing all 7
 * landing runway-condition options. Visual rationale: ADR-0018 § UI
 * Layout.
 *
 * Coverage:
 *   - closed-state field renders the current selection's label;
 *   - tapping the field opens the modal sheet (visible=true);
 *   - all 7 option rows render with the right testIDs + a11y role;
 *   - the active option has `selected: true` and shows the ✓ glyph;
 *   - tapping a row calls onChange with the matching value AND closes
 *     the sheet;
 *   - tapping Cancel closes without calling onChange;
 *   - tapping the backdrop closes without calling onChange.
 */

import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type { SegmentedControlOption } from '../../../../../design-system';
import { tokens } from '../../../../../design-system';
import type { LandingRunwayCondition } from '../../../../../core/aviation';
import { RunwayConditionPicker } from '../RunwayConditionPicker';

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

const OPTIONS: readonly SegmentedControlOption<LandingRunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'goodWetDamp', label: 'Good (Wet, Damp)' },
  { value: 'goodSlushSnow', label: 'Good (Slush, Dry Snow, Wet Snow)' },
  { value: 'goodToMedium', label: 'Good to Medium' },
  { value: 'medium', label: 'Medium' },
  { value: 'mediumToPoor', label: 'Medium to Poor' },
  { value: 'poor', label: 'Poor' },
];

describe('RunwayConditionPicker · closed state', () => {
  // The Ionicons chevron mounts asynchronously after font load and is
  // unreliable to query by testID in jest (see SettingsRow.test.tsx
  // "chevron alignment" rationale). We assert the field a11y contract
  // instead, which is what VoiceOver actually announces.
  it('renders the current selection label inside the closed field', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        testID="picker"
      />,
    );
    expect(tree.getByText('Dry')).toBeTruthy();
    const field = tree.getByTestId('picker');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityState).toEqual({ expanded: false });
    expect(field.props.accessibilityValue).toEqual({ text: 'Dry' });
  });
});

describe('RunwayConditionPicker · size parity with SegmentedControl', () => {
  // Closed field on `size="regular"` must reach the same minHeight as
  // the regular SegmentedControl track (72 pt, sourced from
  // `tokens.sizing.settingsRow.regular.minHeight`). This guards
  // against the iPad regression where the picker looked smaller than
  // the adjacent Aircraft / Landing-mode controls.
  it('closed field at size=regular has minHeight = settingsRow.regular.minHeight', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        size="regular"
        testID="picker"
      />,
    );
    const field = tree.getByTestId('picker');
    const styleArray = Array.isArray(field.props.style) ? field.props.style : [field.props.style];
    const flat = Object.assign({}, ...styleArray) as { minHeight?: number };
    expect(flat.minHeight).toBe(tokens.sizing.settingsRow.regular.minHeight);
  });

  it('closed field at size=compact has minHeight = minTouchTarget', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        size="compact"
        testID="picker"
      />,
    );
    const field = tree.getByTestId('picker');
    const styleArray = Array.isArray(field.props.style) ? field.props.style : [field.props.style];
    const flat = Object.assign({}, ...styleArray) as { minHeight?: number };
    expect(flat.minHeight).toBe(tokens.layout.minTouchTarget);
  });

  it('sheet rows at size=regular use settingsRow.regular row metrics', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        size="regular"
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    const row = tree.getByTestId('picker-sheet-option-dry');
    const styleArray = Array.isArray(row.props.style) ? row.props.style : [row.props.style];
    const flat = Object.assign({}, ...styleArray) as {
      minHeight?: number;
      paddingHorizontal?: number;
    };
    expect(flat.minHeight).toBe(tokens.sizing.settingsRow.regular.minHeight);
    expect(flat.paddingHorizontal).toBe(tokens.sizing.settingsRow.regular.paddingH);
  });
});

describe('RunwayConditionPicker · visual regression (size × state)', () => {
  it('size=compact, closed', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        size="compact"
        testID="picker"
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('size=regular, closed', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="goodWetDamp"
        options={OPTIONS}
        onChange={jest.fn()}
        size="regular"
        testID="picker"
      />,
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('size=compact, open (sheet visible)', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        size="compact"
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('size=regular, open (sheet visible)', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="goodWetDamp"
        options={OPTIONS}
        onChange={jest.fn()}
        size="regular"
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    expect(tree.toJSON()).toMatchSnapshot();
  });
});

describe('RunwayConditionPicker · open state', () => {
  it('tapping the field opens the modal sheet with all 7 option rows', () => {
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="goodWetDamp"
        options={OPTIONS}
        onChange={jest.fn()}
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));

    // Field's accessibilityState now reports expanded.
    expect(tree.getByTestId('picker').props.accessibilityState).toEqual({ expanded: true });

    // All 7 option rows present with radio role.
    for (const option of OPTIONS) {
      const row = tree.getByTestId(`picker-sheet-option-${option.value}`);
      expect(row.props.accessibilityRole).toBe('radio');
      expect(row.props.accessibilityLabel).toBe(option.label);
    }

    // Only the active option reports selected=true.
    expect(tree.getByTestId('picker-sheet-option-goodWetDamp').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(tree.getByTestId('picker-sheet-option-dry').props.accessibilityState).toEqual({
      selected: false,
    });

    // Cancel button rendered.
    expect(tree.getByTestId('picker-sheet-cancel')).toBeTruthy();
  });
});

describe('RunwayConditionPicker · selection', () => {
  it('tapping a row calls onChange with that value and closes the sheet', () => {
    const onChange = jest.fn<void, [LandingRunwayCondition]>();
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={onChange}
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    fireEvent.press(tree.getByTestId('picker-sheet-option-goodSlushSnow'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('goodSlushSnow');
    // After selection the field reverts to non-expanded.
    expect(tree.getByTestId('picker').props.accessibilityState).toEqual({ expanded: false });
  });

  it('tapping Cancel closes the sheet without calling onChange', () => {
    const onChange = jest.fn<void, [LandingRunwayCondition]>();
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={onChange}
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    fireEvent.press(tree.getByTestId('picker-sheet-cancel'));

    expect(onChange).not.toHaveBeenCalled();
    expect(tree.getByTestId('picker').props.accessibilityState).toEqual({ expanded: false });
  });

  it('tapping the backdrop closes the sheet without calling onChange', () => {
    const onChange = jest.fn<void, [LandingRunwayCondition]>();
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={onChange}
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));
    fireEvent.press(tree.getByTestId('picker-sheet-backdrop'));

    expect(onChange).not.toHaveBeenCalled();
    expect(tree.getByTestId('picker').props.accessibilityState).toEqual({ expanded: false });
  });
});
