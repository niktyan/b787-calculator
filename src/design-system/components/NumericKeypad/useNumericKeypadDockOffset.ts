/**
 * Public hook for screens that need to reserve vertical space when the
 * iPhone-compact numeric keypad bottom-docks (ADR-0011 Iteration 4).
 *
 * Returns the number of pt the screen content should reserve at the
 * bottom (e.g., via `paddingBottom` on a ScrollView contentContainer)
 * so the active field can scroll above the keypad's top edge.
 *
 *   - keypad closed → 0
 *   - keypad open on wide viewport (>= 768 pt) → 0 (the wide popover
 *     is anchored, not docked; the screen has no obligation to scroll)
 *   - keypad open on compact viewport → KEYPAD_HEIGHT + safe-area bottom
 *
 * Kept separate from `useNumericKeypadContext` so screens don't have to
 * destructure the keypad's full state surface for what is, on the
 * caller side, a single layout-padding number.
 */

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMPACT_WIDTH_BREAKPOINT } from '../../anchored-popover/computeAnchoredPosition';

import { KEYPAD_HEIGHT_COMPACT, KEYPAD_HEIGHT_REGULAR } from './NumericKeypadHostMetrics';
import { useNumericKeypadContext } from './NumericKeypadContext';

export function useNumericKeypadDockOffset(): number {
  const { activeFieldId, activeIsRegular } = useNumericKeypadContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (activeFieldId === null) {
    return 0;
  }
  if (width >= COMPACT_WIDTH_BREAKPOINT) {
    return 0;
  }
  const keypadHeight = activeIsRegular ? KEYPAD_HEIGHT_REGULAR : KEYPAD_HEIGHT_COMPACT;
  return keypadHeight + insets.bottom;
}
