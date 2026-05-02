import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';

export interface ToggleProps {
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly disabled?: boolean;
  readonly accessibilityLabel: string;
  readonly testID?: string;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const TRACK_RADIUS = 13;
const KNOB_SIZE = 22;
const KNOB_RADIUS = 11;
const KNOB_INSET = 2;
const KNOB_OFFSET_ON = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET;
const DISABLED_OPACITY = 0.5;

export function Toggle({
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: ToggleProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        knob: {
          backgroundColor: palette.bgCard,
          borderRadius: KNOB_RADIUS,
          height: KNOB_SIZE,
          left: value ? KNOB_OFFSET_ON : KNOB_INSET,
          position: 'absolute',
          top: KNOB_INSET,
          width: KNOB_SIZE,
        },
        pressable: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: tokens.layout.minTouchTarget,
          minWidth: tokens.layout.minTouchTarget,
          opacity: disabled ? DISABLED_OPACITY : 1,
          padding: tokens.spacing.xs,
        },
        track: {
          backgroundColor: value ? palette.accent : palette.textTertiary,
          borderRadius: TRACK_RADIUS,
          height: TRACK_HEIGHT,
          width: TRACK_WIDTH,
        },
      }),
    [disabled, palette.accent, palette.bgCard, palette.textTertiary, value],
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={(): void => onChange(!value)}
      style={styles.pressable}
      testID={testID}
    >
      <View style={styles.track}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}
