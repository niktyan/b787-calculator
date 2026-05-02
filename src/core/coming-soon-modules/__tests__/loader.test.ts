import { _parseModules, _resetCacheForTesting, loadComingSoonModules } from '../loader';

describe('coming-soon-modules loader', () => {
  beforeEach(() => {
    _resetCacheForTesting();
  });

  it('returns the bundled module list with the expected shape', () => {
    const modules = loadComingSoonModules();
    expect(modules.length).toBeGreaterThan(0);
    for (const m of modules) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.description).toBe('string');
      expect(typeof m.icon).toBe('string');
      expect(typeof m.phase).toBe('string');
    }
  });

  it('exposes crosswind-takeoff, weight-balance, performance as coming-soon teasers', () => {
    const modules = loadComingSoonModules();
    const ids = ['crosswind-takeoff', 'weight-balance', 'performance'] as const;
    for (const id of ids) {
      const m = modules.find((x) => x.id === id);
      expect(m).toBeDefined();
      expect(m?.phase).toMatch(/^Phase \d+$/);
      expect((m?.name ?? '').length).toBeGreaterThan(0);
      expect((m?.description ?? '').length).toBeGreaterThan(0);
      expect((m?.icon ?? '').length).toBeGreaterThan(0);
    }
  });

  it('does not include the active landing module (lives under features/, per ADR-0004)', () => {
    const modules = loadComingSoonModules();
    const landing = modules.find((m) => m.id === 'crosswind-landing');
    expect(landing).toBeUndefined();
  });

  it('returns the same cached array on repeat calls', () => {
    const a = loadComingSoonModules();
    const b = loadComingSoonModules();
    expect(b).toBe(a);
  });

  it('returns a frozen array', () => {
    const modules = loadComingSoonModules();
    expect(Object.isFrozen(modules)).toBe(true);
  });

  describe('_parseModules (validation guard)', () => {
    it('returns an empty list when input fails schema validation', () => {
      const result = _parseModules({ not: 'an array' });
      expect(result).toEqual([]);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('returns an empty list when input is missing required fields', () => {
      const result = _parseModules([{ id: 'crosswind-takeoff' }]);
      expect(result).toEqual([]);
    });

    it('parses a valid array unchanged', () => {
      const valid = [
        {
          id: 'x',
          name: 'X module',
          description: 'desc',
          icon: 'X',
          phase: 'Phase 9',
        },
      ];
      expect(_parseModules(valid)).toEqual(valid);
    });
  });
});
