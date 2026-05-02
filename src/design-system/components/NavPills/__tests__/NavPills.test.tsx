import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { NavPills } from '../NavPills';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type NavId = 'modules' | 'settings' | 'about';

const items = [
  { id: 'modules' as const, label: 'Modules' },
  { id: 'settings' as const, label: 'Settings' },
  { id: 'about' as const, label: 'About' },
];

describe('NavPills', () => {
  it('highlights the active pill in dark theme', () => {
    const tree = renderWithTheme(
      <NavPills<NavId> items={items} activeId="modules" onChange={jest.fn()} testID="nav" />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders in light theme', () => {
    const tree = renderWithTheme(
      <NavPills<NavId> items={items} activeId="settings" onChange={jest.fn()} testID="nav" />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('emits the new id when a pill is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <NavPills<NavId> items={items} activeId="modules" onChange={onChange} testID="nav" />,
    );
    fireEvent.press(getByTestId('nav-about'));
    expect(onChange).toHaveBeenCalledWith('about');
  });
});
