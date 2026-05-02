import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { Disclaimer } from '../Disclaimer';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TITLE = 'Advisory only';
const BODY =
  'Calculations provide conservative reference values for Boeing 787 operations. Final operational decisions must always be based on official Boeing FCOM/QRH and your operator procedures.';

describe('Disclaimer', () => {
  it('renders title and body in dark theme', () => {
    const tree = renderWithTheme(<Disclaimer title={TITLE} body={BODY} />, {
      mode: 'dark',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders title and body in light theme', () => {
    const tree = renderWithTheme(<Disclaimer title={TITLE} body={BODY} />, {
      mode: 'light',
    }).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
