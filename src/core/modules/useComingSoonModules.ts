import { useMemo } from 'react';

import { loadComingSoonModules, loadModules } from './loader';
import type { InactiveModule, Module } from './types';

/** Returns all modules (active + coming-soon). Memoised across renders. */
export function useModules(): readonly Module[] {
  return useMemo(() => loadModules(), []);
}

/** Returns only the coming-soon subset — used by the Main Menu teaser grid. */
export function useComingSoonModules(): readonly InactiveModule[] {
  return useMemo(() => loadComingSoonModules(), []);
}
