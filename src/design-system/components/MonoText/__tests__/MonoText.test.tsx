import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { MonoText } from '../MonoText';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('MonoText', () => {
  it('renders numeric content with the mono typography variant', () => {
    const tree = renderWithTheme(<MonoText>170.5</MonoText>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('inherits color overrides from props', () => {
    const tree = renderWithTheme(<MonoText color="accent">42</MonoText>).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
