import { storage } from '../storage';

export type DisclaimerStatus = 'unknown' | 'pending' | 'accepted';

/**
 * Reads the persisted disclaimer-acceptance flag.
 * Treats missing or corrupted storage as "not accepted" (pending) — see
 * 02_Specification/06-ui-spec.md "Экран 2 · Disclaimer · Edge case".
 */
export async function readDisclaimerStatus(): Promise<'pending' | 'accepted'> {
  const value = await storage.get('disclaimerAccepted');
  return value === true ? 'accepted' : 'pending';
}

/**
 * Persists the user's acceptance of the disclaimer.
 * Flushes immediately so the flag survives an immediate app crash after acceptance.
 */
export async function acceptDisclaimer(): Promise<void> {
  storage.set('disclaimerAccepted', true);
  await storage.flushNow();
}
