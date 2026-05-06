import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

import { useTranslation } from '../../../../core';
import { NumericInput, SegmentedControl, Stack, Text } from '../../../../design-system';
import type {
  NumericInputSize,
  SegmentedControlOption,
  SegmentedControlSize,
  SpacingToken,
  TextVariant,
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

const REGULAR_SECTION_LABEL_FONT_WEIGHT = '600';
const REGULAR_SECTION_LABEL_LETTER_SPACING = 1;
const REGULAR_SECTION_LABEL_STYLE: TextStyle = {
  fontWeight: REGULAR_SECTION_LABEL_FONT_WEIGHT,
  letterSpacing: REGULAR_SECTION_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};

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

interface FormSizing {
  readonly inputSize: NumericInputSize;
  readonly segmentedSize: SegmentedControlSize;
  readonly stackGap: SpacingToken;
  readonly stackJustify: 'space-between' | 'flex-start';
  readonly stackStyle: { readonly flex: number } | undefined;
  readonly sectionLabelGap: SpacingToken;
  readonly sectionLabelVariant: TextVariant;
  readonly sectionLabelStyle: TextStyle | undefined;
  readonly runwayWrap: boolean;
}

function resolveSizing(isRegular: boolean): FormSizing {
  if (isRegular) {
    return {
      inputSize: 'regular',
      segmentedSize: 'regular',
      stackGap: 'xl',
      stackJustify: 'space-between',
      stackStyle: { flex: 1 },
      sectionLabelGap: 'md',
      sectionLabelVariant: 'body',
      sectionLabelStyle: REGULAR_SECTION_LABEL_STYLE,
      runwayWrap: false,
    };
  }
  return {
    inputSize: 'compact',
    segmentedSize: 'compact',
    stackGap: 'lg',
    stackJustify: 'flex-start',
    stackStyle: undefined,
    sectionLabelGap: 'xs',
    sectionLabelVariant: 'label',
    sectionLabelStyle: undefined,
    runwayWrap: true,
  };
}

interface SectionLabelProps {
  readonly text: string;
  readonly sizing: FormSizing;
}

function SectionLabel({ text, sizing }: SectionLabelProps): ReactNode {
  return (
    <Text
      variant={sizing.sectionLabelVariant}
      color="textSecondary"
      style={sizing.sectionLabelStyle}
    >
      {text}
    </Text>
  );
}

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
  const sizing = resolveSizing(isRegular);

  return (
    <Stack
      gap={sizing.stackGap}
      justify={sizing.stackJustify}
      style={sizing.stackStyle}
      {...(testID === undefined ? {} : { testID })}
    >
      <Stack gap={sizing.sectionLabelGap}>
        <SectionLabel text={t('crosswind.aircraftLabel')} sizing={sizing} />
        <SegmentedControl<AircraftVariant>
          value={aircraft}
          options={AIRCRAFT_OPTIONS}
          onChange={onAircraftChange}
          size={sizing.segmentedSize}
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
        size={sizing.inputSize}
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
        size={sizing.inputSize}
        {...(cgError === null ? {} : { error: cgError })}
        testID="crosswind-cg"
      />
      <Stack gap={sizing.sectionLabelGap}>
        <SectionLabel text={t('crosswind.runwayConditionLabel')} sizing={sizing} />
        <SegmentedControl<RunwayCondition>
          value={runwayCondition}
          options={RUNWAY_OPTIONS}
          onChange={onRunwayConditionChange}
          size={sizing.segmentedSize}
          wrap={sizing.runwayWrap}
          accessibilityLabel={t('crosswind.runwayConditionLabel')}
          testID="crosswind-runway"
        />
      </Stack>
    </Stack>
  );
}
