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
}

export function NavPills<TId extends string = string>({
  items,
  activeId,
  onChange,
  testID,
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
        root: {
          flexDirection: 'row',
          gap: tokens.spacing.xs,
        },
      }),
    [palette.accentSoft],
  );

  return (
    <View accessibilityRole="tablist" style={styles.root} testID={testID}>
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
            style={[styles.pill, isActive ? styles.pillActive : null]}
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
