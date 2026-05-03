import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../design-system/_testing/renderWithTheme';
import { ComingSoonModal } from '../../app/(main)/_components/ComingSoonModal';
import type { ComingSoonModule } from '../../core/coming-soon-modules';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const SAMPLE_MODULE: ComingSoonModule = {
  id: 'crosswind-takeoff',
  name: 'Crosswind · Takeoff',
  description: 'Same crosswind logic applied to the takeoff phase.',
  icon: 'TO',
  phase: 'Phase 2',
};

describe('ComingSoonModal', () => {
  it('renders the module name, phase, body text and OK button when visible (dark)', () => {
    const tree = renderWithTheme(
      <ComingSoonModal module={SAMPLE_MODULE} onClose={jest.fn()} testID="coming-soon-modal" />,
      { mode: 'dark' },
    );
    expect(tree.getByTestId('coming-soon-modal-sheet')).toBeTruthy();
    expect(tree.getByText('Crosswind · Takeoff')).toBeTruthy();
    expect(tree.getByText('Phase 2')).toBeTruthy();
    expect(tree.getByText('TO')).toBeTruthy();
    expect(tree.getByText('comingSoonModal.body')).toBeTruthy();
    expect(tree.getByTestId('coming-soon-modal-close')).toBeTruthy();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly in light theme', () => {
    const tree = renderWithTheme(
      <ComingSoonModal module={SAMPLE_MODULE} onClose={jest.fn()} testID="coming-soon-modal" />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calls onClose when the OK button is tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ComingSoonModal module={SAMPLE_MODULE} onClose={onClose} testID="coming-soon-modal" />,
      { mode: 'dark' },
    );
    fireEvent.press(getByTestId('coming-soon-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ComingSoonModal module={SAMPLE_MODULE} onClose={onClose} testID="coming-soon-modal" />,
      { mode: 'dark' },
    );
    fireEvent.press(getByTestId('coming-soon-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render the sheet when module is null', () => {
    const { queryByTestId } = renderWithTheme(
      <ComingSoonModal module={null} onClose={jest.fn()} testID="coming-soon-modal" />,
      { mode: 'dark' },
    );
    expect(queryByTestId('coming-soon-modal-sheet')).toBeNull();
  });
});
