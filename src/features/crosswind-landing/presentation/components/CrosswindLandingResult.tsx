/**
 * Crosswind Landing result panel — single-card variant.
 *
 * Visual treatment mirrors the Takeoff CrosswindResult (status label,
 * 48–72 pt mono accent number, KT suffix) so pilots see a consistent
 * cockpit-glance number across both modules. Component intentionally
 * duplicated (not imported from the takeoff feature) per
 * 02-architecture.md: features must not cross-import each other; the
 * DS does not yet expose a shared "big-number result" component.
 *
 * States:
 *   • idle               — status label + value + KT (always shown for
 *                          valid lookups; Landing has no out-of-envelope
 *                          path because there are no numeric inputs to
 *                          violate one).
 *   • data-not-available — info caption ("No data available for the
 *                          selected aircraft / condition / mode.").
 *   • error              — danger headline + description (defence-in-
 *                          depth; not reachable from current bundled
 *                          data).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import { useTheme, useTranslation } from '../../../../core';
import { Text, tokens, useReduceMotion } from '../../../../design-system';
import type { TextVariant } from '../../../../design-system';
import type { CrosswindLandingOutput } from '../../domain/types';
import type { CrosswindLandingUIState } from '../useCrosswindLandingCalculator';

export interface CrosswindLandingResultProps {
  readonly state: CrosswindLandingUIState;
  readonly isRegular?: boolean;
  readonly fillHeight?: boolean;
  readonly testID?: string | undefined;
}

const KT_UNIT = 'KT';
const ICON_SIZE_COMPACT = 32;
const ICON_SIZE_REGULAR = 48;
const CAPTION_MAX_WIDTH_COMPACT = 280;
const CAPTION_MAX_WIDTH_REGULAR = 380;
const CARD_BORDER_WIDTH = 1;
const CARD_MIN_HEIGHT_COMPACT = 200;
const CARD_MIN_HEIGHT_REGULAR_PORTRAIT = 280;
const CARD_MIN_HEIGHT_REGULAR_LANDSCAPE = 320;
const TRANSITION_DURATION_MS = 200;
const STATUS_MARGIN_BOTTOM = 16;
const KT_SUFFIX_MARGIN_LEFT = 8;
const STATUS_LETTER_SPACING_COMPACT = 0.72;
const STATUS_LETTER_SPACING_REGULAR = 1;
const VALUE_FONT_SIZE_REGULAR = 96;
const VALUE_LINE_HEIGHT_REGULAR = 104;
const UNIT_FONT_SIZE_REGULAR = 48;
const UNIT_LINE_HEIGHT_REGULAR = 56;

const STATUS_STYLE_COMPACT: TextStyle = {
  letterSpacing: STATUS_LETTER_SPACING_COMPACT,
  marginBottom: STATUS_MARGIN_BOTTOM,
  textTransform: 'uppercase',
};
const STATUS_STYLE_REGULAR: TextStyle = {
  ...STATUS_STYLE_COMPACT,
  fontWeight: '600',
  letterSpacing: STATUS_LETTER_SPACING_REGULAR,
};
const VALUE_STYLE_REGULAR: TextStyle = {
  fontSize: VALUE_FONT_SIZE_REGULAR,
  lineHeight: VALUE_LINE_HEIGHT_REGULAR,
};
const UNIT_STYLE_REGULAR: TextStyle = {
  fontSize: UNIT_FONT_SIZE_REGULAR,
  lineHeight: UNIT_LINE_HEIGHT_REGULAR,
};

function cardMinHeight(isRegular: boolean, fillHeight: boolean): number {
  if (fillHeight) return CARD_MIN_HEIGHT_REGULAR_LANDSCAPE;
  if (isRegular) return CARD_MIN_HEIGHT_REGULAR_PORTRAIT;
  return CARD_MIN_HEIGHT_COMPACT;
}

interface CardSurfaceProps {
  readonly children: ReactNode;
  readonly isRegular: boolean;
  readonly fillHeight: boolean;
  readonly testID?: string | undefined;
}

function CardSurface({ children, isRegular, fillHeight, testID }: CardSurfaceProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const cardStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: CARD_BORDER_WIDTH,
      flex: fillHeight ? 1 : 0,
      gap: tokens.spacing.sm,
      justifyContent: 'center',
      minHeight: cardMinHeight(isRegular, fillHeight),
      padding: tokens.spacing.lg,
    }),
    [fillHeight, isRegular, palette.bgCard, palette.border],
  );
  return (
    <View style={cardStyle} {...(testID === undefined ? {} : { testID })}>
      {children}
    </View>
  );
}

interface ValueRowProps {
  readonly value: number;
  readonly isRegular: boolean;
}

function ValueRow({ value, isRegular }: ValueRowProps): ReactNode {
  const valueVariant: TextVariant = isRegular ? 'displayLarge' : 'display';
  const unitVariant: TextVariant = isRegular ? 'monoXL' : 'monoMedium';
  const valueStyle = isRegular ? VALUE_STYLE_REGULAR : undefined;
  const unitStyle = isRegular ? [styles.ktSuffix, UNIT_STYLE_REGULAR] : styles.ktSuffix;
  return (
    <View style={styles.valueRow}>
      <Text
        variant={valueVariant}
        color="accent"
        allowFontScaling={false}
        accessibilityLabel={`${value} ${KT_UNIT}`}
        style={valueStyle}
      >
        {String(value)}
      </Text>
      <Text variant={unitVariant} color="textSecondary" style={unitStyle}>
        {KT_UNIT}
      </Text>
    </View>
  );
}

interface IdleViewProps {
  readonly output: CrosswindLandingOutput;
  readonly statusLabel: string;
  readonly isRegular: boolean;
  readonly fillHeight: boolean;
}

function IdleView(props: IdleViewProps): ReactNode {
  const { output, statusLabel, isRegular, fillHeight } = props;
  const statusVariant: TextVariant = isRegular ? 'body' : 'microUppercase';
  const statusStyle = isRegular ? STATUS_STYLE_REGULAR : STATUS_STYLE_COMPACT;
  return (
    <CardSurface
      isRegular={isRegular}
      fillHeight={fillHeight}
      testID="crosswind-landing-result-panel"
    >
      <Text variant={statusVariant} color="accentText" style={statusStyle}>
        {statusLabel}
      </Text>
      <ValueRow value={output.maxCrosswindKnots} isRegular={isRegular} />
    </CardSurface>
  );
}

interface CaptionViewProps {
  readonly message: string;
  readonly iconLabel: string;
  readonly isRegular: boolean;
  readonly fillHeight: boolean;
  readonly testID: string;
}

function captionMaxWidth(isRegular: boolean): ViewStyle {
  return { maxWidth: isRegular ? CAPTION_MAX_WIDTH_REGULAR : CAPTION_MAX_WIDTH_COMPACT };
}

function captionVariantFor(isRegular: boolean): TextVariant {
  return isRegular ? 'body' : 'caption';
}

function CaptionView({
  message,
  iconLabel,
  isRegular,
  fillHeight,
  testID,
}: CaptionViewProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  return (
    <CardSurface isRegular={isRegular} fillHeight={fillHeight} testID={testID}>
      <MaterialIcons
        accessibilityLabel={iconLabel}
        color={palette.textTertiary}
        name="info-outline"
        size={isRegular ? ICON_SIZE_REGULAR : ICON_SIZE_COMPACT}
      />
      <View style={captionMaxWidth(isRegular)}>
        <Text variant={captionVariantFor(isRegular)} color="textSecondary" align="center">
          {message}
        </Text>
      </View>
    </CardSurface>
  );
}

interface ErrorViewProps {
  readonly headline: string;
  readonly description?: string | undefined;
  readonly isRegular: boolean;
  readonly fillHeight: boolean;
}

function ErrorView({ headline, description, isRegular, fillHeight }: ErrorViewProps): ReactNode {
  const variant = captionVariantFor(isRegular);
  return (
    <CardSurface
      isRegular={isRegular}
      fillHeight={fillHeight}
      testID="crosswind-landing-result-panel-error"
    >
      <Text variant={variant} color="danger" align="center">
        {headline}
      </Text>
      {description !== undefined ? (
        <View style={captionMaxWidth(isRegular)}>
          <Text variant={variant} color="textSecondary" align="center">
            {description}
          </Text>
        </View>
      ) : null}
    </CardSurface>
  );
}

function renderContent(
  state: CrosswindLandingUIState,
  isRegular: boolean,
  fillHeight: boolean,
  t: (key: string) => string,
): ReactNode {
  if (state.kind === 'data-not-available') {
    return (
      <CaptionView
        message={state.description}
        iconLabel={t('crosswind-landing.emptyIconLabel')}
        isRegular={isRegular}
        fillHeight={fillHeight}
        testID="crosswind-landing-result-panel-data-not-available"
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <ErrorView
        headline={state.headline}
        description={state.description}
        isRegular={isRegular}
        fillHeight={fillHeight}
      />
    );
  }
  return (
    <IdleView
      output={state.output}
      isRegular={isRegular}
      fillHeight={fillHeight}
      statusLabel={t('crosswind-landing.resultStatusLabel')}
    />
  );
}

export function CrosswindLandingResult(props: CrosswindLandingResultProps): ReactNode {
  const { state, isRegular = false, fillHeight = false, testID } = props;
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const content = renderContent(state, isRegular, fillHeight, t);
  const wrapperStyle = fillHeight ? styles.fillHeight : undefined;

  if (reduceMotion) {
    return (
      <Animated.View style={wrapperStyle} testID={testID}>
        {content}
      </Animated.View>
    );
  }
  return (
    <Animated.View
      layout={LinearTransition.duration(TRANSITION_DURATION_MS).easing(Easing.out(Easing.ease))}
      style={wrapperStyle}
      testID={testID}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fillHeight: {
    flex: 1,
  },
  ktSuffix: {
    marginLeft: KT_SUFFIX_MARGIN_LEFT,
  },
  valueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
