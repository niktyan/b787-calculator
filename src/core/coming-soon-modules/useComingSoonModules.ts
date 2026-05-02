import { useMemo } from 'react';

import { loadComingSoonModules } from './loader';
import type { ComingSoonModule } from './types';

export function useComingSoonModules(): readonly ComingSoonModule[] {
  return useMemo(() => loadComingSoonModules(), []);
}
