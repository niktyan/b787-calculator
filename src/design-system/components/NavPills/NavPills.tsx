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
}

export function NavPills<TId extends string = string>({
  items,
  activeId,
  onChange,
  testID,
  grow = false,
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
  readonly onPress: (next: TId) => void;
  readonly testID?: string | undefined;
}

function Pill<TId extends string = string>({
  item,
  isActive,
  grow,
  onPress,
  testID,
}: PillProps<TId>): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const { animatedStyle, onPressIn, onPressOut } = useScaleOnPress();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          alignItems: 'center',
          borderRadius: tokens.radii.md,
          justifyContent: 'center',
          minHeight: tokens.layout.minTouchTarget,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        pillActive: {
          backgroundColor: palette.accentSoft,
        },
        pillGrow: {
          flex: 1,
        },
      }),
    [palette.accentSoft],
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
        <Text variant="caption" color={isActive ? 'accent' : 'textSecondary'}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
