import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import ErrorScreen from '../../app/error';

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

describe('Error route', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders title, description, retry, contact and version (dark)', () => {
    const tree = renderWithTheme(<ErrorScreen />, { mode: 'dark' });
    expect(tree.getByText('error.referenceDataUnavailable')).toBeTruthy();
    expect(tree.getByText('error.referenceDataDescription')).toBeTruthy();
    expect(tree.getByTestId('error-retry')).toBeTruthy();
    expect(tree.getByTestId('error-contact')).toBeTruthy();
    expect(tree.getByTestId('error-version').props.children).toEqual(['v', '0.1.0']);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(<ErrorScreen />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('navigates back to splash on Retry press', () => {
    const { getByTestId } = renderWithTheme(<ErrorScreen />, { mode: 'dark' });
    fireEvent.press(getByTestId('error-retry'));
    expect(mockReplace).toHaveBeenCalledWith('/splash');
  });

  it('opens the system mail composer on Contact support press', () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId } = renderWithTheme(<ErrorScreen />, { mode: 'dark' });
    fireEvent.press(getByTestId('error-contact'));
    expect(openURLSpy).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
    openURLSpy.mockRestore();
  });
});
