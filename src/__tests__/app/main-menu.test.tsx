import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import MainMenu from '../../app/(main)/menu';
import { STORAGE_KEYS, storage } from '../../core/storage';

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
  beforeEach(async () => {
    mockPush.mockClear();
    await storage.flushNow();
    await AsyncStorage.clear();
  });

  it('renders the header, NavPills, the landing teaser, and the active takeoff card (dark)', () => {
    const tree = renderWithTheme(<MainMenu />, { mode: 'dark' });
    expect(tree.getByTestId('main-menu-screen')).toBeTruthy();
    expect(tree.getByTestId('main-menu-logo')).toBeTruthy();
    expect(tree.getByText('B787 Calculator')).toBeTruthy();
    expect(tree.getByTestId('main-menu-tabs')).toBeTruthy();
    expect(tree.getByTestId('main-menu-grid')).toBeTruthy();
    // MVP scope: only landing teaser + takeoff active. WB/Performance removed.
    expect(tree.getByTestId('module-card-crosswind-landing')).toBeTruthy();
    expect(tree.getByTestId('module-card-crosswind-takeoff')).toBeTruthy();
    expect(tree.queryByTestId('module-card-weight-balance')).toBeNull();
    expect(tree.queryByTestId('module-card-performance')).toBeNull();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(<MainMenu />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders Crosswind · Landing teaser before Crosswind · Takeoff active in the grid', () => {
    const { getAllByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    const cards = getAllByTestId(/^module-card-/);
    const ids = cards.map((c) => (c.props as { testID: string }).testID);
    expect(ids).toEqual(['module-card-crosswind-landing', 'module-card-crosswind-takeoff']);
  });

  it('navigates to /crosswind when the active card is tapped', () => {
    const { getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    fireEvent.press(getByTestId('module-card-crosswind-takeoff'));
    expect(mockPush).toHaveBeenCalledWith('/crosswind');
  });

  it('does NOT navigate when a coming-soon card is tapped — opens the modal instead', () => {
    const { getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    fireEvent.press(getByTestId('module-card-crosswind-landing'));
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

  it('filters out a module when its visibility flag is false in storage', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.moduleVisibility,
      JSON.stringify({ 'crosswind-landing': false }),
    );
    const { queryByTestId, getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    await waitFor(
      () => {
        expect(queryByTestId('module-card-crosswind-landing')).toBeNull();
      },
      { timeout: 5000 },
    );
    expect(getByTestId('module-card-crosswind-takeoff')).toBeTruthy();
  });

  it('shows the empty state with an Open Settings link when all modules are hidden', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.moduleVisibility,
      JSON.stringify({ 'crosswind-landing': false, 'crosswind-takeoff': false }),
    );
    const { queryByTestId, getByTestId } = renderWithTheme(<MainMenu />, { mode: 'dark' });
    await waitFor(
      () => {
        expect(getByTestId('main-menu-empty')).toBeTruthy();
      },
      { timeout: 5000 },
    );
    expect(queryByTestId('main-menu-grid')).toBeNull();
    fireEvent.press(getByTestId('main-menu-empty-open-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
