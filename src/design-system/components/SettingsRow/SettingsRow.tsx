/**
 * Settings-list row variants (см. `02_Specification/06-ui-spec.md`
 * § Экран 5 «Settings-row»). Shapes share the same surface (bgCard,
 * border, radii.md) but differ in trailing affordance:
 *
 *   - NavigableSettingsRow — opens a sub-screen / bottom-sheet
 *     (label + value + chevron, whole row tappable).
 *   - ToggleSettingsRow    — boolean toggle (label + Toggle).
 *   - DisabledUnitsRow     — MVP unit chooser with two segments,
 *     only the first active, with caption below. Retired in Sprint 6
 *     follow-up Block 2 in favour of `InfoSettingsRow`; kept exported
 *     for one commit while consumers migrate.
 *   - InfoSettingsRow      — read-only label/value pair (no chevron,
 *     no Pressable). Used for MVP-permanent unit rows.
 *
 * All variants accept `isRegular` and switch between two sizing
 * bundles in `tokens.sizing.settingsRow.{compact, regular}` so a
 * single bool propagated from the screen scales the whole list on
 * iPad regular for cockpit-glance readability.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import { Row } from '../Row/Row';
import { Text } from '../Text/Text';
import { Toggle } from '../Toggle/Toggle';

const ROW_BORDER_WIDTH = 1;
const DISABLED_SEGMENT_OPACITY = 0.4;

export interface SettingsRowSizingProp {
  /** When true, use iPad-regular sizing (bigger minHeight / fonts). */
  readonly isRegular?: boolean;
}

interface RowSizing {
  readonly minHeight: number;
  readonly paddingV: number;
  readonly paddingH: number;
  readonly labelSize: number;
  readonly labelWeight: TextStyle['fontWeight'];
  readonly valueSize: number;
  readonly chevronSize: number;
}

function pickRowSizing(isRegular: boolean): RowSizing {
  return isRegular ? tokens.sizing.settingsRow.regular : tokens.sizing.settingsRow.compact;
}

export interface NavigableSettingsRowProps extends SettingsRowSizingProp {
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
  isRegular = false,
}: NavigableSettingsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const s = pickRowSizing(isRegular);
  const rowStyle = useRowStyle(palette.bgCard, palette.border, s);
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: s.labelSize, fontWeight: s.labelWeight }),
    [s.labelSize, s.labelWeight],
  );
  const valueStyle = useMemo<TextStyle>(() => ({ fontSize: s.valueSize }), [s.valueSize]);
  const chevronStyle = useMemo<TextStyle>(() => ({ fontSize: s.chevronSize }), [s.chevronSize]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={rowStyle}
      testID={testID}
    >
      <Text variant="caption" color="textPrimary" style={labelStyle}>
        {label}
      </Text>
      <Row align="center" gap="xs">
        <Text variant="mono" color="textSecondary" style={valueStyle}>
          {value}
        </Text>
        <Text variant="caption" color="textTertiary" style={chevronStyle}>
          ›
        </Text>
      </Row>
    </Pressable>
  );
}

export interface ToggleSettingsRowProps extends SettingsRowSizingProp {
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
  isRegular = false,
}: ToggleSettingsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const s = pickRowSizing(isRegular);
  const rowStyle = useRowStyle(palette.bgCard, palette.border, s);
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: s.labelSize, fontWeight: s.labelWeight }),
    [s.labelSize, s.labelWeight],
  );

  return (
    <View style={rowStyle} testID={testID}>
      <Text variant="caption" color="textPrimary" style={labelStyle}>
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

export interface InfoSettingsRowProps extends SettingsRowSizingProp {
  readonly label: string;
  readonly value: string;
  readonly testID: string;
}

export function InfoSettingsRow({
  label,
  value,
  testID,
  isRegular = false,
}: InfoSettingsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const s = pickRowSizing(isRegular);
  const rowStyle = useRowStyle(palette.bgCard, palette.border, s);
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: s.labelSize, fontWeight: s.labelWeight }),
    [s.labelSize, s.labelWeight],
  );
  const valueStyle = useMemo<TextStyle>(() => ({ fontSize: s.valueSize }), [s.valueSize]);

  return (
    <View style={rowStyle} testID={testID}>
      <Text variant="caption" color="textPrimary" style={labelStyle}>
        {label}
      </Text>
      <Text variant="mono" color="textSecondary" style={valueStyle}>
        {value}
      </Text>
    </View>
  );
}

export interface DisabledUnitsRowProps extends SettingsRowSizingProp {
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
  isRegular = false,
}: DisabledUnitsRowProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const s = pickRowSizing(isRegular);
  const styles = useDisabledUnitsStyles(palette, s);
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: s.labelSize, fontWeight: s.labelWeight }),
    [s.labelSize, s.labelWeight],
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text variant="caption" color="textPrimary" style={labelStyle}>
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

function useRowStyle(bgCard: string, border: string, s: RowSizing): ViewStyle {
  return useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: bgCard,
      borderColor: border,
      borderRadius: tokens.radii.md,
      borderWidth: ROW_BORDER_WIDTH,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: s.minHeight,
      paddingHorizontal: s.paddingH,
      paddingVertical: s.paddingV,
    }),
    [bgCard, border, s.minHeight, s.paddingH, s.paddingV],
  );
}

function useDisabledUnitsStyles(
  palette: { readonly bgCard: string; readonly border: string; readonly accent: string },
  s: RowSizing,
): DisabledUnitsStyles {
  return useMemo<DisabledUnitsStyles>(
    () => ({
      container: {
        backgroundColor: palette.bgCard,
        borderColor: palette.border,
        borderRadius: tokens.radii.md,
        borderWidth: ROW_BORDER_WIDTH,
        paddingHorizontal: s.paddingH,
        paddingVertical: s.paddingV,
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
    [palette.accent, palette.bgCard, palette.border, s.paddingH, s.paddingV],
  );
}
