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

/**
 * Outcome of parsing a single field's text into a Value Object. Each
 * branch is meaningful to the caller and surfaces a distinct UI signal:
 *  - `empty`   — pilot has not entered anything yet; never an error.
 *  - `invalid` — text is present but cannot become a Value Object
 *                (format failure or VO factory rejection). Carries the
 *                localized message to render under the field.
 *  - `parsed`  — Value Object successfully built; can flow to validators.
 */
type FieldParseResult<T> =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'parsed'; readonly value: T };

function parseDecimalString(text: string): number | null {
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

function parseWeightField(text: string, t: Translator): FieldParseResult<WeightInTons> {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }
  const num = parseDecimalString(text);
  if (num === null) {
    return { kind: 'invalid', message: t('crosswind.errorInvalidWeight') };
  }
  const vo = makeWeightInTons(num);
  if (!vo.ok) {
    return { kind: 'invalid', message: t('crosswind.errorInvalidWeight') };
  }
  return { kind: 'parsed', value: vo.value };
}

function parseCGField(text: string, t: Translator): FieldParseResult<CGPercentMAC> {
  if (text.trim().length === 0) {
    return { kind: 'empty' };
  }
  const num = parseDecimalString(text);
  if (num === null) {
    return { kind: 'invalid', message: t('crosswind.errorInvalidCg') };
  }
  const vo = makeCGPercentMAC(num);
  if (!vo.ok) {
    return { kind: 'invalid', message: t('crosswind.errorInvalidCg') };
  }
  return { kind: 'parsed', value: vo.value };
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
  const weight = parseWeightField(inputs.weightText, t);
  const cg = parseCGField(inputs.cgText, t);
  if (weight.kind === 'empty' || cg.kind === 'empty') {
    return { state: { kind: 'empty' }, weightFieldError: null, cgFieldError: null };
  }
  if (weight.kind === 'invalid') {
    return {
      state: {
        kind: 'error',
        headline: t('crosswind.errorHeadline'),
        description: weight.message,
      },
      weightFieldError: weight.message,
      cgFieldError: null,
    };
  }
  if (cg.kind === 'invalid') {
    return {
      state: {
        kind: 'error',
        headline: t('crosswind.errorHeadline'),
        description: cg.message,
      },
      weightFieldError: null,
      cgFieldError: cg.message,
    };
  }
  return { weight: weight.value, cg: cg.value };
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
