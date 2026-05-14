/**
 * Settings-list row variants (см. `02_Specification/06-ui-spec.md`
 * § Экран 5 «Settings-row»). Shapes share the same surface (bgCard,
 * border, radii.md) but differ in trailing affordance:
 *
 *   - NavigableSettingsRow — opens a sub-screen / bottom-sheet
 *     (label + value + chevron, whole row tappable).
 *   - ToggleSettingsRow    — boolean toggle (label + Toggle).
 *   - InfoSettingsRow      — read-only label/value pair (no chevron,
 *     no Pressable). Used for MVP-permanent unit rows.
 *
 * All variants accept `isRegular` and switch between two sizing
 * bundles in `tokens.sizing.settingsRow.{compact, regular}` so a
 * single bool propagated from the screen scales the whole list on
 * iPad regular for cockpit-glance readability.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Row } from '../Row/Row';
import { Text } from '../Text/Text';
import { Toggle } from '../Toggle/Toggle';

const ROW_BORDER_WIDTH = 1;

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

export type NavigableSettingsRowValueColor = 'textSecondary' | 'accent';

export interface NavigableSettingsRowProps extends SettingsRowSizingProp {
  readonly label: string;
  readonly value: string;
  readonly onPress: () => void;
  readonly testID: string;
  /**
   * Color of the value text + trailing chevron. Defaults to
   * `textSecondary` (standard settings affordance). Override to
   * `accent` for rows that open an external destination — e.g. About →
   * Privacy policy / Terms of use / Support — where the stronger
   * interactivity signal is desired (см. 06-ui-spec.md § Экран 6
   * Visual treatment).
   */
  readonly valueColor?: NavigableSettingsRowValueColor;
}

export function NavigableSettingsRow({
  label,
  value,
  onPress,
  testID,
  isRegular = false,
  valueColor = 'textSecondary',
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
  const chevronTone = pickChevronTone(palette, valueColor);

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
        <Text variant="mono" color={valueColor} style={valueStyle}>
          {value}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={s.chevronSize}
          color={chevronTone}
          testID={`${testID}-chevron`}
        />
      </Row>
    </Pressable>
  );
}

function pickChevronTone(
  palette: ColorPalette,
  valueColor: NavigableSettingsRowValueColor,
): string {
  // When the row's value carries the strong interactivity signal
  // (accent), the chevron matches it. Otherwise the chevron uses the
  // muted textTertiary so the value text remains the dominant element.
  return valueColor === 'accent' ? palette.accent : palette.textTertiary;
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
