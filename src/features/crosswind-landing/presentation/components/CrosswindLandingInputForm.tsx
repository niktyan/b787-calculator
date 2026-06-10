/**
 * Crosswind Landing input form — static 5-row grid (F3 / ADR-0019).
 *
 * Spec: 02_Specification/06-ui-spec.md § "Экран 4b · Crosswind Landing
 *       Calculator" and ADR-0019 "Static Landing layout".
 *
 * Layout (single column):
 *   Row 1 — Aircraft                       (full width, 2-segment)
 *   Row 2 — Runway condition               (full width, picker)
 *   Row 3 — Asymmetric Reverse Thrust      (full width, 2-segment)
 *   Row 4 — Landing                        (full width, 2-segment)
 *   Row 5 — Reserved Autoland pair (2-col):
 *             CAT II/III (RVR < 350 m) | ONE ENG INOP
 *
 * Iteration on user feedback (F3 v2). The earlier draft put
 * AsymReverse + Landing into a 2-column pair too; on iPhone widths the
 * uppercase labels rendered cramped. Only the CAT/INOP pair — both
 * Autoland-only — sits in the 2-column reserved slot.
 *
 * Reserved-slot behaviour (ADR-0019). Row 5 is mounted at the same
 * layout offset regardless of Landing mode value. In Manual the two
 * cells render as invisible spacers (opacity 0 + accessibility hidden +
 * non-interactive) so the result panel does not shift when the pilot
 * flips Manual ↔ Autoland. The transition is instant — no animation —
 * per the precedent set by ADR-0011 Iteration 3 §2.
 *
 * Why no unmount. The pre-F3 implementation unmounted the CAT/INOP
 * rows in Manual. That made the result panel jump every time the
 * Landing toggle was touched (and required a one-shot auto-scroll
 * hook to chase the new content). Static reserved slots eliminate
 * both the jump and the hook (deleted in F3).
 */

import type { ReactNode } from 'react';

import type { AircraftVariant, LandingRunwayCondition } from '../../../../core/aviation';
import { useTranslation } from '../../../../core';
import {
  Row,
  RunwayConditionPicker,
  SegmentedControl,
  Stack,
  Text,
} from '../../../../design-system';
import type {
  SegmentedControlOption,
  SegmentedControlSize,
  SpacingToken,
  TextVariant,
} from '../../../../design-system';
import type { TextStyle } from 'react-native';
import type { LandingMode, YesNo } from '../../domain/types';

import { ToggleCell } from './ToggleCell';

export interface CrosswindLandingInputFormProps {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: LandingRunwayCondition;
  readonly landingMode: LandingMode;
  readonly asymReverse: YesNo;
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
  readonly onAircraftChange: (next: AircraftVariant) => void;
  readonly onRunwayConditionChange: (next: LandingRunwayCondition) => void;
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
// II/III / ONE ENG INOP) are NOT localized per AGENTS.md Rule 9 — they
// appear in English in both locales. Only Aircraft / Runway condition /
// Landing row labels and the Yes/No segment labels go through i18n.
const AIRCRAFT_OPTIONS: readonly SegmentedControlOption<AircraftVariant>[] = [
  { value: 'b787_8', label: 'B787-8' },
  { value: 'b787_9', label: 'B787-9' },
];

const RUNWAY_OPTIONS: readonly SegmentedControlOption<LandingRunwayCondition>[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'goodWetDamp', label: 'Good (Wet, Damp)' },
  { value: 'goodSlushSnow', label: 'Good (Slush, Dry Snow, Wet Snow)' },
  { value: 'goodToMedium', label: 'Good to Medium' },
  { value: 'medium', label: 'Medium' },
  { value: 'mediumToPoor', label: 'Medium to Poor' },
  { value: 'poor', label: 'Poor' },
];

const LANDING_MODE_OPTIONS: readonly SegmentedControlOption<LandingMode>[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Autoland' },
];

