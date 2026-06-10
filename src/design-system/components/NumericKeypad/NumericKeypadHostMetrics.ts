/**
 * Internal metrics for the numeric keypad popover container.
 *
 * Extracted into its own module so both the host (which renders the
 * Modal) and the public `useNumericKeypadDockOffset` hook (used by
 * screens to reserve scroll space below the active field) can read the
 * same numbers without re-importing the host. Kept off the design-
 * system barrel — these are implementation details, not public API.
 *
 * Height math is documented inline in `NumericKeypadHost.tsx`.
 * ADR-0011 Iteration 3 § Done button containment.
 */

export const KEYPAD_HEIGHT_COMPACT = 304;
export const KEYPAD_HEIGHT_REGULAR = 352;
