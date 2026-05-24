import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { renderWithTheme } from '../../../../design-system/_testing/renderWithTheme';
import { saveRecent } from '../../../../core/recent-storage';
import { RecentCalculationsScreen } from '../RecentCalculationsScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
    useFocusEffect: (cb: () => void | (() => void)): void => {
      useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('RecentCalculationsScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    await AsyncStorage.clear();
  });

  it('renders the empty state when no entries are saved', () => {
    const tree = renderWithTheme(<RecentCalculationsScreen />, { mode: 'dark' });
    expect(tree.getByTestId('recent-empty')).toBeTruthy();
    expect(tree.queryByTestId('recent-list')).toBeNull();
  });

  it('renders the entry list when storage has entries', async () => {
    const saved = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });
    const { getByTestId, queryByTestId } = renderWithTheme(<RecentCalculationsScreen />);
    await waitFor(() => {
      expect(queryByTestId('recent-empty')).toBeNull();
    });
    expect(getByTestId('recent-list')).toBeTruthy();
    expect(getByTestId(`recent-item-${saved.id}`)).toBeTruthy();
  });

  it('navigates to /crosswind with the entry id when a takeoff row is tapped', async () => {
    const saved = await saveRecent({
      module: 'takeoff',
      inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
      result: 34,
    });
    const { getByTestId } = renderWithTheme(<RecentCalculationsScreen />);
    await waitFor(() => getByTestId(`recent-item-${saved.id}`));
    fireEvent.press(getByTestId(`recent-item-${saved.id}`));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/crosswind',
      params: { recentEntryId: saved.id },
    });
  });

  it('navigates to /crosswind-landing with the entry id when a landing row is tapped', async () => {
    const saved = await saveRecent({
      module: 'landing',
      inputs: {
        aircraft: 'b787_8',
        runwayCondition: 'dry',
        landingMode: 'manual',
        asymReverse: 'no',
        catIIIII: 'no',
        engineInop: 'no',
      },
      result: 30,
    });
    const { getByTestId } = renderWithTheme(<RecentCalculationsScreen />);
    await waitFor(() => getByTestId(`recent-item-${saved.id}`));
    fireEvent.press(getByTestId(`recent-item-${saved.id}`));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/crosswind-landing',
      params: { recentEntryId: saved.id },
    });
  });

  it('calls router.back when the Back pill is pressed', () => {
    const { getByTestId } = renderWithTheme(<RecentCalculationsScreen />);
    fireEvent.press(getByTestId('recent-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('Clear All pill is disabled when there are no entries', () => {
    const { getByTestId } = renderWithTheme(<RecentCalculationsScreen />);
    const pill = getByTestId('recent-clear-all');
    expect(
      (pill.props as { accessibilityState: { disabled: boolean } }).accessibilityState.disabled,
    ).toBe(true);
  });

  it('renders an empty-state snapshot (dark)', () => {
    const tree = renderWithTheme(<RecentCalculationsScreen />, { mode: 'dark' });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
