# ADR-0016 · Recent calculations persistence

**Status:** Accepted
**Date:** 2026-05-24
**Related:** `02_Specification/01-vision.md` § «Что входит в MVP»,
`02_Specification/02-architecture.md` § «Module Communication Patterns»,
`02_Specification/04-domain-model.md` § «Recent calculation entries»,
`02_Specification/06-ui-spec.md` § «Экран · Recent Calculations»,
`02_Specification/module-contracts/recent.md`,
`02_Specification/module-contracts/core.md` § «`core/recent-storage`»,
`src/core/recent-storage/`,
`src/features/recent/`

## Context

Sprint D adds **Recent Calculations** — Apple App Store resubmit
roadmap requires the app to feel stateful between sessions, not a
"calculator that forgets". Two distinct concerns appear at once:

1. **Two feature modules need to write to the same store.** Crosswind
   Takeoff and Crosswind Landing both produce calculations the pilot
   may want to revisit. Cross-feature imports are forbidden by
   `02-architecture.md`; both features need a shared place to write.

2. **A third presentation surface needs to read from the same store.**
   The new Recent screen lists prior entries and lets the pilot tap one
   to restore the original inputs in the originating calculator. The
   Recent screen must not know about either crosswind module's domain
   internals — it works against a generic envelope of `RecentEntry`
   values.

A third concern is data resilience: AsyncStorage may hold corrupted or
schema-incompatible payloads (older app version, hand-edited backup,
half-written write at force-quit). The store has to fail safe to "no
entries" rather than crash the screen.

## Decision

Place the **storage layer** in `core/recent-storage/` — a new
core submodule alongside the existing `core/storage/`. The feature
module `features/recent/` consumes it for presentation. Both crosswind
features write to it through the same public API. No feature → feature
imports are required; the architectural rule holds.

**Why a new submodule, not an extension of `core/storage`.** The
existing `core/storage` is a typed `Record<StorageKey, Value>` map
with debounced single-key writes. Recent calculations are a single
*list* with list-shaped operations (append-with-dedupe, remove-by-id,
clear, FIFO eviction). Squeezing list semantics into the
fixed-key map would either bend the existing API or wrap a JSON
string inside a single key — both worse than a sibling module that
encodes the list semantics directly.

**Storage shape.** A single AsyncStorage key
`b787.recentCalculations` holds a JSON-encoded `RecentStorageFile`:

```ts
{
  schemaVersion: 1,
  entries: ReadonlyArray<RecentEntry>  // newest first
}
```

`RecentEntry` is a discriminated union by `module: 'takeoff' | 'landing'`,
each carrying:
- `id: string` — local unique id (`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`); fine for sort and React keys, no security implications.
- `timestamp: string` — ISO UTC.
- `module: 'takeoff' | 'landing'`.
- `inputs` — the exact value-object-free input shape needed to restore the originating screen.
- `result: number` — `maxCrosswindKnots` (integer).
- `fingerprint: string` — deterministic JSON of `{module, inputs}`; used for dedupe.

The store is validated through a `zod` schema on every load.
Schema mismatch, corrupted JSON, or any other read failure resolves to
an empty list and logs through `core/logger`. The storage key is
**not cleared on a parse failure** — a future app version with a
migration might still be able to read the bytes. Until then the user
just sees an empty Recent screen.

**Auto-save in view-models with a 500 ms debounce.** Each calculator
view-model (`useCrosswindCalculator`,
`useCrosswindLandingCalculator`) holds a ref that tracks the
last-saved fingerprint. A `useEffect` keyed on `state.kind === 'idle'`
schedules a save 500 ms after the last input change; the cleanup
cancels the pending save if the user keeps typing. The save is
fire-and-forget — errors are logged, the UI is not blocked.

**Dedupe by fingerprint.** When a new entry is saved with the same
fingerprint as an existing one, the existing entry is removed and the
new one is inserted at the head (same content, fresh timestamp).
This prevents the list from filling with identical "weight=170,
CG=32, Dry → 34 KT" entries when the pilot toggles a different
field and comes back.

**FIFO cap at 20.** When the list reaches 20 entries, the oldest one
is dropped before insertion. The cap is a `const` in
`recentStorage.ts`. 20 fits on a single iPad screen without scrolling
and stays well within AsyncStorage's per-key payload limits.

