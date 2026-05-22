/**
 * View-model hook orchestrating Crosswind input → calculation → result.
 *
 * Flow (per-field independent, safety-first on envelope violation):
 *   1. Parse each text field → `FieldParseResult` (empty / invalid / parsed).
 *   2. For each parsed field run its envelope validator
 *      (`validateWeightEnvelope` / `validateCGEnvelope`) — independent of
 *      the other field's state. Format errors and envelope violations
 *      surface in the corresponding `fieldError` immediately, with no
 *      cross-field gating.
 *   3. If EITHER field is outside the operational envelope, **skip the
 *      calculator entirely** and return `out-of-envelope`. The pilot
 *      never sees a number derived from out-of-spec inputs (ADR-0012).
 *   4. Otherwise run `calculateCrosswindLimit`.
 *   5. Resolve UI state: empty (any field unparsed) / idle (both parsed
 *      AND inside envelope) / out-of-envelope (lookup miss OR operational
 *      violation) / data-not-available / error.
 *
 * Spec:
 *  - ADR-0012 (hide result on operational envelope violation).
 *  - 06-ui-spec.md § Экран 4 (state machine, per-field timing).
 *  - 04-domain-model.md § "Independent weight + cg validation" /
 *    "Composition rule for UI".
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
  OperationalEnvelope,
  RunwayCondition,
  WeightInTons,
  WeightViolation,
} from '../domain/types';
import { validateCGEnvelope, validateWeightEnvelope } from '../domain/validators';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { CrosswindDataFile } from '../data/schema';

export type CrosswindUIState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'idle'; readonly output: CrosswindCalculationOutput }
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

/**
 * Outcome of evaluating a single field end-to-end: parse + envelope
 * validation. `fieldError` is the localized caption that should render
 * under the field (null when the field is empty or fully valid).
 * `envelopeViolation` is the underlying violation object, separated
 * because the result-panel warning chip needs the structured form.
 */
interface FieldOutcome<T, V> {
  readonly parsed: FieldParseResult<T>;
  readonly envelopeViolation: V | null;
  readonly fieldError: string | null;
}

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

function evaluateWeightField(
  text: string,
  envelope: OperationalEnvelope['weight'],
  t: Translator,
): FieldOutcome<WeightInTons, WeightViolation> {
  const parsed = parseWeightField(text, t);
  if (parsed.kind === 'empty') {
    return { parsed, envelopeViolation: null, fieldError: null };
  }
  if (parsed.kind === 'invalid') {
    return { parsed, envelopeViolation: null, fieldError: parsed.message };
  }
  const check = validateWeightEnvelope({ weightTons: parsed.value }, envelope);
  if (isOk(check)) {
    return { parsed, envelopeViolation: null, fieldError: null };
  }
  return {
    parsed,
    envelopeViolation: check.error,
    fieldError: weightErrorMessage(check.error, t),
  };
}

function evaluateCGField(
  text: string,
  envelope: OperationalEnvelope['cg'],
  t: Translator,
): FieldOutcome<CGPercentMAC, CGViolation> {
  const parsed = parseCGField(text, t);
  if (parsed.kind === 'empty') {
    return { parsed, envelopeViolation: null, fieldError: null };
  }
  if (parsed.kind === 'invalid') {
    return { parsed, envelopeViolation: null, fieldError: parsed.message };
  }
  const check = validateCGEnvelope({ cgPercent: parsed.value }, envelope);
  if (isOk(check)) {
    return { parsed, envelopeViolation: null, fieldError: null };
  }
  return {
    parsed,
    envelopeViolation: check.error,
    fieldError: cgErrorMessage(check.error, t),
  };
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

interface ComputeArgs {
  readonly weight: WeightInTons;
  readonly cg: CGPercentMAC;
  readonly weightFieldError: string | null;
  readonly cgFieldError: string | null;
  readonly inputs: CrosswindCalculatorInputs;
  readonly data: CrosswindDataFile;
  readonly t: Translator;
}

function computeResultPanel(args: ComputeArgs): UseCrosswindCalculatorResult {
  const { weight, cg, weightFieldError, cgFieldError, inputs, data, t } = args;
  const calc = calculateCrosswindLimit(
    {
      weightTons: weight,
      cgPercent: cg,
      aircraft: inputs.aircraft,
      phase: data.phase,
      runwayCondition: inputs.runwayCondition,
    },
    data,
  );

  if (calc.ok) {
    return {
      state: { kind: 'idle', output: calc.value },
      weightFieldError,
      cgFieldError,
    };
  }
  if (calc.error.kind === 'NoLookupData') {
    return {
      state: { kind: 'out-of-envelope', reason: t('crosswind.errorOutOfLookup') },
      weightFieldError,
      cgFieldError,
    };
  }
  if (calc.error.kind === 'DataNotAvailable') {
    return {
      state: {
        kind: 'data-not-available',
        description: describeUnavailable(calc.error.reason, t),
      },
      weightFieldError,
      cgFieldError,
    };
  }
  return {
    state: {
      kind: 'error',
      headline: t('crosswind.errorHeadline'),
      description: t('crosswind.errorVerifyInputs'),
    },
    weightFieldError,
    cgFieldError,
  };
}

export function useCrosswindCalculator(
  args: UseCrosswindCalculatorArgs,
): UseCrosswindCalculatorResult {
  const { inputs, data } = args;
  const { t } = useTranslation();
  return useMemo(() => {
    // Schema 2.3.0 (ADR-0013): operationalEnvelope lives per-aircraft
    // under byAircraft.<variant>. MVP-active variant is B787-8; the
    // dynamic per-active-aircraft resolution lands in the next commit.
    const envelope = data.byAircraft.b787_8?.operationalEnvelope;
    if (envelope === undefined) {
      return {
        state: { kind: 'data-not-available', description: t('crosswind.errorDataAircraft') },
        weightFieldError: null,
        cgFieldError: null,
      };
    }
    const weight = evaluateWeightField(inputs.weightText, envelope.weight, t);
    const cg = evaluateCGField(inputs.cgText, envelope.cg, t);

    // Result panel calculates only when BOTH fields parsed — partial
    // input never feeds the algorithm. Per-field errors are surfaced
    // independently regardless of the other field's state.
    if (weight.parsed.kind !== 'parsed' || cg.parsed.kind !== 'parsed') {
      return {
        state: { kind: 'empty' },
        weightFieldError: weight.fieldError,
        cgFieldError: cg.fieldError,
      };
    }
    // Safety-first per ADR-0012: any operational-envelope violation
    // collapses the result panel to `out-of-envelope` with an explicit
    // reason. The calculator is skipped — the pilot never sees a number
    // derived from out-of-spec inputs. Per-field errors continue to
    // surface the specific axis violations under TOW/CG inputs.
    if (weight.envelopeViolation !== null || cg.envelopeViolation !== null) {
      return {
        state: {
          kind: 'out-of-envelope',
          reason: t('crosswind.outOfOperationalEnvelope'),
        },
        weightFieldError: weight.fieldError,
        cgFieldError: cg.fieldError,
      };
    }
    return computeResultPanel({
      weight: weight.parsed.value,
      cg: cg.parsed.value,
      weightFieldError: weight.fieldError,
      cgFieldError: cg.fieldError,
      inputs,
      data,
      t,
    });
  }, [inputs, data, t]);
}
