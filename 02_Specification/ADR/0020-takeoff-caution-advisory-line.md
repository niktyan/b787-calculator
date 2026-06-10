# ADR-0020 · Takeoff CAUTION advisory line

**Status:** Accepted
**Date:** 2026-06-11
**Related:** `02_Specification/06-ui-spec.md` § Экран 4 → Result panel,
`02_Specification/module-contracts/crosswind.md`,
`02_Specification/ADR/0012-hide-result-on-operational-envelope-violation.md`,
`src/features/crosswind/presentation/components/CrosswindResult.tsx`,
`src/core/i18n/locales/en.json`,
`src/core/i18n/locales/ru.json`

## Context

The Boeing 787 FCOM, Tab.2.29.2 "Maximum Demonstrated Takeoff and
Landing Crosswind Components" (AFM Rev. 20), prints a footer note
under the takeoff crosswind table:

> CAUTION: Reduce all takeoff crosswind guidelines by 5 knots if
> thrust is above 40% N1 at brake release for takeoff roll (not
> rolling takeoff).

This caveat is operationally significant: a static (high-N1) brake
release behaves as a different aerodynamic regime than a rolling
takeoff and the FCOM-published crosswind limit must be reduced by
5 KT to remain advisory-conservative. Sprints A–F shipped the Takeoff
calculator without surfacing the footer; the value rendered as a
naked `KT` number with no caveat. A line pilot reading the result on
iPad would only see the headline value, with no visible link back to
the underlying FCOM caveat unless they happened to remember it.

The advisory line was therefore added to the result panel as a
persistent, low-prominence caption directly under the result number.

Three questions had to be resolved before implementation:

1. **When is the line visible?** The result panel has five UI states
   (`idle`, `empty`, `out-of-envelope`, `data-not-available`,
   `error`). Only `idle` produces a number derived from a real FCOM
   lookup; the other four either show a placeholder caption or an
   error string.
2. **Should the text be localized?** The B787 FCOM is published in
   English only; both EN and RU pilot communities consult the same
   English source document.
3. **Where in the layout?** The result Card is centred and visually
   dense; an advisory line has to coexist with the cockpit-glance
   number without distracting from it.

## Decision

### 1 · Visibility — `idle` state only

The CAUTION line is rendered **only when the result panel is in the
`idle` state** — i.e., the calculator returned a valid `KT` number
from a lookup or constant strategy with both inputs inside the
operational envelope and a successful bracket / formula resolution.

In all other states the line is **suppressed**:

