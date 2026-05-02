import defaults from './defaults.json';

/**
 * Simple in-memory feature-flag store. MVP scope (per 02-architecture.md trigger 10):
 * runtime A/B testing or per-user gating is NOT supported here — it would be a
 * separate ADR. This store reads bundled defaults at startup and lets host code
 * override flags imperatively (e.g. for tests or dev-only screens).
 */

export type FeatureFlagKey = keyof typeof defaults;

const flags: Record<FeatureFlagKey, boolean> = { ...defaults };

const subscribers = new Set<() => void>();

function notify(): void {
  for (const sub of subscribers) {
    sub();
  }
}

export function getFlag(key: FeatureFlagKey): boolean {
  return flags[key];
}

export function setFlag(key: FeatureFlagKey, value: boolean): void {
  if (flags[key] === value) {
    return;
  }
  flags[key] = value;
  notify();
}

export function resetFlags(): void {
  let changed = false;
  for (const key of Object.keys(defaults) as FeatureFlagKey[]) {
    const fallback = defaults[key];
    if (flags[key] !== fallback) {
      flags[key] = fallback;
      changed = true;
    }
  }
  if (changed) {
    notify();
  }
}

export function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return (): void => {
    subscribers.delete(callback);
  };
}
