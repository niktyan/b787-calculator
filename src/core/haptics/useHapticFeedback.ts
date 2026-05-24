/**
 * Tactile feedback hook — see ADR-0015.
 *
 * Exposes four typed methods aligned with iOS Taptic Engine semantics:
 *   - `lightImpact()`        — selection-confirmed (keypad digit, segment select).
 *   - `mediumImpact()`       — committed action (keypad Done, Reset button).
 *   - `warningNotification()`— envelope-violation transition.
 *   - `successNotification()`— recovery transition to valid range.
 *
 * Reads the `enableHapticFeedback` feature flag. When the flag is `false`,
 * every method becomes a no-op so the iOS Taptic Engine is never invoked
 * (the kill-switch path required by the ADR).
 *
 * `Haptics.*Async` returns a Promise that resolves once the system has
 * dispatched the vibration. We deliberately fire-and-forget — the caller
 * does not await it, errors are swallowed, and on devices without a
 * Taptic Engine the underlying API is a silent no-op on its own.
 */

import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';

import { useFeatureFlag } from '../feature-flags';

export interface HapticFeedback {
  readonly lightImpact: () => void;
  readonly mediumImpact: () => void;
  readonly warningNotification: () => void;
  readonly successNotification: () => void;
}

const NO_OP: HapticFeedback = {
  lightImpact: (): void => undefined,
  mediumImpact: (): void => undefined,
  warningNotification: (): void => undefined,
  successNotification: (): void => undefined,
};

const ACTIVE: HapticFeedback = {
  lightImpact: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  mediumImpact: (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  warningNotification: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  successNotification: (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};

export function useHapticFeedback(): HapticFeedback {
  const enabled = useFeatureFlag('enableHapticFeedback');
  return useMemo(() => (enabled ? ACTIVE : NO_OP), [enabled]);
}
