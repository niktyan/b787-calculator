import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import MainMenu from '../../app/(main)/menu';

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

describe('Main Menu route', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the header, NavPills, active card and three coming-soon cards (dark)', () => {
    const tree = renderWithTheme(<MainMenu />, { mode: 'dark' });
    expect(tree.getByTestId('main-menu-screen')).toBeTruthy();
    expect(tree.getByTestId('main-menu-logo')).toBeTruthy();
    expect(tree.getByText('B787 Calculator')).toBeTruthy();
    expect(tree.getByTestId('main-menu-tabs')).toBeTruthy();
    expect(tree.getByTestId('main-menu-grid')).toBeTruthy();
    expect(tree.getByTestId('module-card-crosswind-landing')).toBeTruthy();
    expect(tree.getByTestId('module-card-crosswind-takeoff')).toBeTruthy();
    expect(tree.getByTestId('module-card-weight-balance')).toBeTruthy();
    expect(tree.getByTestId('module-card-performance')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(<MainMenu />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('navigates to /crosswind when the active card is tapped', () => {
    const { getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    fireEvent.press(getByTestId('module-card-crosswind-landing'));
    expect(mockPush).toHaveBeenCalledWith('/crosswind');
  });

  it('does NOT navigate when a coming-soon card is tapped — opens the modal instead', () => {
    const { getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    fireEvent.press(getByTestId('module-card-crosswind-takeoff'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(getByTestId('coming-soon-modal-sheet')).toBeTruthy();
  });

  it('navigates to /settings and /about via the NavPills', () => {
    const { getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    fireEvent.press(getByTestId('main-menu-tabs-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    fireEvent.press(getByTestId('main-menu-tabs-about'));
    expect(mockPush).toHaveBeenCalledWith('/about');
  });
});
