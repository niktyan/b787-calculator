/**
 * View-model hook orchestrating Crosswind input → calculation → result.
 *
 * Flow:
 *   1. Parse string inputs to numbers (UI-level format check).
 *   2. Build Value Objects via factories.
 *   3. Run `validateWeightEnvelope` AND `validateCGEnvelope` independently
 *      (use-case layer). Both can fail simultaneously and the UI surfaces
 *      both field errors at once — see 04-domain-model.md § "Independent
 *      weight + cg validation".
 *   4. Run `calculateCrosswindLimit` regardless of operational result —
 *      the algorithm covers the lookup envelope; the validators drive
 *      the warning chip alongside the number.
 *   5. Resolve UI state: empty / idle (+optional warning) / out-of-envelope
 *      / data-not-available / error.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4.
 */

import { useMemo } from 'react';
import type { TFunction } from 'i18next';

import { useTranslation } from '../../../core';
import { isOk } from '../../../core/result';
import { calculateCrosswindLimit } from '../domain/calculator';
import type {
  AircraftVariant,
  CGPercentMAC,
  CGViolation,
  CrosswindCalculationOutput,
  EnvelopeViolation,
  RunwayCondition,
  WeightInTons,
  WeightViolation,
} from '../domain/types';
import { validateCGEnvelope, validateWeightEnvelope } from '../domain/validators';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { CrosswindDataFile } from '../data/schema';

export type CrosswindUIState =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'idle';
      readonly output: CrosswindCalculationOutput;
      readonly warning: EnvelopeViolation | null;
    }
  | { readonly kind: 'out-of-envelope'; readonly reason: string }
  | { readonly kind: 'data-not-available'; readonly description: string }
  | { readonly kind: 'error'; readonly headline: string; readonly description?: string };

export interface CrosswindCalculatorInputs {
  readonly weightText: string;
  readonly cgText: string;
  readonly aircraft: AircraftVariant;
  readonly runwayCondition: RunwayCondition;
}

export interface UseCrosswindCalculatorArgs {
  readonly inputs: CrosswindCalculatorInputs;
  readonly data: CrosswindDataFile;
}

export interface UseCrosswindCalculatorResult {
  readonly state: CrosswindUIState;
  readonly weightFieldError: string | null;
  readonly cgFieldError: string | null;
}

interface FieldErrors {
  readonly weight: string | null;
  readonly cg: string | null;
}

type Translator = TFunction;

