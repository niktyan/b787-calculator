/**
 * Auto-save side-effect for the Landing view-model (ADR-0016).
 *
 * Fires only when the calculator state is `idle` (the categorical
 * lookup produced a number). The 500 ms debounce collapses rapid
 * toggle changes into a single save; the effect cleanup cancels any
 * pending save while the user is still flipping toggles.
 *
 * Errors from the storage layer are logged through `core/logger` and
 * never propagate up — auto-save is fire-and-forget.
 */

import { useEffect } from 'react';

import { logger } from '../../../core/logger';
import { saveRecent } from '../../../core/recent-storage';

import type { CrosswindLandingUIState } from './useCrosswindLandingCalculator';
import type { CrosswindLandingInput } from '../domain/types';

const AUTO_SAVE_DEBOUNCE_MS = 500;

export function useRecentAutoSave(
  state: CrosswindLandingUIState,
  inputs: CrosswindLandingInput,
): void {
  useEffect(() => {
    if (state.kind !== 'idle') {
      return;
    }
    const knots = state.output.maxCrosswindKnots;
    const captured = inputs;
    const timer = setTimeout(() => {
      saveRecent({
        module: 'landing',
        inputs: {
          aircraft: captured.aircraft,
          runwayCondition: captured.runwayCondition,
          landingMode: captured.landingMode,
          asymReverse: captured.asymReverse,
          catIIIII: captured.catIIIII,
          engineInop: captured.engineInop,
        },
        result: knots,
      }).catch((error: unknown) => {
        logger.error('crosswind-landing: auto-save failed', error);
      });
    }, AUTO_SAVE_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [state, inputs]);
}
