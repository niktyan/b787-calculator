import { useCallback, useEffect, useState } from 'react';

import { acceptDisclaimer as persistAcceptance, readDisclaimerStatus } from './state';
import type { DisclaimerStatus } from './state';

export interface UseDisclaimerStatusResult {
  readonly status: DisclaimerStatus;
  readonly accept: () => Promise<void>;
}

export function useDisclaimerStatus(): UseDisclaimerStatusResult {
  const [status, setStatus] = useState<DisclaimerStatus>('unknown');

  useEffect(() => {
    let active = true;
    void readDisclaimerStatus().then((next) => {
      if (active) {
        setStatus(next);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const accept = useCallback(async (): Promise<void> => {
    await persistAcceptance();
    setStatus('accepted');
  }, []);

  return { status, accept };
}
