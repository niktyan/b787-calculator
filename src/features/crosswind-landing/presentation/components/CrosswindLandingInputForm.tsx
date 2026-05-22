/**
 * Crosswind Landing input form — 6 segmented controls.
 *
 * Spec: 02_Specification/06-ui-spec.md § "Экран 4b · Crosswind Landing
 *       Calculator".
 *
 * Conditional UI: CAT II-III and ONE ENG INOP rows render only when
 * `landingMode === 'auto'`. In `manual` they unmount entirely (per
 * ADR-0014: rows do not just disable — they disappear, since their
 * values cannot affect the result in manual). When the user switches
 * back to Autoland the rows reappear with whatever value the parent
 * holds (default `no` / `no`).
 */

import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

import type { AircraftVariant, RunwayCondition } from '../../../../core/aviation';
import { useTranslation } from '../../../../core';
import { SegmentedControl, Stack, Text } from '../../../../design-system';
import type {
  SegmentedControlOption,
  SegmentedControlSize,
  SpacingToken,
  TextVariant,
} from '../../../../design-system';
import type { LandingMode, YesNo } from '../../domain/types';

export interface CrosswindLandingInputFormProps {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: RunwayCondition;
  readonly landingMode: LandingMode;
  readonly asymReverse: YesNo;
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
  readonly onAircraftChange: (next: AircraftVariant) => void;
  readonly onRunwayConditionChange: (next: RunwayCondition) => void;
  readonly onLandingModeChange: (next: LandingMode) => void;
  readonly onAsymReverseChange: (next: YesNo) => void;
  readonly onCatIIIIIChange: (next: YesNo) => void;
  readonly onEngineInopChange: (next: YesNo) => void;
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

// Aviation terms (Manual / Autoland / Asymmetric Reverse Thrust / CAT
// II-III / ONE ENG INOP) are NOT localized — they appear in English in
// both locales per AGENTS.md Rule 9. Only general UI labels (Aircraft,
// Runway condition, Landing, No/Yes) go through i18n.
const AIRCRAFT_OPTIONS: readonly SegmentedControlOption<AircraftVariant>[] = [
  { value: 'b787_8', label: 'B787-8' },
  { value: 'b787_9', label: 'B787-9' },
];

const RUNWAY_OPTIONS: readonly SegmentedControlOption<RunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'good', label: 'Good' },
  { value: 'mediumToGood', label: 'Medium to Good' },
  { value: 'medium', label: 'Medium' },
  { value: 'mediumToPoor', label: 'Medium to Poor' },
  { value: 'poor', label: 'Poor' },
];

const LANDING_MODE_OPTIONS: readonly SegmentedControlOption<LandingMode>[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Autoland' },
];

