/**
 * Output-rounding policy for the Crosswind (Takeoff) calculator.
 *
 * Spec: ADR-0017 (Crosswind output rounding policy).
 *
 * Truncates a number toward zero at a 0.1 step — Excel-equivalent
 * `ROUNDDOWN(value, 1)`. Applied once at the calculator boundary
 * (`calculator.ts`) so every strategy benefits uniformly without
 * scattering the call across strategy implementations.
 *
 * Semantics:
 *   roundDownToTenth(27.890) === 27.8
 *   roundDownToTenth(30.500) === 30.5
 *   roundDownToTenth(34.764) === 34.7
 *   roundDownToTenth(10)     === 10     // numerically; UI renders "10.0"
 *   roundDownToTenth(12.5)   === 12.5
 *
 * Negative inputs are floored further from zero (`-0.05 → -0.1`) —
 * `Math.floor` rounds toward minus-infinity. Not reachable in
 * production: `makeCrosswindKnots` rejects negatives at the strategy
 * boundary before they meet this helper. Documented in tests for
 * regression visibility.
 */

const TENTH_FACTOR = 10;

export function roundDownToTenth(value: number): number {
  return Math.floor(value * TENTH_FACTOR) / TENTH_FACTOR;
}
