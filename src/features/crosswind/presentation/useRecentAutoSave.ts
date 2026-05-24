/**
 * Auto-save side-effect for the Takeoff view-model (ADR-0016).
 *
 * Fires only when the calculator state is `idle` (a valid result has
 * been produced). The 500 ms debounce guarantees rapid input changes
 * collapse into a single save, and the effect cleanup cancels any
 * pending save when the user keeps typing.
 *
 * Errors from the storage layer are logged through `core/logger` and
 * never propagate up — auto-save is fire-and-forget.
 */

import { useEffect } from 'react';

import { logger } from '../../../core/logger';
import { saveRecent } from '../../../core/recent-storage';

import type { CrosswindCalculatorInputs, CrosswindUIState } from './useCrosswindCalculator';

const AUTO_SAVE_DEBOUNCE_MS = 500;

export function useRecentAutoSave(
  state: CrosswindUIState,
  inputs: CrosswindCalculatorInputs,
): void {
  useEffect(() => {
    if (state.kind !== 'idle') {
      return;
    }
    const knots = state.output.maxCrosswindKnots;
    const captured = inputs;
    const timer = setTimeout(() => {
      saveRecent({
        module: 'takeoff',
        inputs: {
          aircraft: captured.aircraft,
          weightTons: Number(captured.weightText.replace(',', '.')),
          cgPercent: Number(captured.cgText.replace(',', '.')),
          runwayCondition: captured.runwayCondition,
        },
        result: knots,
      }).catch((error: unknown) => {
        logger.error('crosswind: auto-save failed', error);
      });
    }, AUTO_SAVE_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [state, inputs]);
}
