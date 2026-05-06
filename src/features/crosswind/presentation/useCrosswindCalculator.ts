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
 *   5. Resolve UI state: empty / idle (+optional warning) / out-of-envelope / error.
 *
 * Spec: 02_Specification/06-ui-spec.md § "Composition: idle + operational-envelope warning".
 */

import { useMemo } from 'react';

import { isOk } from '../../../core/result';
import { calculateCrosswindLimit } from '../domain/calculator';
import { getLookupCGRange } from '../domain/lookupRange';
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

import { ENVELOPE_BAR_CG_MAX_PERCENT } from './constants';

export interface EnvelopeBarInputs {
  readonly currentCG: number;
  readonly axisMin: number;
  readonly axisMax: number;
  readonly operationalMin: number;
  readonly operationalMax: number;
  readonly lookupMax: number;
}

export type CrosswindUIState =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'idle';
      readonly output: CrosswindCalculationOutput;
      readonly warning: EnvelopeViolation | null;
      readonly envelopeBar: EnvelopeBarInputs;
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

function fieldErrorFromViolation(violation: EnvelopeViolation): FieldErrors {
  switch (violation.kind) {
    case 'weight.below':
      return { weight: `Below minimum ${violation.minTons} t`, cg: null };
    case 'weight.above':
      return { weight: `Above maximum ${violation.maxTons} t`, cg: null };
    case 'cg.below':
      return { weight: null, cg: `Below minimum ${violation.minPercent} %MAC` };
    case 'cg.above':
      return { weight: null, cg: `Above maximum ${violation.maxPercent} %MAC` };
  }
}

interface ParsedInputs {
  readonly weight: WeightInTons;
  readonly cg: CGPercentMAC;
}

function parseInputs(
  inputs: CrosswindCalculatorInputs,
): ParsedInputs | UseCrosswindCalculatorResult {
  const weightNum = parseFloatStrict(inputs.weightText);
  const cgNum = parseFloatStrict(inputs.cgText);
  if (weightNum === null || cgNum === null) {
    return { state: { kind: 'empty' }, weightFieldError: null, cgFieldError: null };
  }
  const weightVO = makeWeightInTons(weightNum);
  if (!weightVO.ok) {
    return {
      state: { kind: 'error', headline: 'Calculation unavailable', description: 'Invalid weight' },
      weightFieldError: 'Invalid weight',
      cgFieldError: null,
    };
  }
  const cgVO = makeCGPercentMAC(cgNum);
  if (!cgVO.ok) {
    return {
      state: { kind: 'error', headline: 'Calculation unavailable', description: 'Invalid CG' },
      weightFieldError: null,
      cgFieldError: 'Invalid CG',
    };
  }
  return { weight: weightVO.value, cg: cgVO.value };
}

function isParsedInputs(x: ParsedInputs | UseCrosswindCalculatorResult): x is ParsedInputs {
  return 'weight' in x;
}

interface EnvelopeBarArgs {
  readonly data: CrosswindDataFile;
  readonly aircraft: AircraftVariant;
  readonly condition: RunwayCondition;
  readonly weightTons: WeightInTons;
  readonly cgPercent: number;
}

function buildEnvelopeBarInputs(args: EnvelopeBarArgs): EnvelopeBarInputs {
  const { data, aircraft, condition, weightTons, cgPercent } = args;
  const lookupRange = getLookupCGRange(data, aircraft, condition, weightTons);
  return {
    currentCG: cgPercent,
    axisMin: data.operationalEnvelope.cg.minPercent,
    axisMax: ENVELOPE_BAR_CG_MAX_PERCENT,
    operationalMin: data.operationalEnvelope.cg.minPercent,
    operationalMax: data.operationalEnvelope.cg.maxPercent,
    lookupMax: lookupRange.max,
  };
}

function describeUnavailable(
  reason: 'aircraft-not-implemented' | 'condition-not-implemented' | 'phase-mismatch',
): string {
  switch (reason) {
    case 'aircraft-not-implemented':
      return 'No data available for the selected aircraft.';
    case 'condition-not-implemented':
      return 'No data available for the selected runway condition.';
    case 'phase-mismatch':
      return 'Bundled data does not match the requested flight phase.';
  }
}

function compute(
  parsed: ParsedInputs,
  inputs: CrosswindCalculatorInputs,
  data: CrosswindDataFile,
): UseCrosswindCalculatorResult {
  const envelopeCheck = validateOperationalEnvelope(
    { weightTons: parsed.weight, cgPercent: parsed.cg },
    data.operationalEnvelope,
  );
  const violation = isOk(envelopeCheck) ? null : envelopeCheck.error;
  const fieldErrors = violation === null ? EMPTY_FIELD_ERRORS : fieldErrorFromViolation(violation);

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
    const envelopeBar = buildEnvelopeBarInputs({
      data,
      aircraft: inputs.aircraft,
      condition: inputs.runwayCondition,
      weightTons: parsed.weight,
      cgPercent: parsed.cg,
    });
    return {
      state: { kind: 'idle', output: calc.value, warning: violation, envelopeBar },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }

  if (calc.error.kind === 'NoLookupData') {
    return {
      state: {
        kind: 'out-of-envelope',
        reason: 'Inputs cannot be evaluated by the lookup table. Adjust inputs.',
      },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }
  if (calc.error.kind === 'DataNotAvailable') {
    return {
      state: {
        kind: 'data-not-available',
        description: describeUnavailable(calc.error.reason),
      },
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }
  return {
    state: {
      kind: 'error',
      headline: 'Calculation unavailable',
      description: 'Verify inputs and try again.',
    },
    weightFieldError: fieldErrors.weight,
    cgFieldError: fieldErrors.cg,
  };
}

export function useCrosswindCalculator(
  args: UseCrosswindCalculatorArgs,
): UseCrosswindCalculatorResult {
  const { inputs, data } = args;
  return useMemo(() => {
    const parsed = parseInputs(inputs);
    if (!isParsedInputs(parsed)) {
      return parsed;
    }
    return compute(parsed, inputs, data);
  }, [inputs, data]);
}
