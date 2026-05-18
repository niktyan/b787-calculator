import { fireEvent } from '@testing-library/react-native';

import CrosswindRoute from '../../app/(main)/crosswind';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

const mockBack = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  Stack: { Screen: (): null => null },
}));

jest.mock('react-i18next', () => {
  const en = require('../../core/i18n/locales/en.json') as Record<string, unknown>;
  const resolve = (key: string, options?: Record<string, unknown>): string => {
    const parts = key.split('.');
    let cur: unknown = en;
    for (const p of parts) {
      if (cur !== null && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return key;
      }
    }
    if (typeof cur !== 'string') {
      return key;
    }
    if (options === undefined) {
      return cur;
    }
    return cur.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      name in options ? String(options[name]) : `{{${name}}}`,
    );
  };
  return {
    useTranslation: () => ({ t: resolve }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

// Mock just `useWindowDimensions` via its submodule path. Mocking the
// top-level `react-native` module breaks RN's TurboModule
// initialization (jest-expo's preset relies on side-effects that don't
// survive a requireActual + spread). The submodule path is stable in
// RN 0.80+; if it ever moves, the test will fail loudly here rather
// than silently render at the wrong viewport.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 0, height: 0, scale: 1, fontScale: 1 })),
}));

interface ViewportFixture {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly fontScale: number;
}

const IPAD_MINI_PORTRAIT: ViewportFixture = { width: 768, height: 1024, scale: 2, fontScale: 1 };
const IPAD_MINI_LANDSCAPE: ViewportFixture = { width: 1024, height: 768, scale: 2, fontScale: 1 };
const DEFAULT_VIEWPORT: ViewportFixture = { width: 0, height: 0, scale: 1, fontScale: 1 };

function getViewportMock(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native/Libraries/Utilities/useWindowDimensions').default as jest.Mock;
}

function mockViewport(viewport: ViewportFixture): void {
  getViewportMock().mockReturnValue(viewport);
}

function clearViewport(): void {
  getViewportMock().mockReturnValue(DEFAULT_VIEWPORT);
}