**Restoration via route query param.** Tapping an entry in Recent
navigates to `/crosswind?recentEntryId=<id>` (or
`/crosswind-landing?recentEntryId=<id>`). The originating screen
reads the param via expo-router's `useLocalSearchParams`, loads the
entry from `core/recent-storage`, and prefills state on mount. If
the entry is missing or its `module` field doesn't match the screen
the user landed on, the screen falls back to default state — no
crash, no error toast.

## Consequences

**Positive:**
- Clean separation: features write without knowing each other; Recent
  reads without knowing feature internals.
- Single storage key, single schema — easy to inspect through dev
  tooling and easy to back up.
- Dedupe means the list reflects *meaningful* changes, not keystrokes.
- The 500 ms debounce is generous enough that rapid keystroke spam
  produces one save, not 12.
- Restoration through a URL query param is REST-style — no global
  pending-state, no implicit coupling between Recent and the
  calculator screens.

**Negative:**
- Schema versioning is required for any future field change.
  `schemaVersion: 1` is reserved; a migration helper will need to
  appear in `recent-storage` before bumping to 2.
- 500 ms debounce delays the first save by half a second — acceptable
  for the spam-prevention benefit, but means the user could background
  the app before a single calculation is saved. Considered fine; the
  UX value of "every keystroke saved" is negative anyway.
- The Recent screen relies on the calculator screens to know their own
  domain inputs. If a future PR changes the takeoff input shape, the
  Recent entries from the prior schema must either be migrated or
  dropped. The schema version field makes both options viable.

**Neutral:**
- ID generation uses `Date.now() + Math.random` — local-only, no
  security need for cryptographic randomness, no new dependency
  pulled in.
- `date-fns` is already in the project dependencies and is used by
  the Recent screen for relative-time labels
  (`formatDistanceToNow(date, { addSuffix: true })`).
- The Main Menu now shows three cards: Takeoff, Landing, Recent.
  Snapshot tests of the menu regenerate as a result.

## Alternatives considered

**(a) Extend `core/storage` with a generic list key.** Rejected:
`core/storage` is a `Record<StorageKey, Value>` with debounced
single-value writes. Append/dedupe/cap/remove-by-id semantics belong
to a list type, not a typed map. Forcing list operations through the
single-value API would either leak through (`set('recent', wholeList)`
on every operation) or require parallel APIs alongside the map.

**(b) Per-feature recent files (`recent-takeoff`, `recent-landing`).**
Rejected: the Recent screen would need to merge two stores and reason
about two schemas, and FIFO across both wouldn't be cleanly possible
without a coordinator. Single store with discriminated-union entries
keeps Recent simple.

**(c) Save from the screen component, not the view-model.** Rejected:
saving from the view-model means the rule "any path that produces a
valid result is saved" is enforced in one place. If a future feature
adds a third entry-point to the calculator (e.g., from a deep-link),
the auto-save logic doesn't need to be duplicated.

**(d) Direct cross-feature import (Recent imports both
`features/crosswind` and `features/crosswind-landing`).** Rejected by
the cross-feature import rule in `02-architecture.md`; even if it
were allowed, Recent would couple to two domain models and become a
choke point for every future calculator feature.

**(e) Push-pending-state into a React Context for restoration instead
of a route query param.** Rejected: query param survives a deep-link,
survives an app cold-start, survives a back-then-forward navigation
sequence. A Context pending-state needs to be cleared on consumption
and reset on the next render to avoid stale prefill; routes are
self-describing.

## Future

- **Phase 2:** swipe-to-delete on individual rows (currently a
  delete is only available through the screen's "Clear All" — fine
  for MVP).
- **Phase 2:** favorites / pinning of frequently used inputs
  (one-tap recall).
- **Phase 3:** PDF export of the recent list.
- **Phase 3 (subject to privacy review):** iCloud sync of recent
  entries across pilot's iPads. Has to clear App Store privacy
  manifest first — non-trivial because iCloud requires CloudKit
  declarations.
- **Schema migration:** when a calculator input shape changes, the
  recent-storage loader runs a per-version migrator. The
  `schemaVersion: 1` payload is the baseline.
