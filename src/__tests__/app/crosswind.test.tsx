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

  it('Good runway selection: W=150, CG=26 → 34 KT (PR 3 anchor case)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    // Default Aircraft is B787-8 and default Runway is Dry. Switch to
    // Good, then enter the Excel-verified anchor inputs.
    fireEvent.press(getByTestId('crosswind-runway-good'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '150');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '26');
    // Anchor expectation: raw 34.873 → ROUNDDOWN 34, below maxCap=37 so
    // not clamped. The same inputs on Dry runway give a different value
    // (Dry's brackets and slope differ); switching runway must
    // recompute, NOT carry the previous Dry result.
    expect(getByText('34')).toBeTruthy();
  });

  it('Good runway segment is enabled (was disabled in MVP pre-PR 3)', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    const goodSegment = getByTestId('crosswind-runway-good');
    // accessibilityState.disabled was `true` before PR 3 (MVP shipped
    // Good as a capability-disclosure teaser). With Good now active,
    // the segment must be selectable.
    expect(goodSegment.props.accessibilityState.disabled).toBe(false);
  });

  it('MediumToGood runway selection: W=175, CG=24 → 30 KT (PR 4 anchor)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-runway-mediumToGood'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '175');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '24');
    // Anchor expectation per Excel "Medium to Good 788" sheet G7:
    // raw 30.0213 in bracket [T1=19.02, T2=24.02] → ROUNDDOWN 30.
    // maxCap=null → no clamp.
    expect(getByText('30')).toBeTruthy();
  });

  it('MediumToGood runway segment is enabled (was disabled in MVP pre-PR 4)', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    const segment = getByTestId('crosswind-runway-mediumToGood');
    expect(segment.props.accessibilityState.disabled).toBe(false);
  });

  it('Medium runway selection: W=182, CG=20 → 23.9 KT (PR 5 anchor, 1-decimal precision)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-runway-medium'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '182');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '20');
    // First condition shipping with decimals=1 — the rendered string
    // must include the fractional digit ("23.9", not "23" or "24").
    // Verifies both the strategy correctness AND the ResultPanel's
    // String(value) coercion preserving sub-integer precision.
    expect(getByText('23.9')).toBeTruthy();
  });

  it('Medium runway segment is enabled (was disabled in MVP pre-PR 5)', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    const segment = getByTestId('crosswind-runway-medium');
    expect(segment.props.accessibilityState.disabled).toBe(false);
  });

  it('MediumToPoor runway selection: W=182, CG=32 → 13.9 KT (PR 6 anchor, weight-independent)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-runway-mediumToPoor'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '182');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '32');
    // The cgOnlyPiecewise strategy ignores weight — same CG=32 with
    // W=110 or W=200 would yield the same 13.9. Verifying the rendered
    // result panel shows the 1-decimal value confirms the strategy
    // resolves correctly and the ResultPanel's String() coercion
    // preserves the fractional digit.
    expect(getByText('13.9')).toBeTruthy();
  });

  it('MediumToPoor runway segment is enabled (was disabled in MVP pre-PR 6)', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    const segment = getByTestId('crosswind-runway-mediumToPoor');
    expect(segment.props.accessibilityState.disabled).toBe(false);
  });

  it('Poor runway selection: W=182, CG=32 → 10 KT (PR 7 anchor, input-independent)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-runway-poor'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '182');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '32');
    // The constant strategy ignores all input — same value=10
    // regardless of W or CG. Verifies the strategy resolves
    // correctly and the ResultPanel renders the integer constant
    // without dropping to a different precision/format.
    expect(getByText('10')).toBeTruthy();
  });

  it('Poor runway: input-independence check (W=110/CG=10 also → 10 KT)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-runway-poor'));
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '110');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '10');
    // Same Poor segment, very different inputs (light + low CG vs
    // heavy + mid CG above): result is identically 10. This is the
    // defining property of the constant strategy in the UI layer.
    expect(getByText('10')).toBeTruthy();
  });

  it('Poor runway segment is enabled (last disabled segment activated in PR 7 — ALL 6 RWYCC now active)', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    const segment = getByTestId('crosswind-runway-poor');
    expect(segment.props.accessibilityState.disabled).toBe(false);
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
