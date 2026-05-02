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
      expect(typeof m.active).toBe('boolean');
      expect(m.phase === null || typeof m.phase === 'string').toBe(true);
    }
  });

  it('marks crosswind-landing as the active MVP module', () => {
    const modules = loadComingSoonModules();
    const landing = modules.find((m) => m.id === 'crosswind-landing');
    expect(landing).toBeDefined();
    expect(landing?.active).toBe(true);
    expect(landing?.phase).toBeNull();
  });

  it('marks crosswind-takeoff, weight-balance, performance as coming-soon', () => {
    const modules = loadComingSoonModules();
    const ids = ['crosswind-takeoff', 'weight-balance', 'performance'] as const;
    for (const id of ids) {
      const m = modules.find((x) => x.id === id);
      expect(m).toBeDefined();
      expect(m?.active).toBe(false);
      expect(m?.phase).not.toBeNull();
    }
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
      const result = _parseModules([{ id: 'crosswind-landing' }]);
      expect(result).toEqual([]);
    });

    it('parses a valid array unchanged', () => {
      const result = _parseModules([{ id: 'x', active: false, phase: 'Phase 9' }]);
      expect(result).toEqual([{ id: 'x', active: false, phase: 'Phase 9' }]);
    });
  });
});
