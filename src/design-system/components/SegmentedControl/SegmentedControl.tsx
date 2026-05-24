import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useHapticFeedback } from '../../../core/haptics';
import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Text } from '../Text/Text';
import type { TextVariant } from '../Text/Text';

export interface SegmentedControlOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
}

export type SegmentedControlSize = 'compact' | 'regular';

export interface SegmentedControlProps<TValue extends string> {
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange: (next: TValue) => void;
  readonly accessibilityLabel?: string;
  /**
   * `compact` (default) — minHeight ≈ 38pt + 3pt track padding (44pt
   * touch target). Used on iPhone and the legacy iPad layout.
   * `regular` — minHeight 66pt + 3pt track padding (72pt overall),
   * body 16pt segment label weight 500. Used by the iPad-regular
   * Crosswind input column (cockpit-glance variant).
   */
  readonly size?: SegmentedControlSize;
  /**
   * When true and `options.length >= WRAP_THRESHOLD`, the track splits
   * into two rows of segments inside a single bordered surface. Used
   * by the Crosswind 6-segment runway-condition control on compact
   * widths (см. 06-ui-spec.md § Экран 4 segmented wrap rules).
   */
  readonly wrap?: boolean;
  readonly testID?: string;
}

const TRACK_PADDING = 3;
const TRACK_GAP = 2;
const TRACK_PADDING_DOUBLE = TRACK_PADDING * 2;
const DISABLED_OPACITY = 0.5;
const REGULAR_TRACK_HEIGHT = 72;
const REGULAR_SEGMENT_MIN_HEIGHT = REGULAR_TRACK_HEIGHT - TRACK_PADDING_DOUBLE;
const REGULAR_SEGMENT_LABEL_WEIGHT = '500';
const REGULAR_SEGMENT_LABEL_STYLE: TextStyle = { fontWeight: REGULAR_SEGMENT_LABEL_WEIGHT };
const ROW_GAP = TRACK_GAP * 2;
const WRAP_THRESHOLD = 5;

interface Styles {
  readonly row: ViewStyle;
  readonly segment: ViewStyle;
  readonly segmentActive: ViewStyle;
  readonly segmentDisabled: ViewStyle;
  readonly track: ViewStyle;
}

function buildStyles(palette: ColorPalette, size: SegmentedControlSize): Styles {
  const segmentMinHeight =
    size === 'regular'
      ? REGULAR_SEGMENT_MIN_HEIGHT
      : tokens.layout.minTouchTarget - TRACK_PADDING_DOUBLE;
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: TRACK_GAP,
    },
    segment: {
      alignItems: 'center',
      borderRadius: tokens.radii.sm,
      flex: 1,
      justifyContent: 'center',
      minHeight: segmentMinHeight,
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
      flexDirection: 'column',
      gap: ROW_GAP,
      padding: TRACK_PADDING,
    },
  });
}

interface SegmentProps<TValue extends string> {
  readonly option: SegmentedControlOption<TValue>;
  readonly isActive: boolean;
  readonly onPress: () => void;
  readonly styles: Styles;
  readonly labelVariant: TextVariant;
  readonly labelStyle: TextStyle | undefined;
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
  const { option, isActive, onPress, styles, labelVariant, labelStyle, testID } = props;
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
      <Text
        variant={labelVariant}
        color={segmentTextColor(isActive, isDisabled)}
        align="center"
        style={labelStyle}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

function splitOptions<TValue extends string>(
  options: readonly SegmentedControlOption<TValue>[],
  shouldWrap: boolean,
): readonly (readonly SegmentedControlOption<TValue>[])[] {
  if (!shouldWrap) {
    return [options];
  }
  const half = Math.ceil(options.length / 2);
  return [options.slice(0, half), options.slice(half)];
}

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  size = 'compact',
  wrap = false,
  testID,
}: SegmentedControlProps<TValue>): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const haptics = useHapticFeedback();
  const styles = useMemo(() => buildStyles(palette, size), [palette, size]);
  const labelVariant: TextVariant = size === 'regular' ? 'body' : 'segmentLabel';
  const labelStyle = size === 'regular' ? REGULAR_SEGMENT_LABEL_STYLE : undefined;
  const shouldWrap = wrap && options.length >= WRAP_THRESHOLD;
  const rows = useMemo(() => splitOptions(options, shouldWrap), [options, shouldWrap]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={styles.track}
      testID={testID}
    >
      {rows.map((rowOptions, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {rowOptions.map((option) => (
            <Segment<TValue>
              key={option.value}
              option={option}
              isActive={option.value === value}
              labelVariant={labelVariant}
              labelStyle={labelStyle}
              onPress={(): void => {
                if (option.disabled !== true) {
                  haptics.lightImpact();
                  onChange(option.value);
                }
              }}
              styles={styles}
              testID={testID === undefined ? undefined : `${testID}-${option.value}`}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
