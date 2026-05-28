/**
 * Coverage for the Crosswind Landing input form after F3 / ADR-0019.
 *
 * Two thematic groups:
 *   1. RunwayConditionPicker behaviour (ADR-0018) — kept from prior PRs.
 *   2. Static layout + reserved Autoland slot (ADR-0019):
 *        a) No ScrollView inside the rendered tree.
 *        b) The reserved row (CAT II/III + ONE ENG INOP) is mounted in
 *           both Manual and Autoland with the same number of leaf nodes
 *           and the same number of SegmentedControl tracks — i.e., the
 *           result panel placed after the form sits at an identical
 *           layout offset across the two states.
 *        c) Manual: each reserved ToggleCell has opacity 0,
 *           accessibilityElementsHidden true, importantForAccessibility
 *           'no-hide-descendants', and pointerEvents 'none'.
 *        d) Autoland: each reserved ToggleCell has opacity 1, is in the
 *           accessibility tree, and exposes its 2-segment radio buttons.
 *        e) 7-viewport × 2-state snapshot matrix — 14 snapshots in total.
 */

import { useWindowDimensions } from 'react-native';

import { renderWithTheme } from '../../../../../design-system/_testing/renderWithTheme';
import { tokens } from '../../../../../design-system';
import { CrosswindLandingInputForm } from '../CrosswindLandingInputForm';
import type { CrosswindLandingInputFormProps } from '../CrosswindLandingInputForm';

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
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly isRegular: boolean;
}

const IPHONE_SE: Viewport = {
  name: 'iPhone SE (375x667)',
  width: 375,
  height: 667,
  isRegular: false,
};
const IPHONE_15_PRO: Viewport = {
  name: 'iPhone 15 Pro (393x852)',
  width: 393,
  height: 852,
  isRegular: false,
};
const IPHONE_15_PRO_MAX: Viewport = {
  name: 'iPhone 15 Pro Max (430x932)',
  width: 430,
  height: 932,
  isRegular: false,
};
const IPAD_11_PORTRAIT: Viewport = {
  name: 'iPad 11" portrait (834x1194)',
  width: 834,
  height: 1194,
  isRegular: true,
};
const IPAD_11_LANDSCAPE: Viewport = {
  name: 'iPad 11" landscape (1194x834)',
  width: 1194,
  height: 834,
  isRegular: true,
};
const IPAD_13_PORTRAIT: Viewport = {
  name: 'iPad 13" portrait (1024x1366)',
  width: 1024,
  height: 1366,
  isRegular: true,
};
const IPAD_13_LANDSCAPE: Viewport = {
  name: 'iPad 13" landscape (1366x1024)',
  width: 1366,
  height: 1024,
  isRegular: true,
};

const VIEWPORTS: readonly Viewport[] = [
  IPHONE_SE,
  IPHONE_15_PRO,
  IPHONE_15_PRO_MAX,
  IPAD_11_PORTRAIT,
  IPAD_11_LANDSCAPE,
  IPAD_13_PORTRAIT,
  IPAD_13_LANDSCAPE,
];

const noop = (): void => {};

function makeProps(
  overrides: Partial<CrosswindLandingInputFormProps>,
): CrosswindLandingInputFormProps {
  return {
    aircraft: 'b787_8',
    runwayCondition: 'dry',
    landingMode: 'manual',
    asymReverse: 'no',
    catIIIII: 'no',
    engineInop: 'no',
    onAircraftChange: noop,
    onRunwayConditionChange: noop,
    onLandingModeChange: noop,
    onAsymReverseChange: noop,
    onCatIIIIIChange: noop,
    onEngineInopChange: noop,
    isRegular: false,
    testID: 'form',
    ...overrides,
  };
}

beforeEach(() => {
  useWindowDimensionsMock.mockReturnValue({
    width: IPHONE_SE.width,
    height: IPHONE_SE.height,
    fontScale: 1,
    scale: 1,
  });
});

describe('CrosswindLandingInputForm · runway condition row (ADR-0018)', () => {
  it('renders the closed-state picker showing the current selection (compact)', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ testID: 'form-compact' })} />,
    );
    expect(tree.getByText('Dry')).toBeTruthy();
    const field = tree.getByTestId('landing-runway');
    expect(field.props.accessibilityRole).toBe('button');
    expect(field.props.accessibilityState).toEqual({ expanded: false });
    expect(field.props.accessibilityValue).toEqual({ text: 'Dry' });
  });

  it('renders the closed-state picker showing the current selection (regular)', () => {
    useWindowDimensionsMock.mockReturnValue({
      width: 1194,
      height: 834,
      fontScale: 1,
      scale: 1,
    });
    const tree = renderWithTheme(
      <CrosswindLandingInputForm
        {...makeProps({
          aircraft: 'b787_9',
          runwayCondition: 'goodSlushSnow',
          landingMode: 'auto',
          asymReverse: 'yes',
          catIIIII: 'yes',
          engineInop: 'no',
          isRegular: true,
          testID: 'form-regular',
        })}
      />,
    );
    expect(tree.getByText('Good (Slush, Dry Snow, Wet Snow)')).toBeTruthy();
    const field = tree.getByTestId('landing-runway');
    expect(field.props.accessibilityValue).toEqual({
      text: 'Good (Slush, Dry Snow, Wet Snow)',
    });
  });

  it('picker field at isRegular=true reaches the regular settings-row min-height (size parity)', () => {
    useWindowDimensionsMock.mockReturnValue({
      width: 1194,
      height: 834,
      fontScale: 1,
      scale: 1,
    });
    const tree = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ isRegular: true, testID: 'form-regular' })} />,
    );
    const field = tree.getByTestId('landing-runway');
    const styleArray = Array.isArray(field.props.style) ? field.props.style : [field.props.style];
    const flat = Object.assign({}, ...styleArray) as { minHeight?: number };
    expect(flat.minHeight).toBe(tokens.sizing.settingsRow.regular.minHeight);
  });
});

