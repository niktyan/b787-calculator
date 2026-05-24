/**
 * Crosswind Landing screen — Sprint C / ADR-0014.
 *
 * Layout mirrors the Takeoff screen:
 *   • iPad landscape (>= 1024 pt): 2 columns (input form | result panel).
 *   • iPad portrait / iPhone: stacked vertically.
 *
 * Reset button restores the 6-toggle default state — Aircraft = B787-8,
 * Runway = Dry, Landing = Manual, all Yes/No toggles = No.
 *
 * Live recalculation: every toggle change re-runs the categorical lookup
 * through the view-model hook.
 */

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { useTheme, useTranslation } from '../../../core';
import { ErrorState, Row, Screen, Stack, Text, tokens } from '../../../design-system';
import { createCrosswindLandingRepository } from '../data';
import type { CrosswindLandingDataFile } from '../data/schema';

import { CrosswindLandingInputForm } from './components/CrosswindLandingInputForm';
import { CrosswindLandingResult } from './components/CrosswindLandingResult';
import { useAutoScrollOnAutoland } from './useAutoScrollOnAutoland';
import { useCrosswindLandingCalculator } from './useCrosswindLandingCalculator';
import { useLandingScreenState } from './useLandingScreenState';

const COLUMN_BASIS = '48%';
const TWO_COLUMN_BREAKPOINT = tokens.breakpoints.regular;
const REGULAR_BREAKPOINT = tokens.breakpoints.regularHeader;
const HEADER_DIVIDER_HEIGHT = 1;
const PILL_PRESSED_OPACITY = 0.6;

const repository = createCrosswindLandingRepository();

export function CrosswindLandingScreen(): ReactNode {
  const repoResult = repository.load();
  if (!repoResult.ok) {
    return <CrosswindLandingUnavailable details={repoResult.error.details} />;
  }
  return <CrosswindLandingScreenLoaded data={repoResult.value} />;
}

interface ScreenLoadedProps {
  readonly data: CrosswindLandingDataFile;
}

function CrosswindLandingScreenLoaded({ data }: ScreenLoadedProps): ReactNode {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRegular = width >= REGULAR_BREAKPOINT;
  const isTwoColumn = width >= TWO_COLUMN_BREAKPOINT;
  const s = useLandingScreenState();
  const inputs = useMemo(
    () => ({
      aircraft: s.aircraft,
      runwayCondition: s.runwayCondition,
      landingMode: s.landingMode,
      asymReverse: s.asymReverse,
      catIIIII: s.catIIIII,
      engineInop: s.engineInop,
    }),
    [s.aircraft, s.runwayCondition, s.landingMode, s.asymReverse, s.catIIIII, s.engineInop],
  );
  const { state } = useCrosswindLandingCalculator({ inputs, data });
  const scrollViewRef = useRef<ScrollView>(null);
  const onContentSizeChange = useAutoScrollOnAutoland(scrollViewRef, s.landingMode, !isTwoColumn);
  const handleBack = useCallback((): void => router.back(), [router]);

  const inputForm = (
    <CrosswindLandingInputForm
      aircraft={s.aircraft}
      runwayCondition={s.runwayCondition}
      landingMode={s.landingMode}
      asymReverse={s.asymReverse}
      catIIIII={s.catIIIII}
      engineInop={s.engineInop}
      onAircraftChange={s.setAircraft}
      onRunwayConditionChange={s.setRunwayCondition}
      onLandingModeChange={s.setLandingMode}
      onAsymReverseChange={s.setAsymReverse}
      onCatIIIIIChange={s.setCatIIIII}
      onEngineInopChange={s.setEngineInop}
      isRegular={isRegular}
      testID="crosswind-landing-input-form"
    />
  );
  const resultPanel = (
    <CrosswindLandingResult
      state={state}
      isRegular={isRegular}
      fillHeight={isTwoColumn}
      testID="crosswind-landing-result"
    />
  );

  return (
    <Screen testID="crosswind-landing-screen">
      <ScrollView
        ref={scrollViewRef}
        style={styles.fillHeight}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={onContentSizeChange}
        showsVerticalScrollIndicator={false}
        testID="crosswind-landing-scroll"
      >
        <Stack gap="lg" style={styles.fillHeight}>
          <LandingHeader
            title={t('crosswind-landing.title')}
            backLabel={`← ${t('common.back')}`}
            resetLabel={t('crosswind-landing.resetLabel')}
            onBack={handleBack}
            onReset={s.reset}
            isRegular={isRegular}
          />
          <LandingBody
            isTwoColumn={isTwoColumn}
            isRegular={isRegular}
            inputForm={inputForm}
            resultPanel={resultPanel}
          />
        </Stack>
      </ScrollView>
    </Screen>
  );
}

interface LandingBodyProps {
  readonly isTwoColumn: boolean;
  readonly isRegular: boolean;
  readonly inputForm: ReactNode;
  readonly resultPanel: ReactNode;
}

function LandingBody({
  isTwoColumn,
  isRegular,
  inputForm,
  resultPanel,
}: LandingBodyProps): ReactNode {
  if (isTwoColumn) {
    return (
      <Row align="stretch" gap="lg" style={styles.fillHeight}>
        <View style={styles.column}>{inputForm}</View>
        <View style={styles.column}>{resultPanel}</View>
      </Row>
    );
  }
  return (
    <Stack gap="lg" style={isRegular ? styles.fillHeight : undefined}>
      {inputForm}
      {resultPanel}
    </Stack>
  );
}

interface LandingHeaderProps {
  readonly title: string;
  readonly backLabel: string;
  readonly resetLabel: string;
  readonly onBack: () => void;
  readonly onReset: () => void;
  readonly isRegular: boolean;
}

function LandingHeader(props: LandingHeaderProps): ReactNode {
  const { title, backLabel, resetLabel, onBack, onReset, isRegular } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

  const dividerStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.border, height: HEADER_DIVIDER_HEIGHT }),
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
          <View accessibilityLabel="B787 logo" style={logoStyle} testID="crosswind-landing-logo">
            <Text variant="mono" color="accent">
              B7
            </Text>
          </View>
          <Text variant="body" style={titleStyle}>
            {title}
          </Text>
        </Row>
        <Row align="center" gap="xs">
          <HeaderPill
            label={backLabel}
            onPress={onBack}
            sizing={sizing}
            testID="crosswind-landing-back"
          />
          <HeaderPill
            label={resetLabel}
            onPress={onReset}
            sizing={sizing}
            testID="crosswind-landing-reset"
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

function CrosswindLandingUnavailable({ details }: UnavailableProps): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen testID="crosswind-landing-screen-error">
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
  // `flexGrow: 1` lets the inner Stack with `flex: 1` still fill the
  // viewport on iPad landscape so the result Card occupies the full
  // right-column height. Without it ScrollView's content sizes to its
  // intrinsic height and the landscape `fillHeight` chain breaks.
  // `paddingBottom` gives breathing space at the scroll end on portrait /
  // iPhone where content does overflow.
  scrollContent: {
    flexGrow: 1,
    paddingBottom: tokens.spacing.lg,
  },
});
