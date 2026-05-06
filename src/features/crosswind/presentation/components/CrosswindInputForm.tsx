import type { ReactNode } from 'react';

import { useTranslation } from '../../../../core';
import { NumericInput, SegmentedControl, Stack, Text } from '../../../../design-system';
import type {
  NumericInputSize,
  SegmentedControlOption,
  SegmentedControlSize,
} from '../../../../design-system';
import type { AircraftVariant, RunwayCondition } from '../../domain/types';

export interface CrosswindInputFormProps {
  readonly weightText: string;
  readonly cgText: string;
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: RunwayCondition;
  readonly weightError: string | null;
  readonly cgError: string | null;
  readonly onWeightChange: (text: string) => void;
  readonly onCGChange: (text: string) => void;
  readonly onAircraftChange: (next: AircraftVariant) => void;
  readonly onRunwayConditionChange: (next: RunwayCondition) => void;
  /**
   * `true` on iPad-regular landscape: bigger inputs, full-vertical-height
   * column (justifyContent space-between), single-row segmented controls.
   * `false` on iPhone / iPad portrait: compact inputs, runway-condition
   * segmented wraps to 2 rows of 3.
   */
  readonly isRegular?: boolean;
  readonly testID?: string | undefined;
}

const AIRCRAFT_OPTIONS: readonly SegmentedControlOption<AircraftVariant>[] = [
  { value: 'b787_8', label: 'B787-8' },
  { value: 'b787_9', label: 'B787-9', disabled: true },
];

const RUNWAY_OPTIONS: readonly SegmentedControlOption<RunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'good', label: 'Good', disabled: true },
  { value: 'mediumToGood', label: 'Medium to Good', disabled: true },
  { value: 'medium', label: 'Medium', disabled: true },
  { value: 'mediumToPoor', label: 'Medium to Poor', disabled: true },
  { value: 'poor', label: 'Poor', disabled: true },
];

export function CrosswindInputForm(props: CrosswindInputFormProps): ReactNode {
  const {
    weightText,
    cgText,
    aircraft,
    runwayCondition,
    weightError,
    cgError,
    onWeightChange,
    onCGChange,
    onAircraftChange,
    onRunwayConditionChange,
    isRegular = false,
    testID,
  } = props;
  const { t } = useTranslation();

  const inputSize: NumericInputSize = isRegular ? 'regular' : 'compact';
  const segmentedSize: SegmentedControlSize = isRegular ? 'regular' : 'compact';
  const stackGap = isRegular ? 'xl' : 'lg';
  const stackJustify = isRegular ? 'space-between' : 'flex-start';
  const stackStyle = isRegular ? { flex: 1 } : undefined;

  return (
    <Stack
      gap={stackGap}
      justify={stackJustify}
      style={stackStyle}
      {...(testID === undefined ? {} : { testID })}
    >
      <Stack gap="xs">
        <Text variant="label" color="textSecondary">
          {t('crosswind.aircraftLabel')}
        </Text>
        <SegmentedControl<AircraftVariant>
          value={aircraft}
          options={AIRCRAFT_OPTIONS}
          onChange={onAircraftChange}
          size={segmentedSize}
          accessibilityLabel={t('crosswind.aircraftLabel')}
          testID="crosswind-aircraft"
        />
      </Stack>
      <NumericInput
        label={t('crosswind.towActual')}
        value={weightText}
        onChange={onWeightChange}
        placeholder="e.g. 170"
        unit="t"
        size={inputSize}
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
        size={inputSize}
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
          size={segmentedSize}
          wrap={!isRegular}
          accessibilityLabel={t('crosswind.runwayConditionLabel')}
          testID="crosswind-runway"
        />
      </Stack>
    </Stack>
  );
}
