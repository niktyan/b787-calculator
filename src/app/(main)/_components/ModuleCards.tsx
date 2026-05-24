import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme, useTranslation } from '../../../core';
import type { ActiveModule, ComingSoonModule } from '../../../core/modules';
import { Text, tokens, useScaleOnPress } from '../../../design-system';
import type { ColorPalette } from '../../../design-system';

interface ActiveCardStyles {
  readonly description: TextStyle;
  readonly gradient: ViewStyle;
  readonly icon: ViewStyle;
  readonly iconGlyph: TextStyle;
  readonly name: TextStyle;
  readonly root: ViewStyle;
}

interface ComingSoonStyles {
  readonly badge: TextStyle;
  readonly badgeWrap: ViewStyle;
  readonly description: TextStyle;
  readonly icon: ViewStyle;
  readonly iconGlyph: TextStyle;
  readonly name: TextStyle;
  readonly root: ViewStyle;
}

/**
 * Module-card components for Main Menu (см. `02_Specification/06-ui-spec.md`
 * Экран 3 Visual treatment). Extracted into their own file because each card
 * carries its own theme-aware StyleSheet plus the `useScaleOnPress` press
 * feedback, which kept menu.tsx over the 300-line cap.
 *
 * Two variants:
 *   - `ActiveModuleCard` — accent border + 135° linear gradient
 *     (bgCard → accentSoft) matching mockup section 2 active card.
 *   - `ComingSoonCard` — plain card surface with muted icon and a
 *     phase badge in the top-right.
 *
 * Both consume `tokens.sizing.moduleCard.{compact,regular}` based on the
 * `isRegular` prop driven from `useWindowDimensions().width >= 768`.
 */

// Line-heights sized 1.2× the font size for cockpit-glance density —
// keeps the card title compact without clipping descenders.
const NAME_LH_REGULAR = 24;
const NAME_LH_COMPACT = 16;

type CardSizing = (typeof tokens.sizing.moduleCard)[keyof typeof tokens.sizing.moduleCard];

function pickCardSizing(isRegular: boolean): CardSizing {
  return isRegular ? tokens.sizing.moduleCard.regular : tokens.sizing.moduleCard.compact;
}

function makeActiveCardStyles(
  palette: ColorPalette,
  sizing: CardSizing,
  nameLineHeight: number,
): ActiveCardStyles {
  return StyleSheet.create<ActiveCardStyles>({
    description: {
      fontSize: sizing.descriptionSize,
      lineHeight: sizing.descriptionLineHeight,
    },
    gradient: {
      borderRadius: sizing.radius,
    },
    icon: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: sizing.iconRadius,
      height: sizing.iconSize,
      justifyContent: 'center',
      marginBottom: sizing.iconMarginBottom,
      width: sizing.iconSize,
    },
    iconGlyph: {
      fontSize: sizing.iconGlyphSize,
    },
    name: {
      fontSize: sizing.nameSize,
      lineHeight: nameLineHeight,
    },
    root: {
      borderColor: palette.accent,
      borderRadius: sizing.radius,
      borderWidth: 1,
      overflow: 'hidden',
      padding: sizing.padding,
    },
  });
}

function makeComingSoonStyles(
  palette: ColorPalette,
  sizing: CardSizing,
  nameLineHeight: number,
): ComingSoonStyles {
  return StyleSheet.create<ComingSoonStyles>({
    badge: {
      fontSize: sizing.badgeSize,
    },
    badgeWrap: {
      position: 'absolute',
      right: tokens.spacing.sm,
      top: tokens.spacing.sm,
    },
    description: {
      fontSize: sizing.descriptionSize,
      lineHeight: sizing.descriptionLineHeight,
    },
    icon: {
      alignItems: 'center',
      backgroundColor: palette.borderStrong,
      borderRadius: sizing.iconRadius,
      height: sizing.iconSize,
      justifyContent: 'center',
      marginBottom: sizing.iconMarginBottom,
      width: sizing.iconSize,
    },
    iconGlyph: {
      fontSize: sizing.iconGlyphSize,
    },
    name: {
      fontSize: sizing.nameSize,
      lineHeight: nameLineHeight,
    },
    root: {
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: sizing.radius,
      borderWidth: 1,
      padding: sizing.padding,
    },
  });
}

export interface ActiveModuleCardProps {
  readonly module: ActiveModule;
  readonly onPress: () => void;
  readonly isRegular: boolean;
}

export function ActiveModuleCard({ module, onPress, isRegular }: ActiveModuleCardProps): ReactNode {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const { animatedStyle, onPressIn, onPressOut } = useScaleOnPress();
  const sizing = pickCardSizing(isRegular);
  const nameLineHeight = isRegular ? NAME_LH_REGULAR : NAME_LH_COMPACT;
  const cardStyles = useMemo(
    () => makeActiveCardStyles(palette, sizing, nameLineHeight),
    [palette, sizing, nameLineHeight],
  );
  // 135° gradient: top-left bgCard → bottom-right accentSoft. Light: white →
  // #DEF7F3; dark: #11161F → #003C36 — matches mockup section 2.
  const gradientColors: readonly [string, string] = [palette.bgCard, palette.accentSoft];

  return (
    <Pressable
      accessibilityLabel={module.name}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={`module-card-${module.id}`}
    >
      <Animated.View style={[cardStyles.root, animatedStyle]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, cardStyles.gradient]}
        />
        <View style={cardStyles.icon}>
          <Text variant="mono" color="accent" style={cardStyles.iconGlyph}>
            {module.icon}
          </Text>
        </View>
        <Text variant="caption" color="textPrimary" style={cardStyles.name}>
          {module.name}
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={cardStyles.description}>
          {t(`mainMenu.descriptions.${module.id}`)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export interface ComingSoonCardProps {
  readonly module: ComingSoonModule;
  readonly onPress: () => void;
  readonly isRegular: boolean;
}

export function ComingSoonCard({ module, onPress, isRegular }: ComingSoonCardProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const { animatedStyle, onPressIn, onPressOut } = useScaleOnPress();
  const sizing = pickCardSizing(isRegular);
  const nameLineHeight = isRegular ? NAME_LH_REGULAR : NAME_LH_COMPACT;
  const cardStyles = useMemo(
    () => makeComingSoonStyles(palette, sizing, nameLineHeight),
    [palette, sizing, nameLineHeight],
  );

  return (
    <Pressable
      accessibilityLabel={module.name}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={`module-card-${module.id}`}
    >
      <Animated.View style={[cardStyles.root, animatedStyle]}>
        <View style={cardStyles.badgeWrap}>
          <Text variant="chipLabel" color="textTertiary" style={cardStyles.badge}>
            {module.phase}
          </Text>
        </View>
        <View style={cardStyles.icon}>
          <Text variant="mono" color="textTertiary" style={cardStyles.iconGlyph}>
            {module.icon}
          </Text>
        </View>
        <Text variant="caption" color="textPrimary" style={cardStyles.name}>
          {module.name}
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={cardStyles.description}>
          {module.description}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