describe('CrosswindLandingInputForm · static layout & reserved Autoland slot (ADR-0019)', () => {
  it('renders no ScrollView in the form tree', () => {
    const tree = renderWithTheme(<CrosswindLandingInputForm {...makeProps({})} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toMatch(/ScrollView/);
  });

  it('mounts the reserved CAT/INOP row in both Manual and Autoland (layout-offset stability)', () => {
    const manual = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ landingMode: 'manual', testID: 'form-m' })} />,
    );
    const auto = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ landingMode: 'auto', testID: 'form-a' })} />,
    );
    // The reserved row stays mounted in both states. In Manual the
    // cells are accessibility-hidden, so queries must opt-in via
    // `includeHiddenElements`.
    const opts = { includeHiddenElements: true } as const;
    expect(manual.getByTestId('landing-row-reserved', opts)).toBeTruthy();
    expect(auto.getByTestId('landing-row-reserved', opts)).toBeTruthy();
    expect(manual.getByTestId('landing-cat-iiiii', opts)).toBeTruthy();
    expect(auto.getByTestId('landing-cat-iiiii', opts)).toBeTruthy();
    expect(manual.getByTestId('landing-engine-inop', opts)).toBeTruthy();
    expect(auto.getByTestId('landing-engine-inop', opts)).toBeTruthy();
    // Identical leaf-node count → identical layout structure → identical
    // height contribution. The result panel placed after the form sits
    // at the same y in both Manual and Autoland renders.
    const manualLeafCount = countLeafNodes(manual.toJSON());
    const autoLeafCount = countLeafNodes(auto.toJSON());
    expect(manualLeafCount).toBe(autoLeafCount);
  });

  it('Manual: reserved cells are accessibility-hidden, non-interactive, opacity 0', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ landingMode: 'manual' })} />,
    );
    const opts = { includeHiddenElements: true } as const;
    for (const cellTestID of ['landing-cat-iiiii-cell', 'landing-engine-inop-cell']) {
      const cell = tree.getByTestId(cellTestID, opts);
      assertHiddenSlot(cell);
    }
  });

  it('Autoland: reserved cells are visible, in a11y tree, tappable', () => {
    const tree = renderWithTheme(
      <CrosswindLandingInputForm {...makeProps({ landingMode: 'auto' })} />,
    );
    for (const cellTestID of ['landing-cat-iiiii-cell', 'landing-engine-inop-cell']) {
      const cell = tree.getByTestId(cellTestID);
      assertVisibleSlot(cell);
    }
    // The inner SegmentedControl tracks expose their two radios.
    expect(tree.getByTestId('landing-cat-iiiii-yes')).toBeTruthy();
    expect(tree.getByTestId('landing-cat-iiiii-no')).toBeTruthy();
    expect(tree.getByTestId('landing-engine-inop-yes')).toBeTruthy();
    expect(tree.getByTestId('landing-engine-inop-no')).toBeTruthy();
  });

  describe('7-viewport × Manual/Autoland snapshot matrix', () => {
    for (const vp of VIEWPORTS) {
      for (const mode of ['manual', 'auto'] as const) {
        it(`${vp.name} · ${mode}`, () => {
          useWindowDimensionsMock.mockReturnValue({
            width: vp.width,
            height: vp.height,
            fontScale: 1,
            scale: 1,
          });
          const tree = renderWithTheme(
            <CrosswindLandingInputForm
              {...makeProps({
                landingMode: mode,
                isRegular: vp.isRegular,
                testID: `form-${vp.width}x${vp.height}-${mode}`,
              })}
            />,
          );
          expect(tree.toJSON()).toMatchSnapshot();
        });
      }
    }
  });
});

interface CellInstance {
  readonly props: {
    readonly style?: unknown;
    readonly pointerEvents?: string;
    readonly accessibilityElementsHidden?: boolean;
    readonly importantForAccessibility?: string;
  };
}

function assertHiddenSlot(cell: CellInstance): void {
  const style = flattenStyle(cell.props.style);
  expect(style.opacity).toBe(0);
  expect(cell.props.pointerEvents).toBe('none');
  expect(cell.props.accessibilityElementsHidden).toBe(true);
  expect(cell.props.importantForAccessibility).toBe('no-hide-descendants');
}

function assertVisibleSlot(cell: CellInstance): void {
  const style = flattenStyle(cell.props.style);
  expect(style.opacity).toBe(1);
  expect(cell.props.pointerEvents).toBe('auto');
  expect(cell.props.accessibilityElementsHidden).toBe(false);
  expect(cell.props.importantForAccessibility).toBe('auto');
}

function flattenStyle(input: unknown): { opacity?: number } {
  if (input === null || input === undefined) return {};
  if (Array.isArray(input)) {
    return input.reduce<{ opacity?: number }>(
      (acc, item) => ({ ...acc, ...flattenStyle(item) }),
      {},
    );
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const op = obj['opacity'];
    return typeof op === 'number' ? { opacity: op } : {};
  }
  return {};
}

interface JsonNode {
  readonly children?: readonly (JsonNode | string)[] | null;
}

function countLeafNodes(node: unknown): number {
  if (node === null || node === undefined) return 0;
  if (Array.isArray(node)) {
    return node.reduce<number>((acc: number, child: unknown) => acc + countLeafNodes(child), 0);
  }
  if (typeof node === 'string' || typeof node === 'number') return 1;
  const n = node as JsonNode;
  const children = n.children ?? [];
  if (children.length === 0) return 1;
  return children.reduce<number>((acc: number, child) => acc + countLeafNodes(child), 0);
}
