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
import type { RunwayCondition } from '../domain/types';

import { CrosswindInputForm } from './components/CrosswindInputForm';
import { CrosswindResult } from './components/CrosswindResult';
import { useCrosswindCalculator } from './useCrosswindCalculator';

const COLUMN_BASIS = '48%';
const TWO_COLUMN_BREAKPOINT = tokens.breakpoints.regular;
const HEADER_DIVIDER_HEIGHT = 1;
const PILL_PRESSED_OPACITY = 0.6;

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
  const { width } = useWindowDimensions();
  const isTwoColumn = width >= TWO_COLUMN_BREAKPOINT;
  // The iPad-regular result panel (72 pt value + 36 pt KT + flex-fill
  // height) is only safe inside the 2-column landscape layout: the
  // landscape Row's column View stretches to provide a height
  // container for the panel's flex:1 chain. In single-column mode
  // (iPad portrait, iPhone any orientation) the inner Stack is
  // auto-sized, the flex:1 chain collapses to 0 height, and the
  // result panel disappears (см. PR feat/crosswind-polish-2 fix
  // commit). Tying isRegular to isTwoColumn ensures the regular
  // typography scales up only when there's a column View to host it.
  const isRegular = isTwoColumn;

  const [weightText, setWeightText] = useState('');
  const [cgText, setCgText] = useState('');
  const [runwayCondition, setRunwayCondition] = useState<RunwayCondition>('dry');

  const inputs = useMemo(
    () => ({ weightText, cgText, runwayCondition }),
    [weightText, cgText, runwayCondition],
  );
  const { state, chart, weightFieldError, cgFieldError } = useCrosswindCalculator({
    inputs,
    data,
  });

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);
  const handleReset = useCallback((): void => {
    setWeightText('');
    setCgText('');
    setRunwayCondition('dry');
  }, []);

  const inputForm = (
    <CrosswindInputForm
      weightText={weightText}
      cgText={cgText}
      runwayCondition={runwayCondition}
      weightError={weightFieldError}
      cgError={cgFieldError}
      onWeightChange={setWeightText}
      onCGChange={setCgText}
      onRunwayConditionChange={setRunwayCondition}
      testID="crosswind-input-form"
    />
  );
  const resultPanel = (
    <CrosswindResult state={state} chart={chart} isRegular={isRegular} testID="crosswind-result" />
  );

  return (
    <Screen testID="crosswind-screen">
      <KeyboardDismissView testID="crosswind-keyboard-dismiss">
        <Stack gap="lg">
          <CrosswindHeader
            title={t('crosswind.title')}
            backLabel={`← ${t('common.back')}`}
            resetLabel={t('crosswind.resetLabel')}
            onBack={handleBack}
            onReset={handleReset}
          />
          {isTwoColumn ? (
            <Row align="flex-start" gap="lg">
              <View style={styles.column}>{inputForm}</View>
              <View style={styles.column}>{resultPanel}</View>
            </Row>
          ) : (
            <Stack gap="lg">
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
}

function CrosswindHeader(props: CrosswindHeaderProps): ReactNode {
  const { title, backLabel, resetLabel, onBack, onReset } = props;
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = tokens.sizing.header.compact;

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

interface HeaderPillProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly sizing: typeof tokens.sizing.header.compact;
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
  pressed: {
    opacity: PILL_PRESSED_OPACITY,
  },
});
