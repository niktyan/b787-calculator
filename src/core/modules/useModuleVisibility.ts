import { useCallback, useEffect, useState } from 'react';

import { storage } from '../storage';

import { DEFAULT_MODULE_VISIBILITY, isModuleVisible, toggleModuleVisibility } from './visibility';
import type { ModuleVisibility } from './visibility';

export interface UseModuleVisibilityResult {
  readonly visibility: ModuleVisibility;
  readonly isVisible: (moduleId: string) => boolean;
  readonly toggle: (moduleId: string) => void;
}

/**
 * Hook that reads / mutates per-module visibility preferences. Reads from
 * storage on mount (best-effort, falls through to all-visible default if
 * storage is unset or corrupted); writes go through the debounced storage
 * pipeline so rapid toggles coalesce into a single AsyncStorage write.
 *
 * Default policy: missing IDs are treated as visible (см.
 * `core/modules/visibility.ts` `isModuleVisible`). Adding a new module in
 * a future release will therefore surface it in the Main Menu without the
 * user having to migrate state.
 */
export function useModuleVisibility(): UseModuleVisibilityResult {
  const [visibility, setVisibility] = useState<ModuleVisibility>(DEFAULT_MODULE_VISIBILITY);

  useEffect(() => {
    let active = true;
    void storage.get('moduleVisibility').then((stored) => {
      if (active && stored !== null) {
        setVisibility(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((moduleId: string): void => {
    setVisibility((prev) => {
      const next = toggleModuleVisibility(prev, moduleId);
      storage.set('moduleVisibility', next);
      return next;
    });
  }, []);

  const isVisible = useCallback(
    (moduleId: string): boolean => isModuleVisible(visibility, moduleId),
    [visibility],
  );

  return { visibility, isVisible, toggle };
}
