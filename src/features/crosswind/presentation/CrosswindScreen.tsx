/**
 * Crosswind Calculator screen — Sprint 5 main UI.
 *
 * Spec: 02_Specification/06-ui-spec.md § "Экран 4 · Crosswind Calculator".
 *
 * Layout:
 *   • iPad landscape (≥ 1024 pt): 2 columns (input | result).
 *   • iPad portrait / iPhone: stacked vertically.
 *
 * Reset button clears both numeric fields and returns runway to Dry —
 * no confirmation dialog.
 *
 * Live recalculation: the view-model hook recomputes on every keystroke
 * once both fields hold finite numbers.
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { useTheme, useTranslation } from '../../../core';
import { useHapticFeedback } from '../../../core/haptics';
import {
  ErrorState,
  KeyboardDismissView,
  Row,
  Screen,
  Stack,
  Text,
  tokens,
} from '../../../design-system';
import { createCrosswindRepository } from '../data';
import type { CrosswindDataFile } from '../data/schema';
import type { AircraftVariant, RunwayCondition } from '../domain/types';

import { CrosswindInputForm } from './components/CrosswindInputForm';
import { CrosswindResult } from './components/CrosswindResult';
import { useCrosswindCalculator } from './useCrosswindCalculator';

const COLUMN_BASIS = '48%';
const TWO_COLUMN_BREAKPOINT = tokens.breakpoints.regular;
const REGULAR_BREAKPOINT = tokens.breakpoints.regularHeader;
const HEADER_DIVIDER_HEIGHT = 1;
const PILL_PRESSED_OPACITY = 0.6;
const DEFAULT_AIRCRAFT: AircraftVariant = 'b787_8';

const repository = createCrosswindRepository();

export function CrosswindScreen(): ReactNode {
  const repoResult = repository.load();
  if (!repoResult.ok) {
    return <CrosswindUnavailable details={repoResult.error.details} />;
  }
  return <CrosswindScreenLoaded data={repoResult.value} />;
}

interface ScreenLoadedProps {
  readonly data: CrosswindDataFile;
}

function CrosswindScreenLoaded({ data }: ScreenLoadedProps): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHapticFeedback();
  const { width } = useWindowDimensions();
  // Two independent breakpoints:
  //   - isRegular (>= 768pt): drives bumped typography / input sizing.
  //     Active on iPad portrait + landscape; iPhone always compact.
  //   - isTwoColumn (>= 1024pt): drives the 2-column horizontal layout
  //     and the result Card's `flex: 1` height-fill. Active only on
  //     iPad landscape.
  const isRegular = width >= REGULAR_BREAKPOINT;
  const isTwoColumn = width >= TWO_COLUMN_BREAKPOINT;

  const [weightText, setWeightText] = useState('');
  const [cgText, setCgText] = useState('');
  const [aircraft, setAircraft] = useState<AircraftVariant>(DEFAULT_AIRCRAFT);
  const [runwayCondition, setRunwayCondition] = useState<RunwayCondition>('dry');

  const inputs = useMemo(
    () => ({ weightText, cgText, aircraft, runwayCondition }),
    [weightText, cgText, aircraft, runwayCondition],
  );
  const { state, weightFieldError, cgFieldError } = useCrosswindCalculator({ inputs, data });

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);
  const handleReset = useCallback((): void => {
    haptics.mediumImpact();
    setWeightText('');
    setCgText('');
    setAircraft(DEFAULT_AIRCRAFT);
    setRunwayCondition('dry');
  }, [haptics]);

  const inputForm = (
    <CrosswindInputForm
      weightText={weightText}
      cgText={cgText}
      aircraft={aircraft}
      runwayCondition={runwayCondition}
      weightError={weightFieldError}
      cgError={cgFieldError}
      onWeightChange={setWeightText}
      onCGChange={setCgText}
      onAircraftChange={setAircraft}
      onRunwayConditionChange={setRunwayCondition}
      isRegular={isRegular}
      testID="crosswind-input-form"
    />
  );
  const resultPanel = (
    <CrosswindResult
      state={state}
      isRegular={isRegular}
      fillHeight={isTwoColumn}
      testID="crosswind-result"
    />
  );

  return (
    <Screen testID="crosswind-screen">
      <KeyboardDismissView testID="crosswind-keyboard-dismiss">
        <Stack gap="lg" style={styles.fillHeight}>
          <CrosswindHeader
            title={t('crosswind.title')}
            backLabel={`← ${t('common.back')}`}
            resetLabel={t('crosswind.resetLabel')}
            onBack={handleBack}
            onReset={handleReset}
            isRegular={isRegular}
          />
          {isTwoColumn ? (
            <Row align="stretch" gap="lg" style={styles.fillHeight}>
              <View style={styles.column}>{inputForm}</View>
              <View style={styles.column}>{resultPanel}</View>
            </Row>
          ) : (
            <Stack gap="lg" style={isRegular ? styles.fillHeight : undefined}>
              {inputForm}
              {resultPanel}
            </Stack>
          )}
        </Stack>
      </KeyboardDismissView>
    </Screen>
  );
}

interface CrosswindHeaderProps {
  readonly title: string;
  readonly backLabel: string;
  readonly resetLabel: string;
  readonly onBack: () => void;
  readonly onReset: () => void;
  readonly isRegular: boolean;
}

function CrosswindHeader(props: CrosswindHeaderProps): ReactNode {
  const { title, backLabel, resetLabel, onBack, onReset, isRegular } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  // Match the other screen headers (Main Menu / Settings / About) — they
  // switch to tokens.sizing.header.regular at the same 768pt threshold.
  // Hardcoding `compact` here made the Back + Reset pills visibly smaller
  // than the NavPills on sibling screens (см. Polish-Round-2 Block 3a).
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

  const dividerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: palette.border,
      height: HEADER_DIVIDER_HEIGHT,
    }),
    [palette.border],
  );
  const logoStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: sizing.logoRadius,
      height: sizing.logoSize,
      justifyContent: 'center',
      width: sizing.logoSize,
    }),
    [palette.accentSoft, sizing.logoRadius, sizing.logoSize],
  );
  const titleStyle = useMemo<TextStyle>(() => ({ fontSize: sizing.titleSize }), [sizing.titleSize]);

  return (
    <Stack gap="md">
      <Row align="center" justify="space-between">
        <Row align="center" gap="sm">
          <View accessibilityLabel="B787 logo" style={logoStyle} testID="crosswind-logo">
            <Text variant="mono" color="accent">
              B7
            </Text>
          </View>
          <Text variant="body" style={titleStyle}>
            {title}
          </Text>
        </Row>
        <Row align="center" gap="xs">
          <HeaderPill label={backLabel} onPress={onBack} sizing={sizing} testID="crosswind-back" />
          <HeaderPill
            label={resetLabel}
            onPress={onReset}
            sizing={sizing}
            testID="crosswind-reset"
          />
        </Row>
      </Row>
      <View style={dividerStyle} />
    </Stack>
  );
}

type HeaderSizingBundle = typeof tokens.sizing.header.compact | typeof tokens.sizing.header.regular;

interface HeaderPillProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly sizing: HeaderSizingBundle;
  readonly testID: string;
}

function HeaderPill(props: HeaderPillProps): ReactNode {
  const { label, onPress, sizing, testID } = props;
  const pillStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      borderRadius: sizing.pillRadius,
      justifyContent: 'center',
      minHeight: tokens.layout.minTouchTarget,
      paddingHorizontal: sizing.pillPaddingH,
      paddingVertical: sizing.pillPaddingV,
    }),
    [sizing.pillPaddingH, sizing.pillPaddingV, sizing.pillRadius],
  );
  const labelStyle = useMemo<TextStyle>(
    () => ({ fontSize: sizing.pillLabelSize }),
    [sizing.pillLabelSize],
  );
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={tokens.spacing.sm}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [pillStyle, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <Text variant="caption" color="textSecondary" style={labelStyle}>
        {label}
      </Text>
    </Pressable>
  );
}

interface UnavailableProps {
  readonly details: string;
}

function CrosswindUnavailable({ details }: UnavailableProps): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen testID="crosswind-screen-error">
      <ErrorState title={t('error.referenceDataUnavailable')} description={details} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: {
    flexBasis: COLUMN_BASIS,
    flexGrow: 1,
  },
  fillHeight: {
    flex: 1,
  },
  pressed: {
    opacity: PILL_PRESSED_OPACITY,
  },
});