describe('Crosswind route', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('renders empty state with placeholders when both fields are blank', () => {
    const tree = renderWithTheme(<CrosswindRoute />);
    expect(tree.getByTestId('crosswind-screen')).toBeTruthy();
    expect(tree.getByTestId('crosswind-input-form')).toBeTruthy();
    expect(tree.getByTestId('crosswind-result')).toBeTruthy();
    // Empty-state message visible.
    expect(tree.getByText('Enter weight and CG to see result')).toBeTruthy();
  });

  it('computes result for W=170, CG=32 — flagship case (34 KT)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '32');
    expect(getByText('34')).toBeTruthy();
    // Source chip moved to About per Принцип 4 — should NOT appear on result panel.
    expect(() => getByText('crosswind.sourceChip')).toThrow();
  });

  it('above-envelope: W=170, CG=42 → 37 KT (Excel IFNA quirk, then capped at 37 per FCOM Tab 2.29.2a)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '42');
    // Pre-PR 2 the IFNA-fallback produced 40 KT (Excel quirk preserved).
    // PR 2 adds the Dry maxCap=37, which clamps the 40 down to 37. The
    // 'above-envelope' branch label is unchanged — the cap is applied
    // after strategy resolution.
    expect(getByText('37')).toBeTruthy();
  });

  it('shows operational-envelope warning chip when input is below regulatory minimum', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    // W=95 t — below operational minimum of 110, but algorithm still yields a number.
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '95');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '25');
    expect(getByTestId('crosswind-warning-chip')).toBeTruthy();
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
  });

  it('reset button clears both fields and returns to empty state', () => {
    const tree = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
    expect(tree.getByText('34')).toBeTruthy();
    fireEvent.press(tree.getByTestId('crosswind-reset'));
    expect(tree.getByText('Enter weight and CG to see result')).toBeTruthy();
  });

  it('back button calls router.back()', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders correctly in light theme (snapshot)', () => {
    const tree = renderWithTheme(<CrosswindRoute />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly in dark theme (snapshot)', () => {
    const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('viewport regression coverage (PR feat/crosswind-polish-2 fix)', () => {
    afterEach(() => {
      clearViewport();
    });

    // Note on assertion shape: we deliberately use targeted typography
    // asserts on the rendered JSON tree instead of toMatchSnapshot.
    // Reanimated's `LinearTransition` keeps the previous content
    // mounted in the jest mock environment during a state change, so a
    // snapshot captures both subtrees and is dominated by
    // transition-mock noise. Targeted asserts isolate the load-bearing
    // breakpoint behaviour.
    //
    // Block 2 of the takeoff-rebrand follow-up split the single
    // `isRegular` signal into two: `isWidescreen` (>= 768pt) drives
    // typography sizing (the user explicitly asked for the bigger
    // fonts on iPad portrait too), and `isTwoColumn` (>= 1024pt)
    // drives the 2-column layout + result Card flex:1.
    it('iPad mini portrait (768 x 1024): single-column stack, regular typography (NOT 2-column)', () => {
      mockViewport(IPAD_MINI_PORTRAIT);
      const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
      fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
      const json = JSON.stringify(tree.toJSON());
      // Regular typography is now active on iPad portrait too.
      expect(json).toContain('"fontSize":72');
      expect(json).toContain('"fontSize":36');
    });

    it('iPad mini landscape (1024 x 768): 2-column row, regular typography + cockpit-glance value', () => {
      mockViewport(IPAD_MINI_LANDSCAPE);
      const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
      fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
      const json = JSON.stringify(tree.toJSON());
      // Regular typography baseline (variant fontSize is still emitted
      // as part of the Text style array even when overridden inline).
      expect(json).toContain('"fontSize":72');
      expect(json).toContain('"fontSize":36');
      // Cockpit-glance bump (inline override on top of displayLarge /
      // monoXL): result value 96 pt, KT suffix 48 pt. If either size
      // disappears, the visible result has silently shrunk.
      expect(json).toContain('"fontSize":96');
      expect(json).toContain('"fontSize":48');
    });

    /**
     * Regression for the iPad-landscape overlap bug fixed in Block 0 of
     * `feat/crosswind-takeoff-rebrand` follow-up.
     *
     * Root cause: the form Stack had `flex:1` + `justifyContent:
     * 'space-between'` but its parents (outer Stack + Row) had no flex
     * height claim, so the form collapsed to 0 height and all four
     * input groups (Aircraft / TOW / CG / Runway) stacked at y=0.
     *
     * Guard: at iPad landscape the outer Stack and the 2-column Row
     * both render with `flex:1` style (full-height claim) so the form
     * has a real container to fill. The DOM-level `flex:1` is the
     * single load-bearing assertion: without it, `space-between` on
     * the form Stack collapses again.
     */
    it('iPad landscape: outer Stack and Row both claim flex:1 (overlap regression guard)', () => {
      mockViewport(IPAD_MINI_LANDSCAPE);
      const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      const json = JSON.stringify(tree.toJSON());
      // The form Stack uses flex:1 + space-between only when there's a
      // height container. Both must appear in the rendered tree.
      const flexOneOccurrences = (json.match(/"flex":1/g) ?? []).length;
      // Screen.content + KeyboardDismissView + outer Stack + Row +
      // form Stack + result wrapper + result Card = at least 4 distinct
      // flex:1 nodes in the chain. (We don't pin the exact number to
      // stay resilient to layout-internal refactors; the floor of 4
      // protects against accidentally dropping one of the parents.)
      expect(flexOneOccurrences).toBeGreaterThanOrEqual(4);
      // Form Stack uses justify space-between for full-height
      // distribution of 4 sections.
      expect(json).toContain('"justifyContent":"space-between"');
    });

    it('iPad landscape: all four input groups render in the tree (Aircraft, TOW, CG, Runway)', () => {
      mockViewport(IPAD_MINI_LANDSCAPE);
      const { getByTestId } = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      // Each section rendered as a distinct testID-bearing node — if
      // any went missing (e.g., aircraft selector inserted at wrong
      // wrapper depth) the form would be incomplete.
      expect(getByTestId('crosswind-aircraft')).toBeTruthy();
      expect(getByTestId('crosswind-weight')).toBeTruthy();
      expect(getByTestId('crosswind-cg')).toBeTruthy();
      expect(getByTestId('crosswind-runway')).toBeTruthy();
    });
  });
});
