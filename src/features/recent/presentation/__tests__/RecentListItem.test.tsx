import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../design-system/_testing/renderWithTheme';
import type { RecentLandingEntry, RecentTakeoffEntry } from '../../../../core/recent-storage';
import { RecentListItem } from '../components/RecentListItem';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

const FIXED_TIMESTAMP = new Date('2026-05-23T12:00:00Z').toISOString();

function takeoffEntry(): RecentTakeoffEntry {
  return {
    id: 't-1',
    timestamp: FIXED_TIMESTAMP,
    module: 'takeoff',
    inputs: { aircraft: 'b787_8', weightTons: 170, cgPercent: 32, runwayCondition: 'dry' },
    result: 34,
    fingerprint: 'fp',
  };
}

function landingEntryManual(): RecentLandingEntry {
  return {
    id: 'l-1',
    timestamp: FIXED_TIMESTAMP,
    module: 'landing',
    inputs: {
      aircraft: 'b787_8',
      runwayCondition: 'dry',
      landingMode: 'manual',
      asymReverse: 'yes',
      catIIIII: 'yes',
      engineInop: 'yes',
    },
    result: 30,
    fingerprint: 'fp',
  };
}

function landingEntryAuto(): RecentLandingEntry {
  return {
    ...landingEntryManual(),
    id: 'l-2',
    inputs: { ...landingEntryManual().inputs, landingMode: 'auto' },
  };
}

describe('RecentListItem', () => {
  it('renders a takeoff row with aircraft, weight, CG, runway and result (dark)', () => {
    const tree = renderWithTheme(
      <RecentListItem entry={takeoffEntry()} onPress={jest.fn()} testID="row" />,
      { mode: 'dark' },
    );
    const root = tree.getByTestId('row');
    const accessibilityLabel = (root.props as { accessibilityLabel: string }).accessibilityLabel;
    expect(accessibilityLabel).toContain('B787-8');
    expect(accessibilityLabel).toContain('170 t');
    expect(accessibilityLabel).toContain('32 %MAC');
    expect(accessibilityLabel).toContain('Dry');
    expect(accessibilityLabel).toContain('34 KT');
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders a manual-landing row WITHOUT CAT II-III and ENG INOP', () => {
    const tree = renderWithTheme(
      <RecentListItem entry={landingEntryManual()} onPress={jest.fn()} testID="row" />,
    );
    const root = tree.getByTestId('row');
    const accessibilityLabel = (root.props as { accessibilityLabel: string }).accessibilityLabel;
    expect(accessibilityLabel).toContain('Manual');
    expect(accessibilityLabel).toContain('Asym');
    expect(accessibilityLabel).not.toContain('CAT II-III');
    expect(accessibilityLabel).not.toContain('ENG INOP');
  });

  it('renders an autoland row WITH CAT II-III and ENG INOP', () => {
    const tree = renderWithTheme(
      <RecentListItem entry={landingEntryAuto()} onPress={jest.fn()} testID="row" />,
    );
    const root = tree.getByTestId('row');
    const accessibilityLabel = (root.props as { accessibilityLabel: string }).accessibilityLabel;
    expect(accessibilityLabel).toContain('Autoland');
    expect(accessibilityLabel).toContain('CAT II-III');
    expect(accessibilityLabel).toContain('ENG INOP');
  });

  it('fires onPress with the entry when tapped', () => {
    const onPress = jest.fn();
    const entry = takeoffEntry();
    const { getByTestId } = renderWithTheme(
      <RecentListItem entry={entry} onPress={onPress} testID="row" />,
    );
    fireEvent.press(getByTestId('row'));
    expect(onPress).toHaveBeenCalledWith(entry);
  });
});
