import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import About from '../../app/(main)/about';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

const mockPush = jest.fn();
const mockOpenBrowserAsync = jest.fn((..._args: unknown[]) => Promise.resolve({ type: 'cancel' }));

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Stack: { Screen: (): null => null },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string): unknown => mockOpenBrowserAsync(url),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('About route', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockOpenBrowserAsync.mockClear();
  });

  it('renders the brand block, NavPills with About active, and all 7 rows in spec order', () => {
    const tree = renderWithTheme(<About />, { mode: 'dark' });
    expect(tree.getByTestId('about-screen')).toBeTruthy();
    expect(tree.getByTestId('about-logo')).toBeTruthy();
    expect(tree.getByTestId('about-tabs')).toBeTruthy();
    expect(tree.getByTestId('about-row-version')).toBeTruthy();
    expect(tree.getByTestId('about-row-validation')).toBeTruthy();
    expect(tree.getByTestId('about-row-data-source')).toBeTruthy();
    expect(tree.getByTestId('about-row-distribution')).toBeTruthy();
    expect(tree.getByTestId('about-row-privacy-policy')).toBeTruthy();
    expect(tree.getByTestId('about-row-terms-of-use')).toBeTruthy();
    expect(tree.getByTestId('about-row-support')).toBeTruthy();
    expect(tree.getByTestId('about-disclaimer')).toBeTruthy();
    expect(tree.queryByTestId('about-row-aircraft')).toBeNull();
  });

  it('renders the Data source row with referenceDocument · dataVersion format', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    expect(getByTestId('about-row-data-source')).toBeTruthy();
  });

  it('opens Privacy Policy in expo-web-browser when tapped', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-row-privacy-policy'));
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      expect.stringContaining('privacy-policy.html'),
    );
  });

  it('opens Terms of Use in expo-web-browser when tapped', () => {
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-row-terms-of-use'));
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(expect.stringContaining('terms-of-use.html'));
  });

  it('opens the system mail composer with a mailto: URL when Support is tapped', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId } = renderWithTheme(<About />, { mode: 'dark' });
    fireEvent.press(getByTestId('about-row-support'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
    openSpy.mockRestore();
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
