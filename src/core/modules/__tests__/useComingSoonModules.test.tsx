import { renderHook } from '@testing-library/react-native';

import { useComingSoonModules, useModules } from '../useComingSoonModules';

describe('modules hooks', () => {
  describe('useComingSoonModules', () => {
    // Sprint C / ADR-0014: MVP ships zero coming-soon teasers — both
    // crosswind modules are active. The hook is kept for the next Phase
    // (Weight & Balance / Performance / Fuel teasers).
    it('returns an empty list in MVP (no teasers shipped)', () => {
      const { result } = renderHook(() => useComingSoonModules());
      expect(result.current).toEqual([]);
    });

    it('returns the same memoized reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useComingSoonModules());
      const first = result.current;
      rerender({});
      expect(result.current).toBe(first);
    });
  });

  describe('useModules', () => {
    it('returns both active crosswind modules side-by-side', () => {
      const { result } = renderHook(() => useModules());
      const ids = result.current.map((m) => m.id);
      expect(ids).toContain('crosswind-landing');
      expect(ids).toContain('crosswind-takeoff');
    });

    it('discriminates by `active` so callers can branch on the shape', () => {
      const { result } = renderHook(() => useModules());
      const takeoff = result.current.find((m) => m.id === 'crosswind-takeoff');
      expect(takeoff?.active).toBe(true);
      const landing = result.current.find((m) => m.id === 'crosswind-landing');
      expect(landing?.active).toBe(true);
    });
  });
});
