import { renderHook } from '@testing-library/react-native';

import { useComingSoonModules } from '../useComingSoonModules';

describe('useComingSoonModules', () => {
  it('returns the bundled coming-soon module list', () => {
    const { result } = renderHook(() => useComingSoonModules());
    expect(result.current.length).toBeGreaterThan(0);
    const takeoff = result.current.find((m) => m.id === 'crosswind-takeoff');
    expect(takeoff).toBeDefined();
    expect(takeoff?.phase).toBe('Phase 2');
  });

  it('returns the same memoized reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useComingSoonModules());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});
