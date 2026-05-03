import { fireEvent } from '@testing-library/react-native';

import CrosswindRoute from '../../app/(main)/crosswind';
import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';

const mockBack = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  Stack: { Screen: (): null => null },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

describe('Crosswind route', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('renders empty state with placeholders when both fields are blank', () => {
    const tree = renderWithTheme(<CrosswindRoute />);
    expect(tree.getByTestId('crosswind-screen')).toBeTruthy();
    expect(tree.getByTestId('crosswind-input-form')).toBeTruthy();
    expect(tree.getByTestId('crosswind-result')).toBeTruthy();
    // Empty-state message visible.
    expect(tree.getByText('crosswind.resultEmpty')).toBeTruthy();
  });

  it('computes result for W=170, CG=32 — flagship case (34 KT)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '32');
    expect(getByText('34')).toBeTruthy();
    expect(getByText('crosswind.sourceChip')).toBeTruthy();
  });

  it('above-envelope: W=170, CG=42 → 40 KT (Excel quirk)', () => {
    const { getByTestId, getByText } = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '42');
    expect(getByText('40')).toBeTruthy();
  });

  it('shows operational-envelope warning chip when input is below regulatory minimum', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    // W=95 t — below operational minimum of 110, but algorithm still yields a number.
    fireEvent.changeText(getByTestId('crosswind-weight-input'), '95');
    fireEvent.changeText(getByTestId('crosswind-cg-input'), '25');
    expect(getByTestId('crosswind-warning-chip')).toBeTruthy();
    expect(getByTestId('crosswind-weight-error')).toBeTruthy();
  });

  it('reset button clears both fields and returns to empty state', () => {
    const tree = renderWithTheme(<CrosswindRoute />);
    fireEvent.changeText(tree.getByTestId('crosswind-weight-input'), '170');
    fireEvent.changeText(tree.getByTestId('crosswind-cg-input'), '32');
    expect(tree.getByText('34')).toBeTruthy();
    fireEvent.press(tree.getByTestId('crosswind-reset'));
    expect(tree.getByText('crosswind.resultEmpty')).toBeTruthy();
  });

  it('back button calls router.back()', () => {
    const { getByTestId } = renderWithTheme(<CrosswindRoute />);
    fireEvent.press(getByTestId('crosswind-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders correctly in light theme (snapshot)', () => {
    const tree = renderWithTheme(<CrosswindRoute />, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly in dark theme (snapshot)', () => {
    const tree = renderWithTheme(<CrosswindRoute />, { mode: 'dark' }).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
