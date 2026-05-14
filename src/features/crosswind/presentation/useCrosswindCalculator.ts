/**
 * View-model hook orchestrating Crosswind input → calculation → result.
 *
 * Flow:
 *   1. Parse string inputs to numbers (UI-level format check).
 *   2. Build Value Objects via factories.
 *   3. Run `validateOperationalEnvelope` (use-case layer).
 *   4. Run `calculateCrosswindLimit` regardless of operational result —
 *      the algorithm covers the lookup envelope; the validator drives
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
  CrosswindCalculationOutput,
  EnvelopeViolation,
  RunwayCondition,
  WeightInTons,
} from '../domain/types';
import { validateOperationalEnvelope } from '../domain/validators';
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

const EMPTY_FIELD_ERRORS: FieldErrors = { weight: null, cg: null };

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

function fieldErrorFromViolation(violation: EnvelopeViolation, t: Translator): FieldErrors {
  switch (violation.kind) {
    case 'weight.below':
      return { weight: t('crosswind.weightBelowMin', { minTons: violation.minTons }), cg: null };
    case 'weight.above':
      return { weight: t('crosswind.weightAboveMax', { maxTons: violation.maxTons }), cg: null };
    case 'cg.below':
      return { weight: null, cg: t('crosswind.cgBelowMin', { minPercent: violation.minPercent }) };
    case 'cg.above':
      return { weight: null, cg: t('crosswind.cgAboveMax', { maxPercent: violation.maxPercent }) };
  }
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
  const envelopeCheck = validateOperationalEnvelope(
    { weightTons: parsed.weight, cgPercent: parsed.cg },
    data.operationalEnvelope,
  );
  const violation = isOk(envelopeCheck) ? null : envelopeCheck.error;
  const fieldErrors =
    violation === null ? EMPTY_FIELD_ERRORS : fieldErrorFromViolation(violation, t);

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
      state: { kind: 'idle', output: calc.value, warning: violation },
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