function parseFloatStrict(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const normalized = trimmed.replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

function weightErrorMessage(violation: WeightViolation, t: Translator): string {
  switch (violation.kind) {
    case 'weight.below':
      return t('crosswind.weightBelowMin', { minTons: violation.minTons });
    case 'weight.above':
      return t('crosswind.weightAboveMax', { maxTons: violation.maxTons });
  }
}

function cgErrorMessage(violation: CGViolation, t: Translator): string {
  switch (violation.kind) {
    case 'cg.below':
      return t('crosswind.cgBelowMin', { minPercent: violation.minPercent });
    case 'cg.above':
      return t('crosswind.cgAboveMax', { maxPercent: violation.maxPercent });
  }
}

function composeFieldErrors(
  weightViolation: WeightViolation | null,
  cgViolation: CGViolation | null,
  t: Translator,
): FieldErrors {
  return {
    weight: weightViolation === null ? null : weightErrorMessage(weightViolation, t),
    cg: cgViolation === null ? null : cgErrorMessage(cgViolation, t),
  };
}

interface ParsedInputs {
  readonly weight: WeightInTons;
  readonly cg: CGPercentMAC;
}

function parseInputs(
  inputs: CrosswindCalculatorInputs,
  t: Translator,
): ParsedInputs | UseCrosswindCalculatorResult {
  const weightNum = parseFloatStrict(inputs.weightText);
  const cgNum = parseFloatStrict(inputs.cgText);
  if (weightNum === null || cgNum === null) {
    return { state: { kind: 'empty' }, weightFieldError: null, cgFieldError: null };
  }
  const weightVO = makeWeightInTons(weightNum);
  if (!weightVO.ok) {
    const invalidWeight = t('crosswind.errorInvalidWeight');
    return {
      state: { kind: 'error', headline: t('crosswind.errorHeadline'), description: invalidWeight },
      weightFieldError: invalidWeight,
      cgFieldError: null,
    };
  }
  const cgVO = makeCGPercentMAC(cgNum);
  if (!cgVO.ok) {
    const invalidCg = t('crosswind.errorInvalidCg');
    return {
      state: { kind: 'error', headline: t('crosswind.errorHeadline'), description: invalidCg },
      weightFieldError: null,
      cgFieldError: invalidCg,
    };
  }
  return { weight: weightVO.value, cg: cgVO.value };
}

function isParsedInputs(x: ParsedInputs | UseCrosswindCalculatorResult): x is ParsedInputs {
  return 'weight' in x;
}

function describeUnavailable(
  reason: 'aircraft-not-implemented' | 'condition-not-implemented' | 'phase-mismatch',
  t: Translator,
): string {
  switch (reason) {
    case 'aircraft-not-implemented':
      return t('crosswind.errorDataAircraft');
    case 'condition-not-implemented':
      return t('crosswind.errorDataCondition');
    case 'phase-mismatch':
      return t('crosswind.errorPhaseMismatch');
  }
}

function compute(
  parsed: ParsedInputs,
  inputs: CrosswindCalculatorInputs,
  data: CrosswindDataFile,
  t: Translator,
): UseCrosswindCalculatorResult {
  const weightCheck = validateWeightEnvelope(
    { weightTons: parsed.weight },
    data.operationalEnvelope.weight,
  );
  const cgCheck = validateCGEnvelope({ cgPercent: parsed.cg }, data.operationalEnvelope.cg);
  const weightViolation = isOk(weightCheck) ? null : weightCheck.error;
  const cgViolation = isOk(cgCheck) ? null : cgCheck.error;
  const fieldErrors = composeFieldErrors(weightViolation, cgViolation, t);

  // `warning` for the result-panel chip = first non-null violation. PR A3
  // will replace the chip with a different behaviour (hide the number when
  // out of envelope); for A2 we preserve the existing idle+chip flow to
  // keep the bug-fix scope tight.
  const warning: EnvelopeViolation | null = weightViolation ?? cgViolation;

  const calc = calculateCrosswindLimit(
    {
      weightTons: parsed.weight,
      cgPercent: parsed.cg,
      aircraft: inputs.aircraft,
      phase: data.phase,
      runwayCondition: inputs.runwayCondition,
    },
    data,
  );

  if (calc.ok) {
    return {
      state: { kind: 'idle', output: calc.value, warning },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }

  if (calc.error.kind === 'NoLookupData') {
    return {
      state: {
        kind: 'out-of-envelope',
        reason: t('crosswind.errorOutOfLookup'),
      },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }
  if (calc.error.kind === 'DataNotAvailable') {
    return {
      state: {
        kind: 'data-not-available',
        description: describeUnavailable(calc.error.reason, t),
      },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }
  return {
    state: {
      kind: 'error',
      headline: t('crosswind.errorHeadline'),
      description: t('crosswind.errorVerifyInputs'),
    },
    weightFieldError: fieldErrors.weight,
    cgFieldError: fieldErrors.cg,
  };
}

export function useCrosswindCalculator(
  args: UseCrosswindCalculatorArgs,
): UseCrosswindCalculatorResult {
  const { inputs, data } = args;
  const { t } = useTranslation();
  return useMemo(() => {
    const parsed = parseInputs(inputs, t);
    if (!isParsedInputs(parsed)) {
      return parsed;
    }
    return compute(parsed, inputs, data, t);
  }, [inputs, data, t]);
}
