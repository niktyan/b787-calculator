import { Text, View } from 'react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Stack } from '../Stack';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Stack', () => {
  it('renders children with default gap', () => {
    const tree = renderWithTheme(
      <Stack testID="stack">
        <View testID="child-a">
          <Text>A</Text>
        </View>
        <View testID="child-b">
          <Text>B</Text>
        </View>
      </Stack>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('respects custom gap, align and justify', () => {
    const tree = renderWithTheme(
      <Stack testID="stack" gap="xl" align="center" justify="space-between">
        <View>
          <Text>A</Text>
        </View>
        <View>
          <Text>B</Text>
        </View>
      </Stack>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
