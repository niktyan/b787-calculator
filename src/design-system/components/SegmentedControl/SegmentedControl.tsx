import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
const TRACK_ROW_GAP_WRAP = 8;
const TRACK_PADDING_DOUBLE = TRACK_PADDING * 2;
const DISABLED_OPACITY = 0.5;
const WRAP_THRESHOLD = 4; // > 4 segments triggers wrap on compact width
const WRAP_FLEX_BASIS = '32%'; // ~3 segments per wrapped row with TRACK_GAP

interface Styles {
  readonly segment: ViewStyle;
  readonly segmentActive: ViewStyle;
  readonly segmentDisabled: ViewStyle;
  readonly segmentWrapped: ViewStyle;
  readonly track: ViewStyle;
  readonly trackWrapped: ViewStyle;
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
    // Wrap mode: flexBasis governs row count; flexGrow lets segments
    // expand to fill the remaining row width after the track gap is
    // accounted for.
    segmentWrapped: {
      flex: 0,
      flexBasis: WRAP_FLEX_BASIS,
      flexGrow: 1,
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
    trackWrapped: {
      flexWrap: 'wrap',
      rowGap: TRACK_ROW_GAP_WRAP,
    },
  });
}

interface SegmentProps<TValue extends string> {
  readonly option: SegmentedControlOption<TValue>;
  readonly isActive: boolean;
  readonly onPress: () => void;
  readonly styles: Styles;
  readonly isWrapped: boolean;
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
  const { option, isActive, onPress, styles, isWrapped, testID } = props;
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
        isWrapped ? styles.segmentWrapped : null,
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

  // Wrap to 2 rows when on compact width AND options exceed the
  // single-row threshold (4). Polish-3: needed for the 6-state runway
  // segmented on iPhone (см. 06-ui-spec.md § Экран 4 → "Segmented
  // control wrap rules").
  const { width } = useWindowDimensions();
  const isWrapped = width < tokens.breakpoints.regularHeader && options.length > WRAP_THRESHOLD;
  const trackStyle = isWrapped ? [styles.track, styles.trackWrapped] : styles.track;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={trackStyle}
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
          isWrapped={isWrapped}
          testID={testID === undefined ? undefined : `${testID}-${option.value}`}
        />
      ))}
    </View>
  );
}
