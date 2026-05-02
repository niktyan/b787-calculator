import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { EmptyState } from '../EmptyState';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('EmptyState', () => {
  it('renders title and description in dark theme', () => {
    const tree = renderWithTheme(
      <EmptyState
        title="No results yet"
        description="Enter weight and CG to see the calculation."
        testID="empty"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders title only in light theme', () => {
    const tree = renderWithTheme(<EmptyState title="Nothing here" />, {
      mode: 'light',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
