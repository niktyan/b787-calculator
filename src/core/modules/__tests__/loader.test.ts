import {
  _parseModules,
  _resetCacheForTesting,
  loadComingSoonModules,
  loadModules,
} from '../loader';

describe('modules loader', () => {
  beforeEach(() => {
    _resetCacheForTesting();
  });

  describe('loadModules (active + coming-soon)', () => {
    it('returns the bundled module list with discriminated entries', () => {
      const modules = loadModules();
      expect(modules.length).toBeGreaterThan(0);
      for (const m of modules) {
        expect(typeof m.id).toBe('string');
        expect(typeof m.name).toBe('string');
        expect(typeof m.icon).toBe('string');
        expect(typeof m.active).toBe('boolean');
      }
    });

    it('exposes crosswind-takeoff as the active module with a route', () => {
      const takeoff = loadModules().find((m) => m.id === 'crosswind-takeoff');
      expect(takeoff).toBeDefined();
      expect(takeoff?.active).toBe(true);
      if (takeoff?.active === true) {
        expect(takeoff.route).toBe('/crosswind');
      }
    });

    it('returns a frozen, cached array on repeat calls', () => {
      const a = loadModules();
      const b = loadModules();
      expect(b).toBe(a);
      expect(Object.isFrozen(a)).toBe(true);
    });
  });

  describe('loadComingSoonModules (inactive subset)', () => {
    it('returns only inactive modules with the expected coming-soon shape', () => {
      const modules = loadComingSoonModules();
      expect(modules.length).toBeGreaterThan(0);
      for (const m of modules) {
        expect(m.active).toBe(false);
        expect(typeof m.description).toBe('string');
        expect(typeof m.phase).toBe('string');
      }
    });

    it('exposes crosswind-landing as a Phase 2 teaser', () => {
      const landing = loadComingSoonModules().find((x) => x.id === 'crosswind-landing');
      expect(landing).toBeDefined();
      expect(landing?.phase).toMatch(/^Phase \d+$/);
    });

    it('does not surface weight-balance or performance in MVP', () => {
      const modules = loadComingSoonModules();
      expect(modules.find((x) => x.id === 'weight-balance')).toBeUndefined();
      expect(modules.find((x) => x.id === 'performance')).toBeUndefined();
    });

    it('does not include the active takeoff module', () => {
      const takeoff = loadComingSoonModules().find((m) => m.id === 'crosswind-takeoff');
      expect(takeoff).toBeUndefined();
    });
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

    it('parses a valid mixed array unchanged', () => {
      const valid = [
        {
          id: 'x-active',
          name: 'X active',
          icon: 'X',
          active: true,
          route: '/x',
        },
        {
          id: 'x-soon',
          name: 'X soon',
          description: 'desc',
          icon: 'X',
          active: false,
          phase: 'Phase 9',
        },
      ];
      expect(_parseModules(valid)).toEqual(valid);
    });
  });
});
