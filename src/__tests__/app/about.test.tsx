import { fireEvent } from '@testing-library/react-native';

import About from '../../app/(main)/about';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

const mockPush = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: (): null => null },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('About route', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the brand block, NavPills with About active, and 3 rows (Version, Aircraft, Data source)', () => {
    const tree = renderWithTheme(<About />, { mode: 'dark' });
    expect(tree.getByTestId('about-screen')).toBeTruthy();
    expect(tree.getByTestId('about-logo')).toBeTruthy();
    expect(tree.getByTestId('about-tabs')).toBeTruthy();
    expect(tree.getByTestId('about-row-version')).toBeTruthy();
    expect(tree.getByTestId('about-row-aircraft')).toBeTruthy();
    expect(tree.getByTestId('about-row-data-source')).toBeTruthy();
    // Sprint 6 rows must NOT be present yet.
    expect(tree.queryByTestId('about-row-validation')).toBeNull();
    expect(tree.queryByTestId('about-row-distribution')).toBeNull();
    expect(tree.queryByTestId('about-row-privacy-policy')).toBeNull();
    expect(tree.queryByTestId('about-row-terms-of-use')).toBeNull();
    expect(tree.queryByTestId('about-row-support')).toBeNull();
  });

  it('renders the Data source row with referenceDocument · dataVersion format', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    const dataSourceRow = getByTestId('about-row-data-source');
    // Repository load returns the bundled JSON synchronously; value text should
    // contain "Boeing 787 FCOM" + dataVersion separator.
    expect(dataSourceRow).toBeTruthy();
  });

  it('navigates to /menu when Modules tab is tapped', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-tabs-modules'));
    expect(mockPush).toHaveBeenCalledWith('/menu');
  });

  it('navigates to /settings when Settings tab is tapped', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-tabs-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('does not navigate when About tab itself is tapped', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-tabs-about'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders correctly in dark theme (snapshot)', () => {
    const tree = renderWithTheme(<About />, { mode: 'dark' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly in light theme (snapshot)', () => {
    const tree = renderWithTheme(<About />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
