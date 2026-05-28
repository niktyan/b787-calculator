/**
 * Unit tests for the `roundDownToTenth` helper (ADR-0017).
 *
 * Pure-function semantics test — no fixtures, no I/O. Pinned to the
 * exact anchor table called out in the ADR (curator-verified values
 * 10.0, 12.5, 13.9, 27.8, 30.5, 34.7 + edge cases).
 */

import { roundDownToTenth } from '../domain/rounding';

describe('roundDownToTenth · curator anchor semantics', () => {
  // ADR-0017 anchor cases: each input maps to its ROUNDDOWN(value, 1)
  // = Math.floor(value * 10) / 10 equivalent. NEVER half-up — values
  // strictly truncate toward zero on the 0.1 grid.
  const cases: readonly { readonly input: number; readonly expected: number }[] = [
    { input: 27.89, expected: 27.8 },
    { input: 30.5, expected: 30.5 },
    { input: 0, expected: 0 },
    { input: 10, expected: 10 },
    { input: 34.764, expected: 34.7 },
    { input: 12.5, expected: 12.5 },
    { input: 27.6999, expected: 27.6 },
  ];

  it.each(cases)('roundDownToTenth($input) === $expected', ({ input, expected }) => {
    expect(roundDownToTenth(input)).toBe(expected);
  });
});

describe('roundDownToTenth · grid invariant', () => {
  it('every output lies on the 0.1 grid: result === Math.floor(result * 10) / 10', () => {
    // 1000 pseudo-random doubles in the operationally-plausible
    // crosswind range. The boundary helper must produce values that
    // are themselves fixed-points of the helper (idempotence on the
    // 0.1 grid).
    const samples = Array.from({ length: 1000 }, (_, i) => (i * 0.0317 + 0.0007) % 40);
    for (const x of samples) {
      const rounded = roundDownToTenth(x);
      expect(rounded).toBe(Math.floor(rounded * 10) / 10);
    }
  });

  it('idempotent: roundDownToTenth(roundDownToTenth(x)) === roundDownToTenth(x)', () => {
    for (const x of [0, 0.1, 0.5, 13.9, 27.8, 34.7, 39.999]) {
      const once = roundDownToTenth(x);
      const twice = roundDownToTenth(once);
      expect(twice).toBe(once);
    }
  });
});

describe('roundDownToTenth · negative-input documented behaviour', () => {
  // Not reachable in production: `makeCrosswindKnots` rejects
  // negative values at the strategy boundary (CrosswindError.Negative
  // → CalculationFailed). Documented here for regression visibility:
  // `Math.floor` rounds toward minus-infinity, so a negative input
  // moves FURTHER from zero, not closer to it.
  it('negative input floors toward minus-infinity (−0.05 → −0.1, not 0)', () => {
    expect(roundDownToTenth(-0.05)).toBe(-0.1);
    expect(roundDownToTenth(-0.1)).toBe(-0.1);
    expect(roundDownToTenth(-1.234)).toBe(-1.3);
  });
});
