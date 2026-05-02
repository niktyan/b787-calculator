import { Text, View } from 'react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Row } from '../Row';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Row', () => {
  it('renders children inline with default props', () => {
    const tree = renderWithTheme(
      <Row testID="row">
        <View>
          <Text>A</Text>
        </View>
        <View>
          <Text>B</Text>
        </View>
      </Row>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('honours wrap, gap, align and justify overrides', () => {
    const tree = renderWithTheme(
      <Row testID="row" gap="lg" align="flex-end" justify="space-between" wrap>
        <View>
          <Text>A</Text>
        </View>
        <View>
          <Text>B</Text>
        </View>
      </Row>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
