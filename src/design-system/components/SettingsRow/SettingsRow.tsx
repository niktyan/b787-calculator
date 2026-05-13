/**
 * Settings-list row variants (см. `02_Specification/06-ui-spec.md`
 * § Экран 5 «Settings-row»). Three shapes share the same surface
 * (bgCard, border, radii.md, padding 10×12 in tokens) but differ in
 * trailing affordance:
 *
 *   - NavigableSettingsRow — opens a sub-screen / bottom-sheet
 *     (label + value + chevron, whole row tappable).
 *   - ToggleSettingsRow    — boolean toggle (label + Toggle).
 *   - DisabledUnitsRow     — MVP unit chooser with two segments,
 *     only the first active, with caption below.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import { Row } from '../Row/Row';
import { Text } from '../Text/Text';
import { Toggle } from '../Toggle/Toggle';

const ROW_BORDER_WIDTH = 1;
const DISABLED_SEGMENT_OPACITY = 0.4;

export interface NavigableSettingsRowProps {
  readonly label: string;
  readonly value: string;
  readonly onPress: () => void;
  readonly testID: string;
}

export function NavigableSettingsRow({
  label,
  value,
  onPress,
  testID,
}: NavigableSettingsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const rowStyle = useRowStyle(palette.bgCard, palette.border);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={rowStyle}
      testID={testID}
    >
      <Text variant="caption" color="textPrimary">
        {label}
      </Text>
      <Row align="center" gap="xs">
        <Text variant="monoSmall" color="textSecondary">
          {value}
        </Text>
        <Text variant="caption" color="textTertiary">
          ›
        </Text>
      </Row>
    </Pressable>
  );
}

export interface ToggleSettingsRowProps {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly testID: string;
}

export function ToggleSettingsRow({
  label,
  value,
  onChange,
  testID,
}: ToggleSettingsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const rowStyle = useRowStyle(palette.bgCard, palette.border);

  return (
    <View style={rowStyle} testID={testID}>
      <Text variant="caption" color="textPrimary">
        {label}
      </Text>
      <Toggle
        value={value}
        onChange={onChange}
        accessibilityLabel={label}
        testID={`${testID}-toggle`}
      />
    </View>
  );
}

export interface DisabledUnitsRowProps {
  readonly label: string;
  readonly activeLabel: string;
  readonly disabledLabel: string;
  readonly caption: string;
  readonly testID: string;
}

interface DisabledUnitsStyles {
  readonly container: ViewStyle;
  readonly activeSegment: ViewStyle;
  readonly disabledSegment: ViewStyle;
  readonly segments: ViewStyle;
}

export function DisabledUnitsRow({
  label,
  activeLabel,
  disabledLabel,
  caption,
  testID,
}: DisabledUnitsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const styles = useDisabledUnitsStyles(palette);

  return (
    <View style={styles.container} testID={testID}>
      <Text variant="caption" color="textPrimary">
        {label}
      </Text>
      <View style={styles.segments}>
        <View style={styles.activeSegment}>
          <Text variant="segmentLabel" color="accentOnAccent">
            {activeLabel}
          </Text>
        </View>
        <View style={styles.disabledSegment}>
          <Text variant="segmentLabel" color="textTertiary">
            {disabledLabel}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall" color="textTertiary" testID={`${testID}-caption`}>
        {caption}
      </Text>
    </View>
  );
}

function useRowStyle(bgCard: string, border: string): ViewStyle {
  return useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: bgCard,
      borderColor: border,
      borderRadius: tokens.radii.md,
      borderWidth: ROW_BORDER_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    }),
    [bgCard, border],
  );
}

function useDisabledUnitsStyles(palette: {
  readonly bgCard: string;
  readonly border: string;
  readonly accent: string;
}): DisabledUnitsStyles {
  return useMemo<DisabledUnitsStyles>(
    () => ({
      container: {
        backgroundColor: palette.bgCard,
        borderColor: palette.border,
        borderRadius: tokens.radii.md,
        borderWidth: ROW_BORDER_WIDTH,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
      },
      activeSegment: {
        alignItems: 'center',
        backgroundColor: palette.accent,
        borderRadius: tokens.radii.sm,
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xs,
      },
      disabledSegment: {
        alignItems: 'center',
        borderRadius: tokens.radii.sm,
        flex: 1,
        justifyContent: 'center',
        opacity: DISABLED_SEGMENT_OPACITY,
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xs,
      },
      segments: {
        flexDirection: 'row',
        gap: tokens.spacing.xs,
        marginTop: tokens.spacing.xs,
      },
    }),
    [palette.accent, palette.bgCard, palette.border],
  );
}
