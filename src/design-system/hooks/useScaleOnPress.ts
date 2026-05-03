import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { tokens } from '../tokens';

/**
 * Press-feedback animation shared across interactive design-system surfaces.
 *
 * Returns an `animatedStyle` (apply to an `<Animated.View>` wrapping the
 * visible surface) plus `onPressIn` / `onPressOut` to wire to a `<Pressable>`.
 * Each call site gets its own pair of shared values, so multiple consumers
 * on the same screen animate independently.
 *
 * Behaviour (см. `02_Specification/06-ui-spec.md` § "Анимации"):
 *   - press in:  scale 1 → 0.97, opacity 1 → 0.85, 100 ms, ease-out.
 *   - press out: scale 0.97 → 1, opacity 0.85 → 1, 150 ms, ease-out.
 *   - Reduce Motion enabled: identity style, no withTiming side-effects
 *     (the press handlers become no-ops). Subscribes to
 *     `reduceMotionChanged` so the behaviour flips live without
 *     remount.
 */

export interface UseScaleOnPressResult {
  readonly animatedStyle: AnimatedStyle<ViewStyle>;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
}

export function useScaleOnPress(): UseScaleOnPressResult {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return (): void => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const scale = useSharedValue<number>(tokens.motion.press.scaleFrom);
  const opacity = useSharedValue<number>(tokens.motion.press.opacityFrom);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }),
    [scale, opacity],
  );

  const onPressIn = useCallback((): void => {
    if (reduceMotion) return;
    const easing = Easing.out(Easing.ease);
    scale.value = withTiming(tokens.motion.press.scaleTo, {
      duration: tokens.motion.press.durationInMs,
      easing,
    });
    opacity.value = withTiming(tokens.motion.press.opacityTo, {
      duration: tokens.motion.press.durationInMs,
      easing,
    });
  }, [reduceMotion, scale, opacity]);

  const onPressOut = useCallback((): void => {
    if (reduceMotion) return;
    const easing = Easing.out(Easing.ease);
    scale.value = withTiming(tokens.motion.press.scaleFrom, {
      duration: tokens.motion.press.durationOutMs,
      easing,
    });
    opacity.value = withTiming(tokens.motion.press.opacityFrom, {
      duration: tokens.motion.press.durationOutMs,
      easing,
    });
  }, [reduceMotion, scale, opacity]);

  return { animatedStyle, onPressIn, onPressOut };
}
