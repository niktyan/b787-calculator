/**
 * Crosswind result panel — Block 5 simplified single-card variant.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4 → result panel.
 *
 * One Card with the huge centred number (status label + value + KT
 * suffix). On iPad landscape (`isRegular === true`) the Card stretches
 * to fill the right column via `flex: 1`. On compact widths the Card
 * holds its own height and the content remains vertically centred.
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
  readonly testID?: string | undefined;
}

const KT_UNIT = 'KT';
const ICON_SIZE = 32;
const CAPTION_MAX_WIDTH = 280;
const CARD_BORDER_WIDTH = 1;
const CARD_MIN_HEIGHT_COMPACT = 200;
const CARD_MIN_HEIGHT_REGULAR = 320;
const TRANSITION_DURATION_MS = 200;
const STATUS_LETTER_SPACING = 0.72; // ≈ 0.08em at 9pt
const KT_SUFFIX_MARGIN_LEFT = 8;

const STATUS_STYLE: TextStyle = {
  letterSpacing: STATUS_LETTER_SPACING,
  textTransform: 'uppercase',
};

interface CardSurfaceProps {
  readonly children: ReactNode;
  readonly isRegular: boolean;
  readonly testID?: string | undefined;
}

function CardSurface({ children, isRegular, testID }: CardSurfaceProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const cardStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: CARD_BORDER_WIDTH,
      flex: isRegular ? 1 : 0,
      gap: tokens.spacing.sm,
      justifyContent: 'center',
      minHeight: isRegular ? CARD_MIN_HEIGHT_REGULAR : CARD_MIN_HEIGHT_COMPACT,
      padding: tokens.spacing.lg,
    }),
    [isRegular, palette.bgCard, palette.border],
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
  return (
    <View style={styles.valueRow}>
      <Text
        variant={valueVariant}
        color="accent"
        allowFontScaling={false}
        accessibilityLabel={`${value} ${KT_UNIT}`}
      >
        {String(value)}
      </Text>
      <Text variant={unitVariant} color="textSecondary" style={styles.ktSuffix}>
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
}

function IdleView(props: IdleViewProps): ReactNode {
  const { output, warning, statusLabel, warningText, isRegular } = props;
  return (
    <CardSurface isRegular={isRegular} testID="crosswind-result-panel">
      <Text variant="microUppercase" color="accent" style={STATUS_STYLE}>
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
  readonly testID: string;
}

function CaptionView({ message, iconLabel, isRegular, testID }: CaptionViewProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const messageStyle = useMemo<ViewStyle>(() => ({ maxWidth: CAPTION_MAX_WIDTH }), []);
  return (
    <CardSurface isRegular={isRegular} testID={testID}>
      <MaterialIcons
        accessibilityLabel={iconLabel}
        color={palette.textTertiary}
        name="info-outline"
        size={ICON_SIZE}
      />
      <View style={messageStyle}>
        <Text variant="caption" color="textSecondary" align="center">
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
}

function ErrorView({ headline, description, isRegular }: ErrorViewProps): ReactNode {
  const messageStyle = useMemo<ViewStyle>(() => ({ maxWidth: CAPTION_MAX_WIDTH }), []);
  return (
    <CardSurface isRegular={isRegular} testID="crosswind-result-panel-error">
      <Text variant="caption" color="danger" align="center">
        {headline}
      </Text>
      {description !== undefined ? (
        <View style={messageStyle}>
          <Text variant="caption" color="textSecondary" align="center">
            {description}
          </Text>
        </View>
      ) : null}
    </CardSurface>
  );
}

export function CrosswindResult(props: CrosswindResultProps): ReactNode {
  const { state, isRegular = false, testID } = props;
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const content = renderContent(state, isRegular, t);
  const wrapperStyle = isRegular ? styles.fillHeight : undefined;

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
  t: (key: string) => string,
): ReactNode {
  if (state.kind === 'empty') {
    return (
      <CaptionView
        message={t('crosswind.resultEmpty')}
        iconLabel={t('crosswind.emptyIconLabel')}
        isRegular={isRegular}
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
        testID="crosswind-result-panel-data-not-available"
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <ErrorView headline={state.headline} description={state.description} isRegular={isRegular} />
    );
  }
  return (
    <IdleView
      output={state.output}
      warning={state.warning}
      isRegular={isRegular}
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
