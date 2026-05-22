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

    it('exposes crosswind-takeoff as an active module with a route', () => {
      const takeoff = loadModules().find((m) => m.id === 'crosswind-takeoff');
      expect(takeoff).toBeDefined();
      expect(takeoff?.active).toBe(true);
      if (takeoff?.active === true) {
        expect(takeoff.route).toBe('/crosswind');
      }
    });

    it('exposes crosswind-landing as an active module with a route (Sprint C / ADR-0014)', () => {
      const landing = loadModules().find((m) => m.id === 'crosswind-landing');
      expect(landing).toBeDefined();
      expect(landing?.active).toBe(true);
      if (landing?.active === true) {
        expect(landing.route).toBe('/crosswind-landing');
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
    // Sprint C / ADR-0014: MVP ships zero coming-soon teasers — Landing
    // was promoted to an active module alongside Takeoff. The hook still
    // exists for future Phase 3+ teasers (Weight & Balance, Performance,
    // Fuel) so the API surface and Main Menu wiring stay stable.
    it('returns an empty list because MVP ships no teasers', () => {
      const modules = loadComingSoonModules();
      expect(modules).toEqual([]);
    });

    it('does not surface weight-balance or performance in MVP', () => {
      const modules = loadComingSoonModules();
      expect(modules.find((x) => x.id === 'weight-balance')).toBeUndefined();
      expect(modules.find((x) => x.id === 'performance')).toBeUndefined();
    });

    it('does not include either active crosswind module', () => {
      const teasers = loadComingSoonModules();
      expect(teasers.find((m) => m.id === 'crosswind-takeoff')).toBeUndefined();
      expect(teasers.find((m) => m.id === 'crosswind-landing')).toBeUndefined();
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
