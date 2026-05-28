import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import { STORAGE_KEYS } from '../../core/storage/keys';
import Disclaimer from '../../app/disclaimer';

const mockReplace = jest.fn();

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

jest.mock('react-i18next', () => {
  const en = require('../../core/i18n/locales/en.json') as Record<string, unknown>;
  const resolve = (key: string): string => {
    const parts = key.split('.');
    let cur: unknown = en;
    for (const p of parts) {
      if (cur !== null && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return key;
      }
    }
    return typeof cur === 'string' ? cur : key;
  };
  return {
    useTranslation: () => ({ t: resolve }),
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

const SPEC_BODY =
  'Advisory only. Calculations provide conservative reference values for ' +
  'Boeing 787 operations. Final operational decisions must always be based ' +
  "on official Boeing FCOM/QRH and your operator's procedures. Not for " +
  'primary navigation or operational use.';

describe('Disclaimer route', () => {
  beforeEach(async () => {
    mockReplace.mockClear();
    await AsyncStorage.clear();
  });

  it('renders the brand block, the amber disclaimer card, and the accept button (dark)', () => {
    const tree = renderWithTheme(<Disclaimer />, { mode: 'dark' });
    expect(tree.getByTestId('disclaimer-screen')).toBeTruthy();
    expect(tree.getByTestId('disclaimer-logo')).toBeTruthy();
    expect(tree.getByText('B7')).toBeTruthy();
    expect(tree.getByText('B787 Tools')).toBeTruthy();
    expect(tree.getByTestId('disclaimer-card')).toBeTruthy();
    // Title carries the ⚠ prefix from the DS component (text-content, not visual);
    // body is the spec text verbatim.
    expect(tree.getByText('⚠  Advisory only')).toBeTruthy();
    expect(tree.getByText(SPEC_BODY)).toBeTruthy();
    expect(tree.getByTestId('disclaimer-accept')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(<Disclaimer />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('persists the accepted flag and navigates to /menu on press', async () => {
    const { getByTestId } = renderWithTheme(<Disclaimer />, { mode: 'dark' });
    fireEvent.press(getByTestId('disclaimer-accept'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/menu');
    });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.disclaimerAccepted)).toBe(JSON.stringify(true));
  });
});
