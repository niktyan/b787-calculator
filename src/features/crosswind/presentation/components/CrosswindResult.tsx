import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import { useTheme, useTranslation } from '../../../../core';
import { ResultPanel, Text, tokens, useReduceMotion } from '../../../../design-system';
import type { ResultPanelMetaItem, ResultPanelState } from '../../../../design-system';
import type { CrosswindCalculationOutput, EnvelopeViolation } from '../../domain/types';
import type { CrosswindUIState } from '../useCrosswindCalculator';

export interface CrosswindResultProps {
  readonly state: CrosswindUIState;
  readonly testID?: string | undefined;
}

const KT_UNIT = 'KT';
const EMPTY_ICON_SIZE = 32;
const EMPTY_TEXT_MAX_WIDTH = 240;
const EMPTY_PANEL_MIN_HEIGHT = 140;
const TRANSITION_DURATION_MS = 200;

function formatBracket(bracket: { readonly lower: number; readonly upper: number }): string {
  if (bracket.lower === bracket.upper) {
    return `${formatNumber(bracket.lower)}`;
  }
  return `${formatNumber(bracket.lower)} – ${formatNumber(bracket.upper)}`;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}

/**
 * Build the meta-grid rows from algorithm output.
 *
 * Spec: 06-ui-spec.md § Экран 4 → "Содержимое (idle)" / Visual treatment
 *   "Meta-grid".
 *
 * - Weight row was dropped (PR feat/crosswind-polish-2): the algorithm's
 *   `weightBracket` is degenerate (`[w, w]`) and the weight is already
 *   echoed in the input field, so showing it again here was noise.
 * - CG band uses `cgBracket` (real range from XLOOKUP threshold pair).
 * - Range uses `bracketCrosswindRange` (real KT range), but is hidden
 *   when min == max — for example below-/above-envelope fallback cases
 *   yield `[40, 40]` and rendering "40 — 40 KT" is confusing.
 * - RWY is "Dry" in MVP; RWYCC is implicit for Dry per § Экран 4 input
 *   section (RWYCC visible only when contaminated, which is hidden in
 *   MVP).
 */
function buildMeta(
  output: CrosswindCalculationOutput,
  cgLabel: string,
  rangeLabel: string,
): readonly ResultPanelMetaItem[] {
  const items: ResultPanelMetaItem[] = [
    {
      label: cgLabel,
      value: `${formatBracket(output.metadata.cgBracket)} %MAC`,
    },
    {
      label: 'RWY',
      value: 'Dry',
    },
  ];
  const range = output.metadata.bracketCrosswindRange;
  if (range.lower !== range.upper) {
    items.push({
      label: rangeLabel,
      value: `${range.lower} – ${range.upper} ${KT_UNIT}`,
    });
  }
  return items;
}

interface IdleViewProps {
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly statusLabel: string;
  readonly footnote: string;
  readonly cgLabel: string;
  readonly rangeLabel: string;
  readonly warningText: string;
}

function IdleView(props: IdleViewProps): ReactNode {
  const { output, warning, statusLabel, footnote, cgLabel, rangeLabel, warningText } = props;
  const idleState: ResultPanelState = {
    kind: 'idle',
    label: statusLabel,
    value: String(output.maxCrosswindKnots),
    unit: KT_UNIT,
    footnote,
    meta: buildMeta(output, cgLabel, rangeLabel),
  };
  return (
    <View>
      <ResultPanel state={idleState} testID="crosswind-result-panel" />
      {warning !== null ? (
        <View style={styles.warningChip} testID="crosswind-warning-chip">
          <Text variant="caption" color="warn">
            {warningText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface EmptyViewProps {
  readonly message: string;
  readonly iconLabel: string;
}

function EmptyView({ message, iconLabel }: EmptyViewProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      justifyContent: 'center',
      minHeight: EMPTY_PANEL_MIN_HEIGHT,
      padding: tokens.spacing.lg,
    }),
    [palette.bgCard, palette.border],
  );
  const messageStyle = useMemo<ViewStyle>(() => ({ maxWidth: EMPTY_TEXT_MAX_WIDTH }), []);

  return (
    <View accessibilityRole="summary" style={containerStyle} testID="crosswind-result-panel-empty">
      <MaterialIcons
        accessibilityLabel={iconLabel}
        color={palette.textTertiary}
        name="info-outline"
        size={EMPTY_ICON_SIZE}
      />
      <View style={messageStyle}>
        <Text variant="caption" color="textSecondary" align="center">
          {message}
        </Text>
      </View>
    </View>
  );
}

export function CrosswindResult(props: CrosswindResultProps): ReactNode {
  const { state, testID } = props;
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const content = renderContent(state, t);

  if (reduceMotion) {
    return <Animated.View testID={testID}>{content}</Animated.View>;
  }
  return (
    <Animated.View
      layout={LinearTransition.duration(TRANSITION_DURATION_MS).easing(Easing.out(Easing.ease))}
      testID={testID}
    >
      {content}
    </Animated.View>
  );
}

function renderContent(state: CrosswindUIState, t: (key: string) => string): ReactNode {
  if (state.kind === 'empty') {
    return (
      <EmptyView message={t('crosswind.resultEmpty')} iconLabel={t('crosswind.emptyIconLabel')} />
    );
  }
  if (state.kind === 'out-of-envelope') {
    return (
      <ResultPanel
        state={{ kind: 'out-of-envelope', message: state.reason }}
        testID="crosswind-result-panel"
      />
    );
  }
  if (state.kind === 'error') {
    const errorState: ResultPanelState =
      state.description === undefined
        ? { kind: 'error', headline: state.headline }
        : { kind: 'error', headline: state.headline, description: state.description };
    return <ResultPanel state={errorState} testID="crosswind-result-panel" />;
  }
  return (
    <IdleView
      output={state.output}
      warning={state.warning}
      statusLabel={t('crosswind.resultStatusLabel')}
      footnote={t('crosswind.resultFootnote')}
      cgLabel={t('crosswind.metaCG')}
      rangeLabel={t('crosswind.metaRange')}
      warningText={t('crosswind.warningOutsideEnvelope')}
    />
  );
}

const styles = StyleSheet.create({
  warningChip: {
    marginTop: tokens.spacing.sm,
  },
});
