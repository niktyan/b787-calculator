import { useCallback, useSyncExternalStore } from 'react';

import { getFlag, subscribe } from './flags';
import type { FeatureFlagKey } from './flags';

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const snapshot = useCallback((): boolean => getFlag(key), [key]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
