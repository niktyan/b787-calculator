/**
 * Repository corruption + memoization tests for the Landing module.
 *
 * Parallel to the takeoff repository test set: zod structural failures
 * and business-rule violations both surface as `CorruptedDataBundle`.
 */

import { createCrosswindLandingRepository } from '../data/landingRepository';
import bundled from '../data/b787-landing.json';

type Mutator = (raw: Record<string, unknown>) => Record<string, unknown>;

function withCorruption(mutator: Mutator): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(bundled)) as Record<string, unknown>;
  return mutator(cloned);
}

function aircraftEntry(
  raw: Record<string, unknown>,
  key: 'b787_8' | 'b787_9',
): Record<string, unknown> {
  const byAircraft = raw['byAircraft'] as Record<string, Record<string, unknown>>;
  const entry = byAircraft[key];
  if (entry === undefined) {
    throw new Error(`expected ${key} entry`);
  }
  return entry;
}

describe('Crosswind Landing repository · corruption', () => {
  it('loads the bundled JSON successfully', () => {
    const repo = createCrosswindLandingRepository();
    const result = repo.load();
    expect(result.ok).toBe(true);
  });

  it('memoizes — repeated load() returns the same Result instance', () => {
    const repo = createCrosswindLandingRepository();
    const r1 = repo.load();
    const r2 = repo.load();
    expect(r1).toBe(r2);
  });

  it('rejects schemaVersion outside 2.4.x (ADR-0018)', () => {
    const corrupted = withCorruption((raw) => {
      raw['schemaVersion'] = '1.0.0';
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('rejects unknown aircraft keys (strict object)', () => {
    const corrupted = withCorruption((raw) => {
      const byAircraft = raw['byAircraft'] as Record<string, unknown>;
      byAircraft['b777_300'] = byAircraft['b787_8'];
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
  });

  it('rejects missing aircraft entries (b787_8 + b787_9 are required)', () => {
    const corrupted = withCorruption((raw) => {
      const byAircraft = raw['byAircraft'] as Record<string, unknown>;
      delete byAircraft['b787_9'];
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });

  it('rejects unknown runway condition keys inside baseTable (strict)', () => {
    const corrupted = withCorruption((raw) => {
      const entry = aircraftEntry(raw, 'b787_8');
      const table = entry['baseTable'] as Record<string, unknown>;
      table['mediumStuff'] = { manual: 20, auto: 20 };
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
  });

  it('rejects non-integer KT values in baseTable', () => {
    const corrupted = withCorruption((raw) => {
      const entry = aircraftEntry(raw, 'b787_8');
      const table = entry['baseTable'] as Record<string, Record<string, unknown>>;
      table['dry'] = { manual: 37.5, auto: 33 };
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
  });

  it('rejects engineInopAutolandLimit <= 0', () => {
    const corrupted = withCorruption((raw) => {
      const entry = aircraftEntry(raw, 'b787_8');
      entry['engineInopAutolandLimit'] = 0;
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
  });

  it('rejects catIIIIICap <= 0', () => {
    const corrupted = withCorruption((raw) => {
      const adj = raw['adjustments'] as Record<string, unknown>;
      adj['catIIIIICap'] = 0;
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
  });

  it('rejects phase mismatch (default context expects landing)', () => {
    const corrupted = withCorruption((raw) => {
      raw['phase'] = 'takeoff';
      return raw;
    });
    const repo = createCrosswindLandingRepository({ raw: corrupted });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.details).toMatch(/phase/);
  });

  it('rejects non-landing-shaped JSON', () => {
    const repo = createCrosswindLandingRepository({ raw: { hello: 'world' } });
    const r = repo.load();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.kind).toBe('CorruptedDataBundle');
  });
});
