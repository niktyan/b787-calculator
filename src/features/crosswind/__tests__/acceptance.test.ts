/**
 * End-to-end acceptance test for the Crosswind module:
 *   load repository → calculate → verify result + metadata.
 */

import { calculateCrosswindLimit } from '../domain/calculator';
import { makeCGPercentMAC, makeWeightInTons } from '../domain/valueObjects';
import { createCrosswindRepository } from '../data/crosswindRepository';
import { validateOperationalEnvelope } from '../domain/validators';

describe('Crosswind module · acceptance', () => {
  const repo = createCrosswindRepository();

  it('loads the bundled JSON and computes the canonical W=170 / CG=32 case', () => {
    const loaded = repo.load();
    if (!loaded.ok) {
      throw new Error(`unexpected repo error: ${loaded.error.details}`);
    }
    const data = loaded.value;
    const w = makeWeightInTons(170);
    const cg = makeCGPercentMAC(32);
    if (!w.ok || !cg.ok) {
      throw new Error('expected VOs to succeed');
    }
    const result = calculateCrosswindLimit(
      {
        weightTons: w.value,
        cgPercent: cg.value,
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
      },
      data,
    );
    if (!result.ok) {
      throw new Error(`unexpected error: ${JSON.stringify(result.error)}`);
    }
    expect(result.value.maxCrosswindKnots).toBe(34);
    expect(result.value.metadata.referenceDocument).toBe('Boeing 787 FCOM');
    expect(result.value.metadata.dataVersion).toBe(data.dataVersion);
    expect(result.value.metadata.calculationStrategy).toBe('within-bracket');
    expect(result.value.metadata.aircraft).toBe('b787_8');
  });

  it('orchestrates validator + calculator: inside operational envelope, computes a number', () => {
    const loaded = repo.load();
    if (!loaded.ok) {
      throw new Error('expected ok');
    }
    const data = loaded.value;
    const w = makeWeightInTons(150);
    const cg = makeCGPercentMAC(25);
    if (!w.ok || !cg.ok) {
      throw new Error('expected VOs');
    }
    const envCheck = validateOperationalEnvelope(
      { weightTons: w.value, cgPercent: cg.value },
      data.operationalEnvelope,
    );
    expect(envCheck.ok).toBe(true);
    const calc = calculateCrosswindLimit(
      {
        weightTons: w.value,
        cgPercent: cg.value,
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
      },
      data,
    );
    expect(calc.ok).toBe(true);
  });

  it('outside operational envelope but inside lookup envelope: validator fails, algorithm still computes', () => {
    const loaded = repo.load();
    if (!loaded.ok) {
      throw new Error('expected ok');
    }
    const data = loaded.value;
    const w = makeWeightInTons(95);
    const cg = makeCGPercentMAC(25);
    if (!w.ok || !cg.ok) {
      throw new Error('expected VOs');
    }
    const envCheck = validateOperationalEnvelope(
      { weightTons: w.value, cgPercent: cg.value },
      data.operationalEnvelope,
    );
    expect(envCheck.ok).toBe(false);
    const calc = calculateCrosswindLimit(
      {
        weightTons: w.value,
        cgPercent: cg.value,
        aircraft: 'b787_8',
        phase: 'takeoff',
        runwayCondition: 'dry',
      },
      data,
    );
    expect(calc.ok).toBe(true);
  });
});
