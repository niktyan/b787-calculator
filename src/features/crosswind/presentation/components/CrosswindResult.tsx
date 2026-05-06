/**
 * Crosswind result panel — single-card variant.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4 → result panel.
 *
 * Two independent props:
 *   - `isRegular` — drives typography size (`displayLarge` / `monoXL`
 *     vs `display` / `monoMedium`). Active on iPad portrait +
 *     landscape (width >= 768pt).
 *   - `fillHeight` — drives `flex: 1` so the Card claims the full
 *     right-column height. Active only when the screen is in
 *     2-column layout (iPad landscape, width >= 1024pt). On iPad
 *     portrait the Card stacks under the input form and uses a
 *     larger minHeight floor; on iPhone it uses the compact floor.
 *
 * States:
 *   • idle:               status label + value + KT (+ optional warning chip)
 *   • empty:              info-outline + caption ("Enter weight and CG …")
 *   • out-of-envelope:    info-outline + reason caption
 *   • data-not-available: info-outline + condition/aircraft caption
 *   • error:              danger headline + description (rare; covers
 *                         NaN/Infinity / DataNotAvailable phase mismatch /
 *                         CalculationFailed)
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
import type { CrosswindCalculationOutput, EnvelopeViolation } from '../../domain/types';
import type { CrosswindUIState } from '../useCrosswindCalculator';

export interface CrosswindResultProps {
  readonly state: CrosswindUIState;
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
// Inline overrides on top of `displayLarge` / `monoXL` / `body`
// variants — bumps the cockpit-glance number without adding a new DS
// token (PR hard constraint). Compact path keeps existing variants.
const STATUS_STYLE_COMPACT: TextStyle = {
  letterSpacing: 0.72,
  marginBottom: STATUS_MARGIN_BOTTOM,
  textTransform: 'uppercase',
};
const STATUS_STYLE_REGULAR: TextStyle = {
  ...STATUS_STYLE_COMPACT,
  fontWeight: '600',
  letterSpacing: 1,
};
const VALUE_STYLE_REGULAR: TextStyle = { fontSize: 96, lineHeight: 104 };
const UNIT_STYLE_REGULAR: TextStyle = { fontSize: 48, lineHeight: 56 };

function cardMinHeight(isRegular: boolean, fillHeight: boolean): number {
  if (fillHeight) {
    return CARD_MIN_HEIGHT_REGULAR_LANDSCAPE;
  }
  if (isRegular) {
    return CARD_MIN_HEIGHT_REGULAR_PORTRAIT;
  }
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
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly statusLabel: string;
  readonly warningText: string;
  readonly isRegular: boolean;
  readonly fillHeight: boolean;
}

function IdleView(props: IdleViewProps): ReactNode {
  const { output, warning, statusLabel, warningText, isRegular, fillHeight } = props;
  const statusVariant: TextVariant = isRegular ? 'body' : 'microUppercase';
  const statusStyle = isRegular ? STATUS_STYLE_REGULAR : STATUS_STYLE_COMPACT;
  return (
    <CardSurface isRegular={isRegular} fillHeight={fillHeight} testID="crosswind-result-panel">
      <Text variant={statusVariant} color="accent" style={statusStyle}>
        {statusLabel}
      </Text>
      <ValueRow value={output.maxCrosswindKnots} isRegular={isRegular} />
      {warning !== null ? (
        <View style={styles.warningChip} testID="crosswind-warning-chip">
          <Text variant="caption" color="warn">
            {warningText}
          </Text>
        </View>
      ) : null}
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
      testID="crosswind-result-panel-error"
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

export function CrosswindResult(props: CrosswindResultProps): ReactNode {
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

function renderContent(
  state: CrosswindUIState,
  isRegular: boolean,
  fillHeight: boolean,
  t: (key: string) => string,
): ReactNode {
  if (state.kind === 'empty') {
    return (
      <CaptionView
        message={t('crosswind.resultEmpty')}
        iconLabel={t('crosswind.emptyIconLabel')}
        isRegular={isRegular}
        fillHeight={fillHeight}
        testID="crosswind-result-panel-empty"
      />
    );
  }
  if (state.kind === 'out-of-envelope') {
    return (
      <CaptionView
        message={state.reason}
        iconLabel={t('crosswind.emptyIconLabel')}
        isRegular={isRegular}
        fillHeight={fillHeight}
        testID="crosswind-result-panel-out-of-envelope"
      />
    );
  }
  if (state.kind === 'data-not-available') {
    return (
      <CaptionView
        message={state.description}
        iconLabel={t('crosswind.emptyIconLabel')}
        isRegular={isRegular}
        fillHeight={fillHeight}
        testID="crosswind-result-panel-data-not-available"
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
      warning={state.warning}
      isRegular={isRegular}
      fillHeight={fillHeight}
      statusLabel={t('crosswind.resultStatusLabel')}
      warningText={t('crosswind.warningOutsideEnvelope')}
    />
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
  warningChip: {
    marginTop: tokens.spacing.sm,
  },
});
