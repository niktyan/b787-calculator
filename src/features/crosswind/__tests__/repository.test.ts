/**
 * Test Set #5 from `02_Specification/05-crosswind-algorithm.md` —
 * data integrity / corrupted JSON cases. All five must surface as
 * `CorruptedDataBundle` from the repository.
 *
 * The default-context expects b787_8 / landing / dry — which is what
 * `b787-8-landing-dry.json` ships. Mismatches against that context
 * are also `CorruptedDataBundle`.
 */

import { createCrosswindRepository } from '../data/crosswindRepository';
import bundled from '../data/b787-8-landing-dry.json';

type Mutator = (raw: Record<string, unknown>) => Record<string, unknown>;

function withCorruption(mutator: Mutator): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(bundled)) as Record<string, unknown>;
  return mutator(cloned);
}

describe('Crosswind repository · Test Set #5 (corrupted JSON)', () => {
  it('case 5.01: breakpoints.length !== 5 → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const interp = raw['interpolation'] as { breakpoints: unknown[] };
      interp.breakpoints = interp.breakpoints.slice(0, 4);
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('case 5.02: slope === 0 → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const interp = raw['interpolation'] as Record<string, unknown>;
      interp['slope'] = 0;
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
    expect(r.error.details).toMatch(/slope/);
  });

  it('case 5.03: aircraft mismatches expected file context → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      raw['aircraft'] = 'b787_9';
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
    expect(r.error.details).toMatch(/aircraft/);
  });

  it('case 5.04: non-ascending intercepts → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const interp = raw['interpolation'] as Record<string, unknown>;
      interp['breakpoints'] = [
        { crosswindKnots: 40, intercept: 6.1 },
        { crosswindKnots: 35, intercept: 5.0 },
        { crosswindKnots: 30, intercept: 12.8 },
        { crosswindKnots: 25, intercept: 16.3 },
        { crosswindKnots: 20, intercept: 19.8 },
      ];
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
    expect(r.error.details).toMatch(/intercept/);
  });

  it('case 5.05: weight.minTons > weight.maxTons → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const env = raw['operationalEnvelope'] as Record<string, unknown>;
      env['weight'] = { minTons: 200, maxTons: 100 };
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
    expect(r.error.details).toMatch(/weight/);
  });

  it('valid bundled JSON loads successfully', () => {
    const repo = createCrosswindRepository();
    const r = repo.load();
    expect(r.ok).toBe(true);
  });

  it('memoizes — repeated load() returns the same Result instance', () => {
    const repo = createCrosswindRepository();
    const r1 = repo.load();
    const r2 = repo.load();
    expect(r1).toBe(r2);
  });

  it('non-crosswind-shaped JSON → CorruptedDataBundle (zod failure)', () => {
    const repo = createCrosswindRepository({ raw: { hello: 'world' } });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('cg envelope min >= max → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const env = raw['operationalEnvelope'] as Record<string, unknown>;
      env['cg'] = { minPercent: 35, maxPercent: 8 };
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('non-descending crosswindKnots → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      const interp = raw['interpolation'] as Record<string, unknown>;
      interp['breakpoints'] = [
        { crosswindKnots: 20, intercept: 6.1 },
        { crosswindKnots: 25, intercept: 9.3 },
        { crosswindKnots: 30, intercept: 12.8 },
        { crosswindKnots: 35, intercept: 16.3 },
        { crosswindKnots: 40, intercept: 19.8 },
      ];
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('phase mismatch → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      raw['phase'] = 'takeoff';
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.details).toMatch(/phase/);
  });

  it('runwayCondition mismatch → CorruptedDataBundle', () => {
    const corrupted = withCorruption((raw) => {
      raw['runwayCondition'] = 'wet';
      return raw;
    });
    const repo = createCrosswindRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) {
      throw new Error('expected error');
    }
    expect(r.error.details).toMatch(/runwayCondition/);
  });
});
