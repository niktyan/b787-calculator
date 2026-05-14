import { renderWithTheme } from '../../../_testing/renderWithTheme';
import { NavigableSettingsRow, ToggleSettingsRow } from '../SettingsRow';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('NavigableSettingsRow', () => {
  // The chevron is an Ionicons glyph that mounts asynchronously after
  // font load; queryByTestId for the chevron is unreliable on the very
  // first render of the suite. Snapshot match is the authoritative
  // alignment lock — once the snapshot captures the chevron node, any
  // regression in size / spacing / centering surfaces as a snapshot
  // diff.
  describe('chevron alignment', () => {
    it('renders chevron next to a short value', () => {
      const tree = renderWithTheme(
        <NavigableSettingsRow
          label="Theme"
          value="Auto"
          onPress={(): void => undefined}
          testID="row-short"
        />,
      );
      expect(tree.getByTestId('row-short')).toBeTruthy();
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('renders chevron next to a medium value', () => {
      const tree = renderWithTheme(
        <NavigableSettingsRow
          label="Language"
          value="Русский"
          onPress={(): void => undefined}
          testID="row-medium"
        />,
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('renders chevron next to a long value', () => {
      const tree = renderWithTheme(
        <NavigableSettingsRow
          label="Aircraft"
          value="Boeing 787-8 (B787-9 — Phase 2)"
          onPress={(): void => undefined}
          testID="row-long"
        />,
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });

  describe('chevron color', () => {
    it('uses accent palette when valueColor="accent"', () => {
      const dark = renderWithTheme(
        <NavigableSettingsRow
          label="Privacy policy"
          value="View →"
          onPress={(): void => undefined}
          testID="row-accent"
          valueColor="accent"
        />,
        { mode: 'dark' },
      );
      // The chevron Ionicon mounts as a Text node carrying the color prop;
      // the snapshot lock prevents regressions when the chevron tone
      // diverges from the value text.
      expect(dark.toJSON()).toMatchSnapshot();
    });
  });

  describe('iPad regular sizing', () => {
    it('bumps chevron + label sizes when isRegular=true', () => {
      const tree = renderWithTheme(
        <NavigableSettingsRow
          label="Theme"
          value="Auto"
          onPress={(): void => undefined}
          testID="row-regular"
          isRegular
        />,
      );
      expect(tree.toJSON()).toMatchSnapshot();
    });
  });

  describe('accessibility', () => {
    it('exposes role="button" and the row label as accessibilityLabel', () => {
      const { getByTestId } = renderWithTheme(
        <NavigableSettingsRow
          label="Language"
          value="English"
          onPress={(): void => undefined}
          testID="row-language"
        />,
      );
      const node = getByTestId('row-language');
      expect(node.props.accessibilityRole).toBe('button');
      expect(node.props.accessibilityLabel).toBe('Language');
    });
  });
});

describe('ToggleSettingsRow', () => {
  it('forwards the row label to the inner Toggle accessibilityLabel', () => {
    const { getByTestId } = renderWithTheme(
      <ToggleSettingsRow
        label="Crosswind · Takeoff"
        value
        onChange={(): void => undefined}
        testID="row-module"
      />,
    );
    const toggle = getByTestId('row-module-toggle');
    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityLabel).toBe('Crosswind · Takeoff');
    expect(toggle.props.accessibilityState).toEqual({ checked: true, disabled: false });
  });
});
