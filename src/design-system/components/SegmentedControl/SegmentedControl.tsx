import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Text } from '../Text/Text';

export interface SegmentedControlOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
}

export interface SegmentedControlProps<TValue extends string> {
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange: (next: TValue) => void;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

const TRACK_PADDING = 3;
const TRACK_GAP = 2;
const TRACK_PADDING_DOUBLE = TRACK_PADDING * 2;
const DISABLED_OPACITY = 0.5;

interface Styles {
  readonly segment: ViewStyle;
  readonly segmentActive: ViewStyle;
  readonly segmentDisabled: ViewStyle;
  readonly track: ViewStyle;
}

function buildStyles(palette: ColorPalette): Styles {
  return StyleSheet.create({
    segment: {
      alignItems: 'center',
      borderRadius: tokens.radii.sm,
      flex: 1,
      justifyContent: 'center',
      minHeight: tokens.layout.minTouchTarget - TRACK_PADDING_DOUBLE,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
    },
    segmentActive: {
      backgroundColor: palette.accent,
    },
    segmentDisabled: {
      opacity: DISABLED_OPACITY,
    },
    track: {
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: TRACK_GAP,
      padding: TRACK_PADDING,
    },
  });
}

interface SegmentProps<TValue extends string> {
  readonly option: SegmentedControlOption<TValue>;
  readonly isActive: boolean;
  readonly onPress: () => void;
  readonly styles: Styles;
  readonly testID: string | undefined;
}

function segmentTextColor(
  isActive: boolean,
  isDisabled: boolean,
): 'textOnAccent' | 'textSecondary' | 'textTertiary' {
  if (isActive) {
    return 'textOnAccent';
  }
  if (isDisabled) {
    return 'textTertiary';
  }
  return 'textSecondary';
}

function Segment<TValue extends string>(props: SegmentProps<TValue>): ReactNode {
  const { option, isActive, onPress, styles, testID } = props;
  const isDisabled = option.disabled === true;
  return (
    <Pressable
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityRole="radio"
      accessibilityState={{ disabled: isDisabled, selected: isActive }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.segment,
        isActive ? styles.segmentActive : null,
        isDisabled ? styles.segmentDisabled : null,
      ]}
      testID={testID}
    >
      <Text variant="segmentLabel" color={segmentTextColor(isActive, isDisabled)} align="center">
        {option.label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<TValue>): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const styles = useMemo(() => buildStyles(palette), [palette]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={styles.track}
      testID={testID}
    >
      {options.map((option) => (
        <Segment<TValue>
          key={option.value}
          option={option}
          isActive={option.value === value}
          onPress={(): void => {
            if (option.disabled !== true) {
              onChange(option.value);
            }
          }}
          styles={styles}
          testID={testID === undefined ? undefined : `${testID}-${option.value}`}
        />
      ))}
    </View>
  );
}
