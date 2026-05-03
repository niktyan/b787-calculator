import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '../../../../core';
import { ResultPanel, Text, tokens } from '../../../../design-system';
import type { ResultPanelMetaItem, ResultPanelState } from '../../../../design-system';
import type { CrosswindCalculationOutput, EnvelopeViolation } from '../../domain/types';
import type { CrosswindUIState } from '../useCrosswindCalculator';

export interface CrosswindResultProps {
  readonly state: CrosswindUIState;
  readonly testID?: string | undefined;
}

const KT_UNIT = 'KT';

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

function buildMeta(
  output: CrosswindCalculationOutput,
  weightLabel: string,
  cgLabel: string,
): readonly ResultPanelMetaItem[] {
  return [
    {
      label: weightLabel,
      value: `${formatNumber(output.metadata.weightBracket.lower)} t`,
    },
    {
      label: cgLabel,
      value: `${formatBracket(output.metadata.cgBracket)} %MAC`,
    },
    {
      label: 'RWY',
      value: 'Dry',
    },
    {
      label: 'XW band',
      value: `${output.metadata.bracketCrosswindRange.lower} – ${output.metadata.bracketCrosswindRange.upper} ${KT_UNIT}`,
    },
  ];
}

interface IdleViewProps {
  readonly output: CrosswindCalculationOutput;
  readonly warning: EnvelopeViolation | null;
  readonly statusLabel: string;
  readonly footnote: string;
  readonly weightLabel: string;
  readonly cgLabel: string;
  readonly sourceChip: string;
  readonly warningText: string;
  readonly testID?: string | undefined;
}

function IdleView(props: IdleViewProps): ReactNode {
  const {
    output,
    warning,
    statusLabel,
    footnote,
    weightLabel,
    cgLabel,
    sourceChip,
    warningText,
    testID,
  } = props;
  const idleState: ResultPanelState = {
    kind: 'idle',
    label: statusLabel,
    value: String(output.maxCrosswindKnots),
    unit: KT_UNIT,
    footnote,
    meta: buildMeta(output, weightLabel, cgLabel),
    sourceChip,
  };
  return (
    <View testID={testID}>
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

export function CrosswindResult(props: CrosswindResultProps): ReactNode {
  const { state, testID } = props;
  const { t } = useTranslation();

  if (state.kind === 'empty') {
    return (
      <ResultPanel state={{ kind: 'empty', message: t('crosswind.resultEmpty') }} testID={testID} />
    );
  }
  if (state.kind === 'out-of-envelope') {
    return (
      <ResultPanel state={{ kind: 'out-of-envelope', message: state.reason }} testID={testID} />
    );
  }
  if (state.kind === 'error') {
    const errorState: ResultPanelState =
      state.description === undefined
        ? { kind: 'error', headline: state.headline }
        : { kind: 'error', headline: state.headline, description: state.description };
    return <ResultPanel state={errorState} testID={testID} />;
  }
  return (
    <IdleView
      output={state.output}
      warning={state.warning}
      statusLabel={t('crosswind.resultStatusLabel')}
      footnote={t('crosswind.resultFootnote')}
      weightLabel={t('crosswind.metaWeight')}
      cgLabel={t('crosswind.metaCG')}
      sourceChip={t('crosswind.sourceChip')}
      warningText={t('crosswind.warningOutsideEnvelope')}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  warningChip: {
    marginTop: tokens.spacing.sm,
  },
});
