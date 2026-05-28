import { act } from '@testing-library/react-native';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import Splash from '../../app/index';

const mockReplace = jest.fn();
const mockUseDisclaimerStatus = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Stack: { Screen: (): null => null },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.1.0',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Drive the disclaimer status from the test so we can simulate every
// initial state without exercising the AsyncStorage round-trip.
jest.mock('../../core/disclaimer', () => ({
  useDisclaimerStatus: (): { status: string; accept: jest.Mock } =>
    mockUseDisclaimerStatus() as { status: string; accept: jest.Mock },
  acceptDisclaimer: jest.fn().mockResolvedValue(undefined),
  readDisclaimerStatus: jest.fn().mockResolvedValue('pending'),
}));

const SPLASH_MIN_MS = 800;

describe('Splash route (mounted at /)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseDisclaimerStatus.mockReturnValue({ status: 'unknown', accept: jest.fn() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the brand placeholder, app name, version and tagline (dark)', () => {
    const tree = renderWithTheme(<Splash />, { mode: 'dark' });
    expect(tree.getByTestId('splash-screen')).toBeTruthy();
    expect(tree.getByTestId('splash-logo')).toBeTruthy();
    expect(tree.getByText('B7')).toBeTruthy();
    expect(tree.getByText('B787 Tools')).toBeTruthy();
    expect(tree.getByText('splash.tagline')).toBeTruthy();
    expect(tree.getByTestId('splash-version').props.children).toEqual(['v', '1.1.0']);
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

  // Regression test for the bug where Splash mounted at /splash never ran on
  // cold start because the URL `/` resolved to (main)/index.tsx (Main Menu)
  // directly. With Splash now at `/`, a fresh install with no
  // `disclaimerAccepted` flag in storage must route to /disclaimer, not /menu.
  it('routes to /disclaimer on fresh install (no acceptance flag)', () => {
    jest.useFakeTimers();
    // Storage with no value resolves to status='pending' via readDisclaimerStatus.
    mockUseDisclaimerStatus.mockReturnValue({ status: 'pending', accept: jest.fn() });

    renderWithTheme(<Splash />, { mode: 'dark' });
    act(() => {
      jest.advanceTimersByTime(SPLASH_MIN_MS);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/disclaimer');
    expect(mockReplace).not.toHaveBeenCalledWith('/menu');
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });
});