const CAT_LABEL_LINES_COMPACT = 2;
const ASYM_REVERSE_LABEL = 'Asymmetric Reverse Thrust';

interface FormSizing {
  readonly segmentedSize: SegmentedControlSize;
  readonly stackGap: SpacingToken;
  readonly rowGap: SpacingToken;
  readonly stackJustify: 'space-between' | 'flex-start';
  readonly stackStyle: { readonly flex: number } | undefined;
  readonly fullRowLabelGap: SpacingToken;
  readonly fullRowLabelVariant: TextVariant;
  readonly fullRowLabelStyle: TextStyle | undefined;
  readonly cellLabelLines: number | undefined;
}

function resolveSizing(isRegular: boolean): FormSizing {
  if (isRegular) {
    return {
      segmentedSize: 'regular',
      stackGap: 'lg',
      rowGap: 'md',
      stackJustify: 'space-between',
      stackStyle: { flex: 1 },
      fullRowLabelGap: 'md',
      fullRowLabelVariant: 'body',
      fullRowLabelStyle: REGULAR_SECTION_LABEL_STYLE,
      cellLabelLines: undefined,
    };
  }
  return {
    segmentedSize: 'compact',
    // Compact stack gap is `sm` (not `md`) to keep the 5-row form +
    // result panel within the iPhone SE no-scroll budget per
    // ADR-0019 § 7-viewport verification.
    stackGap: 'sm',
    rowGap: 'md',
    stackJustify: 'flex-start',
    stackStyle: undefined,
    fullRowLabelGap: 'xs',
    fullRowLabelVariant: 'label',
    fullRowLabelStyle: undefined,
    cellLabelLines: CAT_LABEL_LINES_COMPACT,
  };
}

interface FullRowSectionProps {
  readonly label: string;
  readonly sizing: FormSizing;
  readonly children: ReactNode;
}

function FullRowSection({ label, sizing, children }: FullRowSectionProps): ReactNode {
  return (
    <Stack gap={sizing.fullRowLabelGap}>
      <Text
        variant={sizing.fullRowLabelVariant}
        color="textSecondary"
        style={sizing.fullRowLabelStyle}
      >
        {label}
      </Text>
      {children}
    </Stack>
  );
}

interface YesNoOptionsArgs {
  readonly yesLabel: string;
  readonly noLabel: string;
}

function yesNoOptions({
  yesLabel,
  noLabel,
}: YesNoOptionsArgs): readonly SegmentedControlOption<YesNo>[] {
  return [
    { value: 'no', label: noLabel },
    { value: 'yes', label: yesLabel },
  ];
}

interface TopRowsProps {
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: LandingRunwayCondition;
  readonly asymReverse: YesNo;
  readonly landingMode: LandingMode;
  readonly onAircraftChange: (next: AircraftVariant) => void;
  readonly onRunwayConditionChange: (next: LandingRunwayCondition) => void;
  readonly onAsymReverseChange: (next: YesNo) => void;
  readonly onLandingModeChange: (next: LandingMode) => void;
  readonly sizing: FormSizing;
  readonly t: (key: string) => string;
  readonly yesNo: readonly SegmentedControlOption<YesNo>[];
}

