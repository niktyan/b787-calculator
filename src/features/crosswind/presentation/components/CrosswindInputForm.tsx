import { useMemo } from 'react';
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

  // Polish-3: 6 explicit FCOM runway-condition codes (см.
  // 04-domain-model.md § RunwayCondition). Only `dry` is active in MVP;
  // the other 5 are disabled until lookup data is added in a future
  // sprint. Aviation terms ("Dry", "Wet", "Slippery Wet",
  // "Compacted Snow", "Dry Snow", "Wet Snow") are not localized
  // per CLAUDE.md Rule 9 — t() resolves to identical English strings
  // in both en/ru locales.
  const runwayOptions = useMemo<readonly SegmentedControlOption<RunwayCondition>[]>(
    () => [
      { value: 'dry', label: t('crosswind.runway.dry') },
      { value: 'wet', label: t('crosswind.runway.wet'), disabled: true },
      { value: 'slipperyWet', label: t('crosswind.runway.slipperyWet'), disabled: true },
      { value: 'compactedSnow', label: t('crosswind.runway.compactedSnow'), disabled: true },
      { value: 'drySnow', label: t('crosswind.runway.drySnow'), disabled: true },
      { value: 'wetSnow', label: t('crosswind.runway.wetSnow'), disabled: true },
    ],
    [t],
  );

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
          options={runwayOptions}
          onChange={onRunwayConditionChange}
          accessibilityLabel={t('crosswind.runwayConditionLabel')}
          testID="crosswind-runway"
        />
      </Stack>
    </Stack>
  );
}
