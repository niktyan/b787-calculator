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

import { useTranslation } from '../../../core';
import { BackButton, ErrorState, Row, Screen, Stack, Text, tokens } from '../../../design-system';
import { createCrosswindRepository } from '../data';
import type { CrosswindDataFile } from '../data/schema';
import type { RunwayCondition } from '../domain/types';

import { CrosswindInputForm } from './components/CrosswindInputForm';
import { CrosswindResult } from './components/CrosswindResult';
import { useCrosswindCalculator } from './useCrosswindCalculator';

const COLUMN_BASIS = '48%';
const TWO_COLUMN_BREAKPOINT = tokens.breakpoints.regular;

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

  const [weightText, setWeightText] = useState('');
  const [cgText, setCgText] = useState('');
  const [runwayCondition, setRunwayCondition] = useState<RunwayCondition>('dry');

  const inputs = useMemo(
    () => ({ weightText, cgText, runwayCondition }),
    [weightText, cgText, runwayCondition],
  );
  const { state, weightFieldError, cgFieldError } = useCrosswindCalculator({ inputs, data });

  const handleBack = useCallback((): void => {
    router.back();
  }, [router]);
  const handleReset = useCallback((): void => {
    setWeightText('');
    setCgText('');
    setRunwayCondition('dry');
  }, []);

  return (
    <Screen testID="crosswind-screen">
      <Stack gap="lg">
        <Row align="center" justify="space-between">
          <BackButton onPress={handleBack} label={t('common.back')} testID="crosswind-back" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('crosswind.resetLabel')}
            hitSlop={tokens.spacing.sm}
            onPress={handleReset}
            style={styles.resetButton}
            testID="crosswind-reset"
          >
            <Text variant="body" color="textSecondary">
              {t('crosswind.resetLabel')}
            </Text>
          </Pressable>
        </Row>
        <Text variant="heading2">{t('crosswind.title')}</Text>
        {isTwoColumn ? (
          <Row align="flex-start" gap="lg">
            <View style={styles.column}>
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
            </View>
            <View style={styles.column}>
              <CrosswindResult state={state} testID="crosswind-result" />
            </View>
          </Row>
        ) : (
          <Stack gap="lg">
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
            <CrosswindResult state={state} testID="crosswind-result" />
          </Stack>
        )}
      </Stack>
    </Screen>
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
  resetButton: {
    minHeight: tokens.layout.minTouchTarget,
    minWidth: tokens.layout.minTouchTarget,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
});
