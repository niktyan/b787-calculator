/**
 * Visual-regression snapshots for `RunwayConditionPicker` — open state
 * at five viewports covering both presentation branches (F2 visual fix
 * v5, ADR-0018 § UI Layout):
 *   - iPhone portrait (modal-centre, fade)
 *   - iPad 11" portrait (modal-centre, ~480 pt card)
 *   - iPad 13" portrait (modal-centre, ~480 pt card)
 *   - iPad 11" landscape (anchored popover)
 *   - iPad 13" landscape (anchored popover)
 *
 * Behaviour assertions (open / close / a11y / size parity) live in
 * `RunwayConditionPicker.test.tsx`.
 */

import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import type { SegmentedControlOption } from '../../../../../design-system';
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

const IPHONE: Viewport = { width: 393, height: 852, scale: 3, fontScale: 1 };
const IPAD_11_PORTRAIT: Viewport = { width: 834, height: 1194, scale: 2, fontScale: 1 };
const IPAD_13_PORTRAIT: Viewport = { width: 1024, height: 1366, scale: 2, fontScale: 1 };
const IPAD_11_LANDSCAPE: Viewport = { width: 1194, height: 834, scale: 2, fontScale: 1 };
const IPAD_13_LANDSCAPE: Viewport = { width: 1366, height: 1024, scale: 2, fontScale: 1 };
const DEFAULT_VIEWPORT: Viewport = { width: 0, height: 0, scale: 1, fontScale: 1 };

function setViewport(viewport: Viewport): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mock = require('react-native/Libraries/Utilities/useWindowDimensions').default as jest.Mock;
  mock.mockReturnValue(viewport);
}

const OPTIONS: readonly SegmentedControlOption<LandingRunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'goodWetDamp', label: 'Good (Wet, Damp)' },
  { value: 'goodSlushSnow', label: 'Good (Slush, Dry Snow, Wet Snow)' },
  { value: 'goodToMedium', label: 'Good to Medium' },
  { value: 'medium', label: 'Medium' },
  { value: 'mediumToPoor', label: 'Medium to Poor' },
  { value: 'poor', label: 'Poor' },
];

beforeEach(() => setViewport(DEFAULT_VIEWPORT));

describe('RunwayConditionPicker · open snapshots', () => {
  it('iPhone portrait — centred modal, fade', () => {
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

  it('iPad 11" portrait — centred modal (~480 pt card)', () => {
    setViewport(IPAD_11_PORTRAIT);
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

  it('iPad 13" portrait — centred modal (~480 pt card)', () => {
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

  it('iPad 11" landscape — anchored popover (660 pt high)', () => {
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

  it('iPad 13" landscape — anchored popover (660 pt high)', () => {
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