interface FormSizing {
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

interface YesNoRowProps {
  readonly label: string;
  readonly value: YesNo;
  readonly onChange: (next: YesNo) => void;
  readonly sizing: FormSizing;
  readonly testID: string;
  readonly yesLabel: string;
  readonly noLabel: string;
}

function YesNoRow({
  label,
  value,
  onChange,
  sizing,
  testID,
  yesLabel,
  noLabel,
}: YesNoRowProps): ReactNode {
  const options: readonly SegmentedControlOption<YesNo>[] = [
    { value: 'no', label: noLabel },
    { value: 'yes', label: yesLabel },
  ];
  return (
    <Stack gap={sizing.sectionLabelGap}>
      <SectionLabel text={label} sizing={sizing} />
      <SegmentedControl<YesNo>
        value={value}
        options={options}
        onChange={onChange}
        size={sizing.segmentedSize}
        accessibilityLabel={label}
        testID={testID}
      />
    </Stack>
  );
}

interface TopSectionsProps {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: RunwayCondition;
  readonly landingMode: LandingMode;
  readonly onAircraftChange: (next: AircraftVariant) => void;
  readonly onRunwayConditionChange: (next: RunwayCondition) => void;
  readonly onLandingModeChange: (next: LandingMode) => void;
  readonly sizing: FormSizing;
  readonly t: (key: string) => string;
}

function TopSections(props: TopSectionsProps): ReactNode {
  const {
    aircraft,
    runwayCondition,
    landingMode,
    onAircraftChange,
    onRunwayConditionChange,
    onLandingModeChange,
    sizing,
    t,
  } = props;
  return (
    <>
      <Stack gap={sizing.sectionLabelGap}>
        <SectionLabel text={t('crosswind-landing.aircraftLabel')} sizing={sizing} />
        <SegmentedControl<AircraftVariant>
          value={aircraft}
          options={AIRCRAFT_OPTIONS}
          onChange={onAircraftChange}
          size={sizing.segmentedSize}
          accessibilityLabel={t('crosswind-landing.aircraftLabel')}
          testID="landing-aircraft"
        />
      </Stack>
      <Stack gap={sizing.sectionLabelGap}>
        <SectionLabel text={t('crosswind-landing.runwayConditionLabel')} sizing={sizing} />
        <SegmentedControl<RunwayCondition>
          value={runwayCondition}
          options={RUNWAY_OPTIONS}
          onChange={onRunwayConditionChange}
          size={sizing.segmentedSize}
          wrap={sizing.runwayWrap}
          accessibilityLabel={t('crosswind-landing.runwayConditionLabel')}
          testID="landing-runway"
        />
      </Stack>
      <Stack gap={sizing.sectionLabelGap}>
        <SectionLabel text={t('crosswind-landing.landingModeLabel')} sizing={sizing} />
        <SegmentedControl<LandingMode>
          value={landingMode}
          options={LANDING_MODE_OPTIONS}
          onChange={onLandingModeChange}
          size={sizing.segmentedSize}
          accessibilityLabel={t('crosswind-landing.landingModeLabel')}
          testID="landing-mode"
        />
      </Stack>
    </>
  );
}

interface AutoRowsProps {
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
  readonly onCatIIIIIChange: (next: YesNo) => void;
  readonly onEngineInopChange: (next: YesNo) => void;
  readonly sizing: FormSizing;
  readonly yesLabel: string;
  readonly noLabel: string;
}

function AutoRows(props: AutoRowsProps): ReactNode {
  const { catIIIII, engineInop, onCatIIIIIChange, onEngineInopChange, sizing, yesLabel, noLabel } =
    props;
  return (
    <>
      <YesNoRow
        label="CAT II-III (RVR less 350 m)"
        value={catIIIII}
        onChange={onCatIIIIIChange}
        sizing={sizing}
        testID="landing-cat-iiiii"
        yesLabel={yesLabel}
        noLabel={noLabel}
      />
      <YesNoRow
        label="ONE ENG INOP"
        value={engineInop}
        onChange={onEngineInopChange}
        sizing={sizing}
        testID="landing-engine-inop"
        yesLabel={yesLabel}
        noLabel={noLabel}
      />
    </>
  );
}

export function CrosswindLandingInputForm(props: CrosswindLandingInputFormProps): ReactNode {
  const {
    aircraft,
    runwayCondition,
    landingMode,
    asymReverse,
    catIIIII,
    engineInop,
    onAircraftChange,
    onRunwayConditionChange,
    onLandingModeChange,
    onAsymReverseChange,
    onCatIIIIIChange,
    onEngineInopChange,
    isRegular = false,
    testID,
  } = props;
  const { t } = useTranslation();
  const sizing = resolveSizing(isRegular);
  const yesLabel = t('crosswind-landing.toggleYes');
  const noLabel = t('crosswind-landing.toggleNo');
  const showAutoRows = landingMode === 'auto';

  return (
    <Stack
      gap={sizing.stackGap}
      justify={sizing.stackJustify}
      style={sizing.stackStyle}
      {...(testID === undefined ? {} : { testID })}
    >
      <TopSections
        aircraft={aircraft}
        runwayCondition={runwayCondition}
        landingMode={landingMode}
        onAircraftChange={onAircraftChange}
        onRunwayConditionChange={onRunwayConditionChange}
        onLandingModeChange={onLandingModeChange}
        sizing={sizing}
        t={t}
      />
      <YesNoRow
        label="Asymmetric Reverse Thrust"
        value={asymReverse}
        onChange={onAsymReverseChange}
        sizing={sizing}
        testID="landing-asym-reverse"
        yesLabel={yesLabel}
        noLabel={noLabel}
      />
      {showAutoRows ? (
        <AutoRows
          catIIIII={catIIIII}
          engineInop={engineInop}
          onCatIIIIIChange={onCatIIIIIChange}
          onEngineInopChange={onEngineInopChange}
          sizing={sizing}
          yesLabel={yesLabel}
          noLabel={noLabel}
        />
      ) : null}
    </Stack>
  );
}
