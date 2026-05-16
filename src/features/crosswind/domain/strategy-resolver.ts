/**
 * `resolveStrategy` — looks up the per-(aircraft, runwayCondition)
 * dataset inside a parsed lookup file and constructs a
 * `CrosswindStrategy` for it. Returns `{kind: 'no-lookup-data'}` when
 * the combo is missing, which the top-level calculator translates into
 * `DataNotAvailable.{reason}`.
 *
 * Spec: 02_Specification/05-crosswind-algorithm.md § "Strategy variants",
 *       02_Specification/module-contracts/crosswind.md § "Public API".
 *
 * PR 1 wires only the `bracketedLinear` branch. Future strategies will
 * extend the switch; the discriminated union in `data/schema.ts` keeps
 * the set of strategyType literals exhaustive at the type level.
 */

import type { CrosswindDataFile } from '../data/schema';

import { createBracketedLinearStrategy } from './strategies/bracketed-linear';
import type { StrategyResolution } from './strategy';
import type { Aircraft, RunwayCondition } from './types';

export function resolveStrategy(
  aircraft: Aircraft,
  condition: RunwayCondition,
  data: CrosswindDataFile,
): StrategyResolution {
  const aircraftEntry = data.byAircraft[aircraft];
  if (aircraftEntry === undefined) {
    return { kind: 'no-lookup-data', reason: 'aircraft-not-implemented' };
  }
  const dataset = aircraftEntry[condition];
  if (dataset === undefined) {
    return { kind: 'no-lookup-data', reason: 'condition-not-implemented' };
  }

  if (dataset.strategyType === 'bracketedLinear') {
    return {
      kind: 'strategy',
      strategy: createBracketedLinearStrategy(dataset.params, {
        aircraft,
        dataVersion: data.dataVersion,
        referenceDocument: dataset.metadata.referenceDocument,
        tonsToKilolbsFactor: data.weightConversion.tonsToKilolbsFactor,
      }),
    };
  }

  // Future strategies (variableSlopeBracketed / cgOnlyPiecewise /
  // constant / notAllowed) — their schemas currently reject all data at
  // parse-time, so this branch is unreachable in PR 1. Returning
  // condition-not-implemented matches the user-facing semantics if it
  // were somehow reached (e.g. a future data drop ahead of the
  // corresponding strategy implementation).
  return { kind: 'no-lookup-data', reason: 'condition-not-implemented' };
}
