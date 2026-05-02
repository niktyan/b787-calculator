import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../core/theming';
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
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

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
        root: {
          flexDirection: 'row',
          gap: tokens.spacing.xs,
        },
        rootGrow: {
          alignSelf: 'stretch',
        },
      }),
    [palette.accentSoft],
  );

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.root, grow ? styles.rootGrow : null]}
      testID={testID}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const handlePress = (): void => onChange(item.id);
        return (
          <Pressable
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={item.id}
            onPress={handlePress}
            style={[
              styles.pill,
              isActive ? styles.pillActive : null,
              grow ? styles.pillGrow : null,
            ]}
            testID={testID === undefined ? undefined : `${testID}-${item.id}`}
          >
            <Text variant="caption" color={isActive ? 'accent' : 'textSecondary'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
