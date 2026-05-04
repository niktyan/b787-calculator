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
import type {
  CGPercentMAC,
  CrosswindCalculationOutput,
  EnvelopeViolation,
  RunwayCondition,
  WeightInTons,
} from '../domain/types';
import { validateOperationalEnvelope } from '../domain/validators';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import type { CrosswindDataFile } from '../data/schema';

const NO_ACTIVE_BRACKET = -1;

export interface ChartInputs {
  readonly data: CrosswindDataFile | null;
  readonly weightTons: number;
  readonly cgPercent: number;
  readonly activeBracketIndex: number;
}

export type CrosswindUIState =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'idle';
      readonly output: CrosswindCalculationOutput;
      readonly warning: EnvelopeViolation | null;
    }
  | { readonly kind: 'out-of-envelope'; readonly reason: string }
  | { readonly kind: 'error'; readonly headline: string; readonly description?: string };

export interface CrosswindCalculatorInputs {
  readonly weightText: string;
  readonly cgText: string;
  readonly runwayCondition: RunwayCondition;
}

export interface UseCrosswindCalculatorArgs {
  readonly inputs: CrosswindCalculatorInputs;
  readonly data: CrosswindDataFile;
}

export interface UseCrosswindCalculatorResult {
  readonly state: CrosswindUIState;
  /**
   * Inputs for the CrosswindChart. Null when the user hasn't entered
   * valid numbers yet (chart isn't shown). When non-null, `data` may
   * still be null (non-dry runway condition → chart shows empty state).
   */
  readonly chart: ChartInputs | null;
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
    return {
      state: { kind: 'empty' },
      chart: null,
      weightFieldError: null,
      cgFieldError: null,
    };
  }
  const weightVO = makeWeightInTons(weightNum);
  if (!weightVO.ok) {
    return {
      state: { kind: 'error', headline: 'Calculation unavailable', description: 'Invalid weight' },
      chart: null,
      weightFieldError: 'Invalid weight',
      cgFieldError: null,
    };
  }
  const cgVO = makeCGPercentMAC(cgNum);
  if (!cgVO.ok) {
    return {
      state: { kind: 'error', headline: 'Calculation unavailable', description: 'Invalid CG' },
      chart: null,
      weightFieldError: null,
      cgFieldError: 'Invalid CG',
    };
  }
  return { weight: weightVO.value, cg: cgVO.value };
}

function isParsedInputs(x: ParsedInputs | UseCrosswindCalculatorResult): x is ParsedInputs {
  return 'weight' in x;
}

/**
 * Compute the chart's `activeBracketIndex` from algorithm metadata.
 *
 * - `within-bracket` strategy → index of the breakpoint matching
 *   `bracketCrosswindRange.upper` (the lowerBound's crosswind value
 *   in the algorithm; visually the bracket's upper edge in CG space).
 * - `below-envelope` / `above-envelope` (IFNA-fallback cases) → -1
 *   (no specific line is "active"; the marker sits outside the
 *   bracket grid).
 */
function deriveActiveBracketIndex(
  output: CrosswindCalculationOutput,
  data: CrosswindDataFile,
): number {
  if (output.metadata.calculationStrategy !== 'within-bracket') {
    return NO_ACTIVE_BRACKET;
  }
  const target = output.metadata.bracketCrosswindRange.upper;
  return data.interpolation.breakpoints.findIndex((bp) => bp.crosswindKnots === target);
}

function buildChartInputs(args: {
  readonly parsed: ParsedInputs;
  readonly data: CrosswindDataFile;
  readonly runwayCondition: RunwayCondition;
  readonly output: CrosswindCalculationOutput | null;
}): ChartInputs {
  const { parsed, data, runwayCondition, output } = args;
  const hasLookupData = runwayCondition === data.runwayCondition;
  const activeBracketIndex =
    output === null || !hasLookupData ? NO_ACTIVE_BRACKET : deriveActiveBracketIndex(output, data);
  return {
    data: hasLookupData ? data : null,
    weightTons: parsed.weight as number,
    cgPercent: parsed.cg as number,
    activeBracketIndex,
  };
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
      aircraft: data.aircraft,
      phase: data.phase,
      runwayCondition: inputs.runwayCondition,
    },
    data,
  );

  if (calc.ok) {
    const chart = buildChartInputs({
      parsed,
      data,
      runwayCondition: inputs.runwayCondition,
      output: calc.value,
    });
    return {
      state: { kind: 'idle', output: calc.value, warning: violation },
      chart,
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }

  // Below paths: no algorithm result. Chart still renders so the pilot
  // sees the visual context (or empty state for non-dry conditions).
  const chart = buildChartInputs({
    parsed,
    data,
    runwayCondition: inputs.runwayCondition,
    output: null,
  });

  if (calc.error.kind === 'NoLookupData') {
    return {
      state: {
        kind: 'out-of-envelope',
        reason: 'Inputs cannot be evaluated by the lookup table. Adjust inputs.',
      },
      chart,
      weightFieldError: fieldErrors.weight,
      cgFieldError: fieldErrors.cg,
    };
  }
  if (calc.error.kind === 'DataNotAvailable') {
    return {
      state: {
        kind: 'error',
        headline: 'Data unavailable',
        description: 'This combination is not yet supported.',
      },
      chart,
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
    chart,
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