function TopRows(props: TopRowsProps): ReactNode {
  const {
    aircraft,
    runwayCondition,
    asymReverse,
    landingMode,
    onAircraftChange,
    onRunwayConditionChange,
    onAsymReverseChange,
    onLandingModeChange,
    sizing,
    t,
    yesNo,
  } = props;
  return (
    <>
      <FullRowSection label={t('crosswind-landing.aircraftLabel')} sizing={sizing}>
        <SegmentedControl<AircraftVariant>
          value={aircraft}
          options={AIRCRAFT_OPTIONS}
          onChange={onAircraftChange}
          size={sizing.segmentedSize}
          accessibilityLabel={t('crosswind-landing.aircraftLabel')}
          testID="landing-aircraft"
        />
      </FullRowSection>
      <FullRowSection label={t('crosswind-landing.runwayConditionLabel')} sizing={sizing}>
        <RunwayConditionPicker<LandingRunwayCondition>
          value={runwayCondition}
          options={RUNWAY_OPTIONS}
          onChange={onRunwayConditionChange}
          size={sizing.segmentedSize}
          accessibilityLabel={t('crosswind-landing.runwayConditionLabel')}
          testID="landing-runway"
        />
      </FullRowSection>
      <FullRowSection label={ASYM_REVERSE_LABEL} sizing={sizing}>
        <SegmentedControl<YesNo>
          value={asymReverse}
          options={yesNo}
          onChange={onAsymReverseChange}
          size={sizing.segmentedSize}
          accessibilityLabel={ASYM_REVERSE_LABEL}
          testID="landing-asym-reverse"
        />
      </FullRowSection>
      <FullRowSection label={t('crosswind-landing.landingModeLabel')} sizing={sizing}>
        <SegmentedControl<LandingMode>
          value={landingMode}
          options={LANDING_MODE_OPTIONS}
          onChange={onLandingModeChange}
          size={sizing.segmentedSize}
          accessibilityLabel={t('crosswind-landing.landingModeLabel')}
          testID="landing-mode"
        />
      </FullRowSection>
    </>
  );
}

interface ReservedRowProps {
  readonly catIIIII: YesNo;
  readonly engineInop: YesNo;
  readonly onCatIIIIIChange: (next: YesNo) => void;
  readonly onEngineInopChange: (next: YesNo) => void;
  readonly hidden: boolean;
  readonly sizing: FormSizing;
  readonly yesNo: readonly SegmentedControlOption<YesNo>[];
}

function ReservedRow(props: ReservedRowProps): ReactNode {
  const { catIIIII, engineInop, onCatIIIIIChange, onEngineInopChange, hidden, sizing, yesNo } =
    props;
  return (
    <Row align="stretch" gap={sizing.rowGap} testID="landing-row-reserved">
      <ToggleCell<YesNo>
        label="CAT II/III (RVR < 350 m)"
        value={catIIIII}
        options={yesNo}
        onChange={onCatIIIIIChange}
        size={sizing.segmentedSize}
        hidden={hidden}
        labelNumberOfLines={sizing.cellLabelLines}
        testID="landing-cat-iiiii"
      />
      <ToggleCell<YesNo>
        label="ONE ENG INOP"
        value={engineInop}
        options={yesNo}
        onChange={onEngineInopChange}
        size={sizing.segmentedSize}
        hidden={hidden}
        testID="landing-engine-inop"
      />
    </Row>
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
  const yesNo = yesNoOptions({
    yesLabel: t('crosswind-landing.toggleYes'),
    noLabel: t('crosswind-landing.toggleNo'),
  });
  const reservedHidden = landingMode !== 'auto';

  return (
    <Stack
      gap={sizing.stackGap}
      justify={sizing.stackJustify}
      style={sizing.stackStyle}
      {...(testID === undefined ? {} : { testID })}
    >
      <TopRows
        aircraft={aircraft}
        runwayCondition={runwayCondition}
        asymReverse={asymReverse}
        landingMode={landingMode}
        onAircraftChange={onAircraftChange}
        onRunwayConditionChange={onRunwayConditionChange}
        onAsymReverseChange={onAsymReverseChange}
        onLandingModeChange={onLandingModeChange}
        sizing={sizing}
        t={t}
        yesNo={yesNo}
      />
      <ReservedRow
        catIIIII={catIIIII}
        engineInop={engineInop}
        onCatIIIIIChange={onCatIIIIIChange}
        onEngineInopChange={onEngineInopChange}
        hidden={reservedHidden}
        sizing={sizing}
        yesNo={yesNo}
      />
    </Stack>
  );
}
