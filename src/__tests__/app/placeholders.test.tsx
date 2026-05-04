import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import AboutPlaceholder from '../../app/(main)/about';
import SettingsPlaceholder from '../../app/(main)/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('placeholder screens', () => {
  // Crosswind is no longer a placeholder — see src/__tests__/app/crosswind.test.tsx.

  it('renders Settings placeholder (dark + light)', () => {
    const dark = renderWithTheme(<SettingsPlaceholder />, { mode: 'dark' });
    expect(dark.getByTestId('settings-screen')).toBeTruthy();
    expect(dark.getByText('placeholder.settingsBody')).toBeTruthy();
    expect(dark.toJSON()).toMatchSnapshot();
    const light = renderWithTheme(<SettingsPlaceholder />, { mode: 'light' }).toJSON();
    expect(light).toMatchSnapshot();
  });

  it('renders About placeholder (dark + light)', () => {
    const dark = renderWithTheme(<AboutPlaceholder />, { mode: 'dark' });
    expect(dark.getByTestId('about-screen')).toBeTruthy();
    expect(dark.getByText('placeholder.aboutBody')).toBeTruthy();
    expect(dark.toJSON()).toMatchSnapshot();
    const light = renderWithTheme(<AboutPlaceholder />, { mode: 'light' }).toJSON();
    expect(light).toMatchSnapshot();
  });
});
