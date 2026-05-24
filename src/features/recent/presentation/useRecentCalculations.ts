/**
 * View-model hook for the Recent Calculations screen.
 *
 * Owns the in-memory copy of the persisted list and exposes the four
 * actions Recent presentation needs:
 *   - `entries` (read)
 *   - `refresh()` — reload from storage (useful after external write)
 *   - `remove(id)` — drop a single entry
 *   - `clear()` — wipe the list
 *
 * On mount and whenever the screen regains focus (`useFocusEffect`),
 * the hook reloads from storage so a calculation completed in the
 * Takeoff or Landing screen appears as soon as the pilot returns to
 * Recent.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { clearRecent, loadRecent, removeRecent } from '../../../core/recent-storage';
import type { RecentEntry } from '../../../core/recent-storage';

export interface UseRecentCalculationsResult {
  readonly entries: readonly RecentEntry[];
  readonly isLoaded: boolean;
  readonly refresh: () => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly clear: () => Promise<void>;
}

export function useRecentCalculations(): UseRecentCalculationsResult {
  const [entries, setEntries] = useState<readonly RecentEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await loadRecent();
    setEntries(next);
    setIsLoaded(true);
  }, []);

  useFocusEffect(
    useCallback((): void => {
      void refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeRecent(id);
      await refresh();
    },
    [refresh],
  );

  const clear = useCallback(async (): Promise<void> => {
    await clearRecent();
    await refresh();
  }, [refresh]);

  return { entries, isLoaded, refresh, remove, clear };
}
