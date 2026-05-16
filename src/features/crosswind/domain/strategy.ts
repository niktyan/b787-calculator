/**
 * Strategy pattern for the Crosswind algorithm.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md (strategy dispatch),
 * 02_Specification/04-domain-model.md (lookup schema).
 *
 * The crosswind algorithm is dispatched by `StrategyType`. Each RWYCC
 * runway condition will, over Phase D PRs 5–8, be backed by a strategy:
 *
 *   bracketedLinear        — Dry (RWYCC 6).         Active in this PR.
 *   variableSlopeBracketed — Medium (RWYCC 3).      Future PR 5.
 *   cgOnlyPiecewise        — MediumToPoor (RWYCC 2). Future PR 6.
 *   constant               — Poor (RWYCC 1).        Future PR 7.
 *   notAllowed             — RWYCC 0.               Future PR 8.
 *
 * For PR 1 only `bracketedLinear` is wired end-to-end. The other four
 * params shapes are declared as type-only stubs so callers and future
 * authors can reference them — they will be fleshed out + validated when
 * their owning PRs land.
 */

import type { Result } from '../../../core/result';

import type {
  AircraftVariant,
  CGPercentMAC,
  CrosswindCalculationError,
  CrosswindCalculationOutput,
  FlightPhase,
  RunwayCondition,
  WeightInTons,
} from './types';

export const STRATEGY_TYPES = [
  'bracketedLinear',
  'variableSlopeBracketed',
  'cgOnlyPiecewise',
  'constant',
  'notAllowed',
] as const;

export type StrategyType = (typeof STRATEGY_TYPES)[number];

/**
 * Calculator input shape consumed by every strategy. The strategy
 * itself does not need `aircraft / phase / runwayCondition` for the
 * computation, but it carries them through so the
 * `CalculationMetadata` it builds matches the call site.
 */
export interface CalculatorInput {
  readonly weightTons: WeightInTons;
  readonly cgPercent: CGPercentMAC;
  readonly aircraft: AircraftVariant;
  readonly phase: FlightPhase;
  readonly runwayCondition: RunwayCondition;
}

/**
 * Common interface for all strategies. The `type` discriminator mirrors
 * the JSON's `strategyType` and lets callers dispatch on it when they
 * need to (the resolver also returns the strategy already constructed,
 * so most call sites only ever see the polymorphic `.calculate()`).
 */
export interface CrosswindStrategy {
  readonly type: StrategyType;
  calculate(input: CalculatorInput): Result<CrosswindCalculationOutput, CrosswindCalculationError>;
}

// --- Active strategy params: bracketedLinear (PR 1) ---

export interface BracketedLinearBracket {
  readonly crosswindKnots: number;
  readonly intercept: number;
}

export interface BracketedLinearParams {
  readonly brackets: readonly BracketedLinearBracket[];
  readonly slope: number;
  readonly maxCap: number | null;
  readonly decimals: 0 | 1;
}

// --- Future strategy params (type-only stubs, not yet implemented) ---

/**
 * Future PR 5 — Medium (RWYCC 3).
 * Each bracket carries its own slope. Otherwise mirrors `bracketedLinear`.
 */
export interface VariableSlopeBracketedParams {
  readonly brackets: readonly {
    readonly crosswindKnots: number;
    readonly intercept: number;
    readonly slope: number;
  }[];
  readonly maxCap: number | null;
  readonly decimals: 0 | 1;
}

/**
 * Future PR 6 — MediumToPoor (RWYCC 2).
 * Piecewise-linear in CG with no weight dependence.
 */
export interface CGOnlyPiecewiseParams {
  readonly points: readonly { readonly cgPercent: number; readonly crosswindKnots: number }[];
  readonly maxCap: number | null;
  readonly decimals: 0 | 1;
}

/**
 * Future PR 7 — Poor (RWYCC 1).
 * Single constant value, independent of weight and CG.
 */
export interface ConstantParams {
  readonly value: number;
}

/**
 * Future PR 8 — RWYCC 0.
 * Operations are not allowed; calculate() will return a domain error.
 * No params required.
 */
export type NotAllowedParams = Record<string, never>;

// --- Strategy resolution outcome ---

/**
 * Returned by `resolveStrategy` when the requested (aircraft,
 * runwayCondition) combo has no lookup data in the bundled file.
 * Maps 1:1 to `CrosswindCalculationError.DataNotAvailable.reason`.
 */
export interface NoLookupData {
  readonly kind: 'no-lookup-data';
  readonly reason: 'aircraft-not-implemented' | 'condition-not-implemented';
}

export type StrategyResolution =
  | { readonly kind: 'strategy'; readonly strategy: CrosswindStrategy }
  | NoLookupData;