- `out-of-envelope` — the calculator was either skipped (ADR-0012:
  inputs outside the operational envelope) or fell through with
  `NoLookupData`. The pilot already sees an explicit advisory caption
  ("Out of operational envelope — adjust inputs" / "Inputs cannot be
  evaluated by the lookup table"). Appending the FCOM CAUTION here
  would imply that the FCOM caveat applies to the (non-)result — it
  does not, because there is no result to reduce by 5 KT.
- `data-not-available` — the requested aircraft × condition pair is
  unimplemented in bundled data. Same reasoning as `out-of-envelope`:
  no number, no advisory to caveat.
- `empty` — fields are blank; no calculation has happened.
- `error` — `NaN/Infinity` / phase-mismatch / generic
  `CalculationFailed`. The error caption already conveys "do not act
  on a result"; rendering FCOM CAUTION here would be doubly
  misleading because it implies the error path can be corrected by
  reducing 5 KT.

This is the same suppression discipline introduced by ADR-0012 — when
the result panel does not render a number, it should not render
operational advice that would only apply to a number.

### 2 · Language — English only, in both EN and RU locales

The text is rendered **in English in both EN and RU locale builds**.
Reason: pilots reading the B787 FCOM never see a translated version;
the FCOM CAUTION is itself an English source string and the
operational meaning is preserved best by quoting it verbatim. This is
the same policy already applied to aviation primitives (`KT`, `MAC`,
`RWYCC`) that are FCOM-canonical and remain untranslated regardless
of UI language (CLAUDE.md Rule 9, AGENTS.md Rule 9).

Implementation: a single i18n key `crosswind.cautionText`. The
`en.json` and `ru.json` values are **byte-identical**:

> CAUTION: Reduce all takeoff crosswind guidelines by 5 knots if
> thrust is above 40% N1 at brake release for takeoff roll (not
> rolling takeoff).

The key still lives in i18n (rather than being inlined in JSX)
because Rule 9 routes every user-facing string through
`useTranslation()`. The identical-value-across-locales mechanism is
exactly the same pattern used by the existing `crosswind.title`
("Crosswind · Takeoff" in both locales).

### 3 · Visual placement — under the value, inside the Card

The CAUTION line lives **inside the same result Card** as the
status label and value row, rendered directly under the `KT` number
with `marginTop: tokens.spacing.md` (12 pt) of breathing space.
Typography token `body` (16 pt sans 400-weight); colour token
`textSecondary` so it reads as supplementary information rather than
a second readout.

**Follow-up (G1 typography bump).** The caption originally shipped at
the `caption` variant (12 pt). Pilot feedback after the G1 merge:
the 12 pt caption read too small relative to the result number on
both iPhone and iPad, especially at typical cockpit viewing distance.
The variant was promoted one tier to `body` (16 pt sans 400-weight) —
the next-larger size in the existing token system that still keeps
the textSecondary colour and supplementary visual weight. `label`
(12 pt sans 600-weight) was rejected because it is the same font
size as `caption`; only `body` delivers an actual size bump without
introducing a new typography token.

**Follow-up #2 (G1 line cap dropped).** After the `body` bump, the
verbatim FCOM string wrapped to more than 3 lines on iPhone compact
and the `numberOfLines={3}` clamp ellipsized the tail
("(not rolling takeoff).") — losing operationally critical wording.
The cap was removed entirely. The CAUTION string is bounded by its
i18n key (a verbatim FCOM quote, fixed-length), so unbounded wrap is
safe across every supported viewport from iPhone SE through iPad 13".
The Card has no fixed-height constraint on the inner stack, so it
grows to fit the wrapped text.

The line is centred horizontally to match the centred value row, the
max width is capped to the compact (280 pt) or regular (380 pt)
caption-width budget — same budget already used by the empty and
out-of-envelope captions — and the text is allowed to wrap up to
**3 lines** (`numberOfLines={3}`) so it always fits in the iPhone
compact width without truncation. iPad regular reuses the same
caption variant — the surrounding Card and value typography scale up
but the CAUTION caption is intentionally kept at the supplementary
weight so it never competes visually with the number.

The line is part of the Card's accessibility group, so VoiceOver
reads it **after** the value (DOM order). RN's default behaviour
treats the text content as the accessibility label, which means the
verbatim FCOM caveat is read in full — the safety information is
preserved for screen-reader users without an override.

## Consequences

**Positive:**

- The FCOM CAUTION footer is surfaced at the exact moment a pilot
  reads the result number, closing the gap between the calculator
  output and the source caveat.
- Visibility scoping (idle only) preserves ADR-0012's "no number → no
  operational caveat" discipline. The two ADRs reinforce the same
  principle: the result panel never displays operational advice
  detached from a real value.
- Localization-by-non-localization for English-source aviation
  content keeps the policy uniform across the calculator (status
  label, runway-condition labels, `KT`, `MAC`).
- A single shared i18n key means the FCOM text is changed in exactly
  one place if a future AFM revision rewords the caveat.

**Negative:**

- The Card grows slightly in vertical height when the idle state is
  reached — about 3 caption lines + 12 pt margin. iPhone SE (the
  tightest viewport) was verified to still fit the input form +
  result card without scroll. iPad regular has comfortable headroom.
- Pilots who already know the caveat by heart see a persistent line
  they may consider visual clutter. The countervailing safety
  consideration (a non-familiar pilot, a fatigued pilot, or a
  PIC briefing a junior pilot) outweighs the clutter cost.

**Neutral:**

- Landing module (out of scope for G1) does not get a CAUTION line.
  The FCOM landing crosswind table has different caveats (already
  encoded as ADR-0014's CAUTION adjustments — applied numerically
  inside the calculator rather than as advisory text). If a future
  sprint decides the Landing module needs an analogous footer, this
  ADR is the pattern to follow.

## Alternatives considered

**(a) Render the CAUTION on every state, including `out-of-envelope`
and `data-not-available`.** Rejected. Displaying the FCOM caveat
under a "no result" caption implies the caveat applies to the
non-result, which is misleading. ADR-0012 already established that
the result panel withholds operational advice when no number is
shown.

**(b) Translate the CAUTION text into Russian for the RU build.**
Rejected. The B787 FCOM is an English-source document; the operating
manual on the pilot's iPad is English-only, and the translation
introduces both an extra source of drift (FCOM rev × translation
rev) and an interpretation risk for terms like "rolling takeoff" that
are FCOM-canonical phrases. Aligns with CLAUDE.md Rule 9 / AGENTS.md
Rule 9.

**(c) Show the CAUTION as a tooltip / collapsible / "i" affordance
the pilot taps to expand.** Rejected. The whole point of surfacing
the caveat at the result is that the pilot sees it at the same scan
moment as the number. A tap-to-reveal affordance defeats the safety
intent (the same reason ADR-0012 rejected a chip-next-to-the-number
treatment — the pilot can register the number before they register
an interactive affordance).

**(d) Render the CAUTION as a dedicated banner above or below the
Card.** Rejected. Splitting the caveat away from the Card disconnects
it visually from the value it qualifies; a banner above the Card
either competes with the screen header or floats untethered. Keeping
the caveat inside the Card preserves the "result + its caveat" as a
single visual unit.

**(e) Increase emphasis (bold / red / larger font) to make the
CAUTION more prominent.** Rejected. The CAUTION is *advisory*, not
critical-error. Raising the visual weight would compete with the
value number itself, which is the primary cockpit-glance target.
`caption` variant + `textSecondary` colour matches the supplementary
intent.
