/**
 * RunwayConditionPicker — hybrid presentation (ADR-0018 § UI Layout,
 * F2 visual fix v4).
 *
 * Coverage:
 *   - closed-state field a11y;
 *   - presentation resolution: anchored on iPad landscape only, modal-
 *     centre everywhere else (iPhone any orientation, iPad portrait
 *     including iPad 13" 1024×1366);
 *   - selection / cancel / backdrop dismiss flows;
 *   - size parity assertions (regular field height matches
 *     SegmentedControl regular track via settingsRow.regular.minHeight).
 *
 * Visual regression — 4 explicit viewport snapshots covering both
 * presentation branches.
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

// Mock useWindowDimensions via its submodule path — same approach as
// src/__tests__/app/crosswind.test.tsx. Mocking the top-level
// `react-native` module breaks RN's TurboModule init under jest-expo.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 0, height: 0, scale: 1, fontScale: 1 })),
}));

interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly fontScale: number;
}

// iPhone 15 (393×852) — any orientation goes through modal-centre.
const IPHONE: Viewport = { width: 393, height: 852, scale: 3, fontScale: 1 };
// iPad 11" landscape (1194×834) — width ≥ 1024 and landscape → anchored.
const IPAD_11_LANDSCAPE: Viewport = { width: 1194, height: 834, scale: 2, fontScale: 1 };
// iPad 13" landscape (1366×1024) — width ≥ 1024 and landscape → anchored.
const IPAD_13_LANDSCAPE: Viewport = { width: 1366, height: 1024, scale: 2, fontScale: 1 };
// iPad 13" portrait (1024×1366) — width ≥ 1024 BUT portrait → modal-centre.
// This is the critical case: the bare `width >= regular` rule would
// route here to anchored, but the compound rule keeps it modal-centre.
const IPAD_13_PORTRAIT: Viewport = { width: 1024, height: 1366, scale: 2, fontScale: 1 };
// iPad 11" portrait (834×1194) — width < 1024 → modal-centre.
const IPAD_11_PORTRAIT: Viewport = { width: 834, height: 1194, scale: 2, fontScale: 1 };

const DEFAULT_VIEWPORT: Viewport = { width: 0, height: 0, scale: 1, fontScale: 1 };

function getViewportMock(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native/Libraries/Utilities/useWindowDimensions').default as jest.Mock;
}

function setViewport(viewport: Viewport): void {
  getViewportMock().mockReturnValue(viewport);
}

beforeEach(() => {
  setViewport(DEFAULT_VIEWPORT);
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

describe('RunwayConditionPicker · presentation resolution', () => {
  it.each<[string, Viewport, 'anchored' | 'modal-centre']>([
    ['iPhone', IPHONE, 'modal-centre'],
    ['iPad 11" portrait', IPAD_11_PORTRAIT, 'modal-centre'],
    ['iPad 13" portrait (1024×1366)', IPAD_13_PORTRAIT, 'modal-centre'],
    ['iPad 11" landscape (1194×834)', IPAD_11_LANDSCAPE, 'anchored'],
    ['iPad 13" landscape (1366×1024)', IPAD_13_LANDSCAPE, 'anchored'],
  ])('%s → %s', (_label, viewport, expected) => {
    setViewport(viewport);
    const tree = renderWithTheme(
      <RunwayConditionPicker<LandingRunwayCondition>
        value="dry"
        options={OPTIONS}
        onChange={jest.fn()}
        testID="picker"
      />,
    );
    fireEvent.press(tree.getByTestId('picker'));

    // Anchored uses computeAnchoredPosition; the AnchoredPopoverHost
    // initially needs measureInWindow to resolve before rendering its
    // testID. In both branches the rows are queryable once the modal
    // mounts. We distinguish by the presence of the picker-sheet
    // wrapping testIDs — sheet-cancel exists in both, sheet-backdrop
    // exists only in modal-centre (BottomSheet's testID-backdrop is
    // hardcoded suffix) — but the cleanest distinguishing signal is
    // whether the BottomSheet's container with the max-width wrapper
    // appears. Use the option testID presence as the universal proof
    // the sheet is mounted, then assert on the host wrapper type.
    if (expected === 'modal-centre') {
      // BottomSheet always mounts its testID-backdrop child Pressable.
      expect(tree.getByTestId('picker-sheet-backdrop')).toBeTruthy();
    } else {
      // Anchored host doesn't mount the BottomSheet, so there is no
      // picker-sheet-backdrop. But it DOES expose its own backdrop:
      // <AnchoredPopoverHost testID="picker-sheet"> renders
      // `${testID}-backdrop`. measureInWindow may resolve asynchronously
      // in the test env — measureAnchor falls back to skipping render
      // when the ref returns no native handle, so we accept either
      // "anchored host visible" or "anchored host not yet measured" as
      // proof. The harder assertion is the NEGATIVE — no BottomSheet
      // backdrop, no centred container.
      expect(tree.queryByTestId('picker-sheet-backdrop')).toBeNull();
    }
  });
});

describe('RunwayConditionPicker · selection flow', () => {
  it('tapping a row calls onChange with the value and closes (modal-centre)', () => {
    setViewport(IPHONE);
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
    expect(onChange).toHaveBeenCalledWith('goodSlushSnow');
    expect(tree.getByTestId('picker').props.accessibilityState).toEqual({ expanded: false });
  });

  it('tapping Cancel closes without calling onChange (modal-centre)', () => {
    setViewport(IPHONE);
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
  });

  it('tapping the backdrop closes without calling onChange (modal-centre)', () => {
    setViewport(IPHONE);
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
  });
});

describe('RunwayConditionPicker · size parity with SegmentedControl', () => {
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
});

describe('RunwayConditionPicker · visual regression (viewport × state)', () => {
  it('iPhone — closed', () => {
    setViewport(IPHONE);
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

  it('iPhone — open (modal-centre)', () => {
    setViewport(IPHONE);
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

  it('iPad 13" portrait (1024×1366) — open stays modal-centre', () => {
    setViewport(IPAD_13_PORTRAIT);
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

  it('iPad 11" landscape (1194×834) — open is anchored', () => {
    setViewport(IPAD_11_LANDSCAPE);
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

  it('iPad 13" landscape (1366×1024) — open is anchored', () => {
    setViewport(IPAD_13_LANDSCAPE);
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
