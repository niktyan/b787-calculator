import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import Splash from '../../app/splash';

const mockReplace = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Stack: { Screen: (): null => null },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '0.1.0',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Hold the disclaimer hook in 'unknown' for these snapshots so the splash sits
// in its initial loading state instead of racing the storage-read effect.
jest.mock('../../core/disclaimer', () => ({
  useDisclaimerStatus: (): { status: string; accept: jest.Mock } => ({
    status: 'unknown',
    accept: jest.fn(),
  }),
  acceptDisclaimer: jest.fn().mockResolvedValue(undefined),
  readDisclaimerStatus: jest.fn().mockResolvedValue('pending'),
}));

describe('Splash route', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders the brand placeholder, app name, version and tagline (dark)', () => {
    const tree = renderWithTheme(<Splash />, { mode: 'dark' });
    expect(tree.getByTestId('splash-screen')).toBeTruthy();
    expect(tree.getByTestId('splash-logo')).toBeTruthy();
    expect(tree.getByText('B7')).toBeTruthy();
    expect(tree.getByText('B787 Calculator')).toBeTruthy();
    expect(tree.getByText('splash.tagline')).toBeTruthy();
    expect(tree.getByTestId('splash-version').props.children).toEqual(['v', '0.1.0']);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(<Splash />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('does not navigate before the minimum splash time has elapsed', () => {
    renderWithTheme(<Splash />, { mode: 'dark' });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
