import { Text } from 'react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Card } from '../Card';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Card', () => {
  it('renders default card in dark theme', () => {
    const tree = renderWithTheme(
      <Card testID="card">
        <Text>card body</Text>
      </Card>,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders default card in light theme', () => {
    const tree = renderWithTheme(
      <Card testID="card">
        <Text>card body</Text>
      </Card>,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders highlighted card with accent border and elevation', () => {
    const tree = renderWithTheme(
      <Card testID="card" highlighted elevation="md" radius="xl" padding="xl">
        <Text>highlighted</Text>
      </Card>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
