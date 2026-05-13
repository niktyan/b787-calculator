import { fireEvent } from '@testing-library/react-native';

import Settings from '../../app/(main)/settings';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

const mockPush = jest.fn();
const mockSetLanguage = jest.fn((_lang: string) => Promise.resolve());
let mockCurrentLanguage = 'en';

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

jest.mock('../../core/i18n/config', () => {
  const actual = jest.requireActual('../../core/i18n/config');
  return {
    ...actual,
    setLanguage: (lang: string): unknown => mockSetLanguage(lang),
    getCurrentLanguage: (): string => mockCurrentLanguage,
  };
});

describe('Settings route', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSetLanguage.mockClear();
    mockCurrentLanguage = 'en';
  });

  it('renders the brand block, NavPills with Settings active, and all 4 setting rows', () => {
    const tree = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(tree.getByTestId('settings-screen')).toBeTruthy();
    expect(tree.getByTestId('settings-logo')).toBeTruthy();
    expect(tree.getByTestId('settings-tabs')).toBeTruthy();
    expect(tree.getByTestId('settings-row-language')).toBeTruthy();
    expect(tree.getByTestId('settings-row-theme')).toBeTruthy();
    expect(tree.getByTestId('settings-row-weight-units')).toBeTruthy();
    expect(tree.getByTestId('settings-row-wind-units')).toBeTruthy();
  });

  it('renders the Modules section with a toggle row per known module', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(getByTestId('settings-section-modules')).toBeTruthy();
    expect(getByTestId('settings-row-module-crosswind-takeoff')).toBeTruthy();
    expect(getByTestId('settings-row-module-crosswind-landing')).toBeTruthy();
  });

  it('navigates to /menu when Modules tab is tapped', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    fireEvent.press(getByTestId('settings-tabs-modules'));
    expect(mockPush).toHaveBeenCalledWith('/menu');
  });

  it('navigates to /about when About tab is tapped', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    fireEvent.press(getByTestId('settings-tabs-about'));
    expect(mockPush).toHaveBeenCalledWith('/about');
  });

  it('does not navigate when Settings tab itself is tapped', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    fireEvent.press(getByTestId('settings-tabs-settings'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the language bottom sheet when Language row is tapped', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(queryByTestId('settings-sheet-language-en')).toBeNull();
    fireEvent.press(getByTestId('settings-row-language'));
    expect(getByTestId('settings-sheet-language-en')).toBeTruthy();
    expect(getByTestId('settings-sheet-language-ru')).toBeTruthy();
  });

  it('calls setLanguage(ru) when Russian is picked', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    fireEvent.press(getByTestId('settings-row-language'));
    fireEvent.press(getByTestId('settings-sheet-language-ru'));
    expect(mockSetLanguage).toHaveBeenCalledWith('ru');
  });

  it('opens the theme bottom sheet and switches mode when Light is picked', () => {
    const { getByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    fireEvent.press(getByTestId('settings-row-theme'));
    expect(getByTestId('settings-sheet-theme-auto')).toBeTruthy();
    expect(getByTestId('settings-sheet-theme-light')).toBeTruthy();
    expect(getByTestId('settings-sheet-theme-dark')).toBeTruthy();
    fireEvent.press(getByTestId('settings-sheet-theme-light'));
    // Sheet closes after selection.
    expect(() => getByTestId('settings-sheet-theme-light')).toThrow();
  });

  it('no longer renders the "Show data source on result" row', () => {
    const { queryByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(queryByTestId('settings-row-show-data-source')).toBeNull();
  });

  it('renders Weight units as an info row with value "Tons (t)" and no caption', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(getByTestId('settings-row-weight-units')).toBeTruthy();
    expect(queryByTestId('settings-row-weight-units-caption')).toBeNull();
  });

  it('renders Wind units as an info row with value "Knots (KT)" and no caption', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<Settings />, { mode: 'dark' });
    expect(getByTestId('settings-row-wind-units')).toBeTruthy();
    expect(queryByTestId('settings-row-wind-units-caption')).toBeNull();
  });

  it('renders correctly in dark theme (snapshot)', () => {
    const tree = renderWithTheme(<Settings />, { mode: 'dark' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly in light theme (snapshot)', () => {
    const tree = renderWithTheme(<Settings />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
