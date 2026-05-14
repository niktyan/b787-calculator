import { renderHook } from '@testing-library/react-native';

import { useComingSoonModules, useModules } from '../useComingSoonModules';

describe('modules hooks', () => {
  describe('useComingSoonModules', () => {
    it('returns the bundled coming-soon module list', () => {
      const { result } = renderHook(() => useComingSoonModules());
      expect(result.current.length).toBeGreaterThan(0);
      const landing = result.current.find((m) => m.id === 'crosswind-landing');
      expect(landing).toBeDefined();
      expect(landing?.phase).toBe('Phase 2');
    });

    it('returns the same memoized reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useComingSoonModules());
      const first = result.current;
      rerender({});
      expect(result.current).toBe(first);
    });
  });

  describe('useModules', () => {
    it('returns active + coming-soon entries side-by-side', () => {
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
      expect(landing?.active).toBe(false);
    });
  });
});
