import { Text } from 'react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Screen } from '../Screen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Screen', () => {
  it('renders children inside a safe area in dark theme', () => {
    const tree = renderWithTheme(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders children inside a safe area in light theme', () => {
    const tree = renderWithTheme(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('drops horizontal padding when edgeToEdge is set', () => {
    const tree = renderWithTheme(
      <Screen testID="screen" edgeToEdge>
        <Text>content</Text>
      </Screen>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
