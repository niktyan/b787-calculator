/**
 * View-model hook orchestrating Crosswind Landing input → calculation →
 * result panel state.
 *
 * The Landing module is fully categorical: there are no numeric inputs
 * to parse, no Value Objects, no operational envelope, no field-level
 * errors. Every combination of the six toggles is admissible — the only
 * non-`idle` states come from the bundled JSON not shipping data for
 * the requested aircraft or condition (`data-not-available`) or from
 * defence-in-depth `error` paths.
 *
 * Spec: 02_Specification/06-ui-spec.md § "Экран 4b · Crosswind Landing
 *       Calculator", 02_Specification/ADR/0014-landing-module-architecture.md.
 */

import { useMemo } from 'react';
import type { TFunction } from 'i18next';

import { useTranslation } from '../../../core';
import { calculateLandingCrosswind } from '../domain/calculator';
import type { CrosswindLandingInput, CrosswindLandingOutput } from '../domain/types';
import type { CrosswindLandingDataFile } from '../data/schema';

export type CrosswindLandingUIState =
  | { readonly kind: 'idle'; readonly output: CrosswindLandingOutput }
  | { readonly kind: 'data-not-available'; readonly description: string }
  | { readonly kind: 'error'; readonly headline: string; readonly description?: string };

export interface UseCrosswindLandingCalculatorArgs {
  readonly inputs: CrosswindLandingInput;
  readonly data: CrosswindLandingDataFile;
}

export interface UseCrosswindLandingCalculatorResult {
  readonly state: CrosswindLandingUIState;
}

function describeUnavailable(
  reason: 'aircraft-not-implemented' | 'condition-not-implemented' | 'mode-not-implemented',
  t: TFunction,
): string {
  switch (reason) {
    case 'aircraft-not-implemented':
      return t('crosswind-landing.errorDataAircraft');
    case 'condition-not-implemented':
      return t('crosswind-landing.errorDataCondition');
    case 'mode-not-implemented':
      return t('crosswind-landing.errorDataMode');
  }
}

export function useCrosswindLandingCalculator(
  args: UseCrosswindLandingCalculatorArgs,
): UseCrosswindLandingCalculatorResult {
  const { inputs, data } = args;
  const { t } = useTranslation();
  return useMemo(() => {
    const calc = calculateLandingCrosswind(inputs, data);
    if (calc.ok) {
      return { state: { kind: 'idle', output: calc.value } };
    }
    if (calc.error.kind === 'DataNotAvailable') {
      return {
        state: {
          kind: 'data-not-available',
          description: describeUnavailable(calc.error.reason, t),
        },
      };
    }
    return {
      state: {
        kind: 'error',
        headline: t('crosswind-landing.errorHeadline'),
        description: t('crosswind-landing.errorVerifyInputs'),
      },
    };
  }, [inputs, data, t]);
}
