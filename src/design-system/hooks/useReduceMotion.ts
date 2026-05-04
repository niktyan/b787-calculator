import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Subscribe to the iOS "Reduce Motion" accessibility preference.
 *
 * Reads the initial value once on mount and listens to
 * `reduceMotionChanged` so the returned flag flips live without
 * remount. Used by motion primitives (`useScaleOnPress`, the empty↔idle
 * transition on the Crosswind result panel, the envelope-bar marker
 * animation) to skip animations entirely when the user prefers
 * instant transitions. See `02_Specification/06-ui-spec.md`
 * § Accessibility checklist.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return (): void => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
