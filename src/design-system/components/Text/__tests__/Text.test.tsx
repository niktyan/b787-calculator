import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Text } from '../Text';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Text', () => {
  it('renders body text by default in dark theme', () => {
    const tree = renderWithTheme(<Text>hello</Text>, { mode: 'dark' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders body text by default in light theme', () => {
    const tree = renderWithTheme(<Text>hello</Text>, { mode: 'light' }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('applies display variant with custom color and alignment', () => {
    const tree = renderWithTheme(
      <Text variant="display" color="accent" align="center" allowFontScaling={false}>
        56
      </Text>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders heading1, heading2, caption, label, and mono variants', () => {
    const tree = renderWithTheme(
      <>
        <Text variant="heading1">heading 1</Text>
        <Text variant="heading2">heading 2</Text>
        <Text variant="caption" color="textSecondary">
          caption
        </Text>
        <Text variant="label" color="textTertiary">
          label
        </Text>
        <Text variant="mono">mono</Text>
      </>,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
