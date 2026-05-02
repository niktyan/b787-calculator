import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { ErrorState } from '../ErrorState';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('ErrorState', () => {
  it('renders error without retry in dark theme', () => {
    const tree = renderWithTheme(
      <ErrorState
        title="Reference data unavailable"
        description="The application could not load reference data."
        testID="err"
      />,
      { mode: 'dark' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders error with retry button in light theme', () => {
    const tree = renderWithTheme(
      <ErrorState
        title="Reference data unavailable"
        description="The application could not load reference data."
        retryLabel="Retry"
        onRetry={jest.fn()}
        testID="err"
      />,
      { mode: 'light' },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('invokes onRetry when the retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ErrorState
        title="Reference data unavailable"
        description="Try again."
        retryLabel="Retry"
        onRetry={onRetry}
        testID="err"
      />,
    );
    fireEvent.press(getByTestId('err-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
