/**
 * One row in the Recent Calculations list.
 *
 * Layout (left → right):
 *   - Module badge (Takeoff / Landing — aviation term, not localised).
 *   - Inputs summary: aircraft · runway · key inputs.
 *   - Relative timestamp ("5 minutes ago") via date-fns.
 *   - Result value (large monospace number, right-aligned).
 *
 * Landing-input projection rule (per ADR-0016): show only the inputs
 * that influenced the result —
 *   - landing mode = manual → asymReverse only.
 *   - landing mode = auto   → asymReverse + catIIIII + engineInop.
 *
 * Aircraft / runway / landing-mode labels are aviation terms and
 * remain English in both locales (consistent with module contracts).
 */

import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTranslation } from '../../../../core';
import type {
  RecentEntry,
  RecentLandingEntry,
  RecentTakeoffEntry,
} from '../../../../core/recent-storage';
import { useTheme } from '../../../../core/theming';
import { Row, Stack, Text, tokens } from '../../../../design-system';

const PRESSED_OPACITY = 0.6;
const BADGE_BORDER_WIDTH = 1;
const RESULT_FONT_SIZE = 32;
const RESULT_LINE_HEIGHT = 36;
const RESULT_FONT_WEIGHT = '600';

const AIRCRAFT_LABEL: Readonly<Record<RecentTakeoffEntry['inputs']['aircraft'], string>> = {
  b787_8: 'B787-8',
  b787_9: 'B787-9',
};

const RUNWAY_LABEL: Readonly<Record<RecentTakeoffEntry['inputs']['runwayCondition'], string>> = {
  dry: 'Dry',
  good: 'Good',
  mediumToGood: 'Medium to Good',
  medium: 'Medium',
  mediumToPoor: 'Medium to Poor',
  poor: 'Poor',
};

/**
 * Landing-specific runway-condition labels (ADR-0018). Accepts both the
 * current 7-value taxonomy and the two legacy keys from the Sprint C
 * shape so Recent entries persisted before the v2 schema bump still
 * render — they show with a "(legacy)" suffix so the pilot can see the
 * value comes from the previous vocabulary.
 */
const LANDING_RUNWAY_LABEL: Readonly<
  Record<RecentLandingEntry['inputs']['runwayCondition'], string>
> = {
  dry: 'Dry',
  goodWetDamp: 'Good (Wet, Damp)',
  goodSlushSnow: 'Good (Slush, Dry Snow, Wet Snow)',
  goodToMedium: 'Good to Medium',
  medium: 'Medium',
  mediumToPoor: 'Medium to Poor',
  poor: 'Poor',
  good: 'Good (legacy)',
  mediumToGood: 'Medium to Good (legacy)',
};

export interface RecentListItemProps {
  readonly entry: RecentEntry;
  readonly onPress: (entry: RecentEntry) => void;
  readonly testID?: string;
}

export function RecentListItem({ entry, onPress, testID }: RecentListItemProps): ReactNode {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const palette = tokens.colors[theme.resolved];

  const rootStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      minHeight: tokens.layout.minTouchTarget,
      padding: tokens.spacing.md,
    }),
    [palette.bgCard, palette.border],
  );
  const pressedStyle = useMemo<ViewStyle>(() => ({ opacity: PRESSED_OPACITY }), []);
  const badgeStyle = useMemo<ViewStyle>(
    () => ({
      borderColor: palette.accent,
      borderRadius: tokens.radii.sm,
      borderWidth: BADGE_BORDER_WIDTH,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
    }),
    [palette.accent],
  );
  const leftColumnStyle = useMemo<ViewStyle>(() => ({ flex: 1 }), []);
  const resultStyle = useMemo<TextStyle>(
    () => ({
      fontSize: RESULT_FONT_SIZE,
      fontWeight: RESULT_FONT_WEIGHT,
      lineHeight: RESULT_LINE_HEIGHT,
    }),
    [],
  );

  const moduleLabel =
    entry.module === 'takeoff'
      ? t('recent.moduleIndicator.takeoff')
      : t('recent.moduleIndicator.landing');
  const inputsLine =
    entry.module === 'takeoff' ? renderTakeoffInputs(entry) : renderLandingInputs(entry, t);
  const timeLabel = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });

  return (
    <Pressable
      accessibilityLabel={`${moduleLabel} · ${inputsLine} · ${entry.result} KT`}
      accessibilityRole="button"
      onPress={(): void => onPress(entry)}
      style={({ pressed }): ViewStyle[] => (pressed ? [rootStyle, pressedStyle] : [rootStyle])}
      testID={testID}
    >
      <Row align="center" justify="space-between" gap="md">
        <Stack gap="xs" style={leftColumnStyle}>
          <Row align="center" gap="sm">
            <View style={badgeStyle} testID={testID === undefined ? undefined : `${testID}-badge`}>
              <Text variant="caption" color="accentText">
                {moduleLabel}
              </Text>
            </View>
            <Text variant="caption" color="textTertiary">
              {timeLabel}
            </Text>
          </Row>
          <Text variant="body" color="textPrimary">
            {inputsLine}
          </Text>
        </Stack>
        <Stack gap="xs" align="flex-end">
          <Text variant="mono" color="accent" style={resultStyle}>
            {entry.result}
          </Text>
          <Text variant="caption" color="textTertiary">
            KT
          </Text>
        </Stack>
      </Row>
    </Pressable>
  );
}

function renderTakeoffInputs(entry: RecentTakeoffEntry): string {
  const { aircraft, weightTons, cgPercent, runwayCondition } = entry.inputs;
  return `${AIRCRAFT_LABEL[aircraft]} · ${formatNumber(weightTons)} t · ${formatNumber(cgPercent)} %MAC · ${RUNWAY_LABEL[runwayCondition]}`;
}

function renderLandingInputs(entry: RecentLandingEntry, t: (key: string) => string): string {
  const { aircraft, runwayCondition, landingMode, asymReverse, catIIIII, engineInop } =
    entry.inputs;
  const parts: string[] = [
    AIRCRAFT_LABEL[aircraft],
    LANDING_RUNWAY_LABEL[runwayCondition],
    landingMode === 'auto' ? 'Autoland' : 'Manual',
  ];
  parts.push(`Asym ${asymReverse === 'yes' ? t('recent.yes') : t('recent.no')}`);
  if (landingMode === 'auto') {
    parts.push(`CAT II-III ${catIIIII === 'yes' ? t('recent.yes') : t('recent.no')}`);
    parts.push(`ENG INOP ${engineInop === 'yes' ? t('recent.yes') : t('recent.no')}`);
  }
  return parts.join(' · ');
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
