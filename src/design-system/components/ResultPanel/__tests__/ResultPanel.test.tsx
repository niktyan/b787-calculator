import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { ResultPanel } from '../ResultPanel';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('ResultPanel', () => {
  it('renders empty state', () => {
    const tree = renderWithTheme(
      <ResultPanel
        state={{ kind: 'empty', message: 'Enter weight and CG to see result' }}
        testID="result"
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders idle state with full metadata in dark theme', () => {
    const tree = renderWithTheme(
      <ResultPanel
        state={{
          kind: 'idle',
          label: 'Max crosswind · Takeoff',
          value: '27',
          unit: 'KT',
          footnote: 'Computed for current inputs',
          meta: [
            { label: 'Weight', value: '170 t' },
            { label: 'CG', value: '25.5 %MAC' },
            { label: 'Runway', value: 'Dry' },
            { label: 'RWYCC', value: '6' },
          ],
          sourceChip: 'Reference: 787 FCOM',
        }}
        testID="result"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders idle state in light theme', () => {
    const tree = renderWithTheme(
      <ResultPanel
        state={{
          kind: 'idle',
          label: 'Max crosswind · Takeoff',
          value: '27',
          unit: 'KT',
        }}
      />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders error state', () => {
    const tree = renderWithTheme(
      <ResultPanel
        state={{
          kind: 'error',
          headline: 'Calculation unavailable',
          description: 'Reference data could not be loaded.',
        }}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders out-of-envelope state', () => {
    const tree = renderWithTheme(
      <ResultPanel
        state={{
          kind: 'out-of-envelope',
          message: 'Weight 95 t is below minimum 110 t. Adjust input.',
        }}
      />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
