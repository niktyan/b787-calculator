import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../../../core/theming';
import { useScaleOnPress } from '../../hooks';
import { tokens } from '../../tokens';
import { Text } from '../Text/Text';

export interface NavPillsItem<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
  readonly accessibilityLabel?: string;
}

/**
 * Per-pill visual sizing knobs. When omitted, NavPills uses the default
 * compact set (matches phone portrait). Main Menu passes
 * `tokens.sizing.header.regular` on iPad to scale up labels and padding.
 */
export interface NavPillsSizing {
  readonly pillLabelSize: number;
  readonly pillPaddingV: number;
  readonly pillPaddingH: number;
  readonly pillRadius: number;
}

const DEFAULT_PILL_SIZING: NavPillsSizing = {
  pillLabelSize: tokens.sizing.header.compact.pillLabelSize,
  pillPaddingV: tokens.sizing.header.compact.pillPaddingV,
  pillPaddingH: tokens.sizing.header.compact.pillPaddingH,
  pillRadius: tokens.sizing.header.compact.pillRadius,
};

export interface NavPillsProps<TId extends string = string> {
  readonly items: readonly NavPillsItem<TId>[];
  readonly activeId: TId;
  readonly onChange: (next: TId) => void;
  readonly testID?: string;
  /**
   * When true, each pill grows to share the parent's width equally
   * (`flex: 1`). Used by Main Menu on compact widths to fit a full-width
   * NavPills row below the brand block. Defaults to false (intrinsic width).
   */
  readonly grow?: boolean;
  /**
   * Optional sizing override (label font size, padding, radius). Defaults
   * to the compact phone size set.
   */
  readonly sizing?: NavPillsSizing;
}

export function NavPills<TId extends string = string>({
  items,
  activeId,
  onChange,
  testID,
  grow = false,
  sizing = DEFAULT_PILL_SIZING,
}: NavPillsProps<TId>): ReactNode {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flexDirection: 'row',
          gap: tokens.spacing.xs,
        },
        rootGrow: {
          alignSelf: 'stretch',
        },
      }),
    [],
  );

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.root, grow ? styles.rootGrow : null]}
      testID={testID}
    >
      {items.map((item) => (
        <Pill
          item={item}
          isActive={item.id === activeId}
          grow={grow}
          sizing={sizing}
          onPress={onChange}
          testID={testID === undefined ? undefined : `${testID}-${item.id}`}
          key={item.id}
        />
      ))}
    </View>
  );
}

interface PillProps<TId extends string = string> {
  readonly item: NavPillsItem<TId>;
  readonly isActive: boolean;
  readonly grow: boolean;
  readonly sizing: NavPillsSizing;
  readonly onPress: (next: TId) => void;
  readonly testID?: string | undefined;
}

function Pill<TId extends string = string>({
  item,
  isActive,
  grow,
  sizing,
  onPress,
  testID,
}: PillProps<TId>): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const { animatedStyle, onPressIn, onPressOut } = useScaleOnPress();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontSize: sizing.pillLabelSize,
        },
        pill: {
          alignItems: 'center',
          borderRadius: sizing.pillRadius,
          justifyContent: 'center',
          minHeight: tokens.layout.minTouchTarget,
          paddingHorizontal: sizing.pillPaddingH,
          paddingVertical: sizing.pillPaddingV,
        },
        pillActive: {
          backgroundColor: palette.accentSoft,
        },
        pillGrow: {
          flex: 1,
        },
      }),
    [
      palette.accentSoft,
      sizing.pillLabelSize,
      sizing.pillPaddingH,
      sizing.pillPaddingV,
      sizing.pillRadius,
    ],
  );

  const handlePress = (): void => onPress(item.id);
  const wrapperStyle: StyleProp<ViewStyle> = grow ? styles.pillGrow : null;

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={wrapperStyle}
      testID={testID}
    >
      <Animated.View style={[styles.pill, isActive ? styles.pillActive : null, animatedStyle]}>
        <Text
          variant="caption"
          color={isActive ? 'accentText' : 'textSecondary'}
          style={styles.label}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
