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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

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
    expect(tree.getByText('crosswind.resultEmpty')).toBeTruthy();
  });

  it('computes result for W=170, CG=32 — flagship case (34 KT)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '32');
    expect(getByText('34')).toBeTruthy();
    // Source chip moved to About per Принцип 4 — should NOT appear on result panel.
    expect(() => getByText('crosswind.sourceChip')).toThrow();
  });

  it('above-envelope: W=170, CG=42 → 40 KT (Excel quirk)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '42');
    expect(getByText('40')).toBeTruthy();
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
    expect(tree.getByText('crosswind.resultEmpty')).toBeTruthy();
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
    // Reanimated's `LinearTransition` (added in commit e434a1b for the
    // empty↔idle transition) keeps the previous content mounted in the
    // jest mock environment during a state change, so a snapshot
    // captures both the empty and the idle subtrees and is dominated
    // by transition-mock noise. The compact-vs-regular result-panel
    // choice is still cleanly observable via the result-value
    // typography (48 pt / 24 pt vs 72 pt / 36 pt), which is what the
    // user reported as broken on iPad portrait.
    it('iPad mini portrait (768 x 1024): single-column stack, compact result panel (NOT regular)', () => {
      mockViewport(IPAD_MINI_PORTRAIT);
      const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
      fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
      const json = JSON.stringify(tree.toJSON());
      // Regression guard: NO iPad-regular typography on iPad portrait.
      expect(json).not.toContain('"fontSize":72');
      expect(json).not.toContain('"fontSize":36');
      // Compact path uses `display` (48 pt). Asserting it appears
      // confirms idle state rendered with the compact ResultPanel.
      expect(json).toContain('"fontSize":48');
    });

    it('iPad mini landscape (1024 x 768): 2-column row, regular result panel (72 pt typography)', () => {
      mockViewport(IPAD_MINI_LANDSCAPE);
      const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' });
      fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
      fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
      const json = JSON.stringify(tree.toJSON());
      // Regression guard: iPad-regular typography MUST appear in
      // landscape so the user-visible scale-up isn't silently lost.
      expect(json).toContain('"fontSize":72');
      expect(json).toContain('"fontSize":36');
    });
  });
});
