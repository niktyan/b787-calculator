import type { ReactNode } from 'react';

import { useTranslation } from '../../../../core';
import { NumericInput, SegmentedControl, Stack, Text } from '../../../../design-system';
import type { SegmentedControlOption } from '../../../../design-system';
import type { RunwayCondition } from '../../domain/types';

export interface CrosswindInputFormProps {
  readonly weightText: string;
  readonly cgText: string;
  readonly runwayCondition: RunwayCondition;
  readonly weightError: string | null;
  readonly cgError: string | null;
  readonly onWeightChange: (text: string) => void;
  readonly onCGChange: (text: string) => void;
  readonly onRunwayConditionChange: (next: RunwayCondition) => void;
  readonly testID?: string | undefined;
}

const RUNWAY_OPTIONS: readonly SegmentedControlOption<RunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'wet', label: 'Wet', disabled: true },
  { value: 'contaminated', label: 'Contaminated', disabled: true },
];

export function CrosswindInputForm(props: CrosswindInputFormProps): ReactNode {
  const {
    weightText,
    cgText,
    runwayCondition,
    weightError,
    cgError,
    onWeightChange,
    onCGChange,
    onRunwayConditionChange,
    testID,
  } = props;
  const { t } = useTranslation();

  return (
    <Stack gap="lg" {...(testID === undefined ? {} : { testID })}>
      <NumericInput
        label={t('crosswind.weightLabel')}
        value={weightText}
        onChange={onWeightChange}
        placeholder="e.g. 170"
        unit="t"
        {...(weightError === null ? {} : { error: weightError })}
        testID="crosswind-weight"
      />
      <NumericInput
        label={t('crosswind.cgLabel')}
        value={cgText}
        onChange={onCGChange}
        placeholder="e.g. 25.5"
        unit="%MAC"
        decimal
        {...(cgError === null ? {} : { error: cgError })}
        testID="crosswind-cg"
      />
      <Stack gap="xs">
        <Text variant="label" color="textSecondary">
          {t('crosswind.runwayConditionLabel')}
        </Text>
        <SegmentedControl<RunwayCondition>
          value={runwayCondition}
          options={RUNWAY_OPTIONS}
          onChange={onRunwayConditionChange}
          accessibilityLabel={t('crosswind.runwayConditionLabel')}
          testID="crosswind-runway"
        />
      </Stack>
    </Stack>
  );
}
