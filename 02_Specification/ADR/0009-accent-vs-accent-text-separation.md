# ADR-0009 · Light-theme accent text contrast — split `accent` into `accent` + `accentText`

**Status:** Accepted
**Date:** 2026-05-15
**Related:** `02_Specification/06-ui-spec.md` § «Темы и design tokens», `02_Specification/08-quality-gates.md` § «Audit findings», `02_Specification/module-contracts/design-system.md` § «Цвета (canonical)», `src/design-system/tokens.ts`

## Context

The pre-submission accessibility audit (PR `chore/accessibility-audit`,
`08-quality-gates.md` § Audit findings, 2026-05-15) found that the
brand accent `#00C2A8` (teal) on the light-theme page surface
`#F4F6F9` yields a WCAG contrast ratio of **2.09:1**, and on the light
card surface `#FFFFFF` yields **2.26:1**. Both fail WCAG SC 1.4.3 AA
for body text (threshold 4.5:1) and also fail the SC 1.4.3 AA-Large
threshold (3:1) for large text.

Concrete consumers of `accent` as a **text or icon foreground** in the
shipping app:

- `Crosswind` / `ResultPanel` idle status label («MAX CROSSWIND ·
  TAKEOFF», microUppercase 9pt — small caption sits squarely in the
  4.5:1 bucket).
- `NavPills` active tab label (caption 12pt).
- `BackButton` arrow and label (body 16pt).
- `BottomSheetOption` ✓ check glyph.
- `Button` `secondary` and `ghost` variant text labels.
- `NavigableSettingsRow` value text + chevron icon when
  `valueColor="accent"` (used by About → Privacy policy / Terms of
  use / Support — every external-destination affordance).

The audit also identified **decorative** consumers that are exempt
from text contrast requirements (WCAG SC 1.4.11 / SC 1.4.3 informative
exclusion for decoration and inactive UI parts):

- Active module card border, segmented-control active segment fill,
  Toggle ON track, Button primary fill, BottomSheet selected option
  border, NumericInput focused border, splash + disclaimer logo
  surface fill, gradients.
- Module-icon glyph and B7 logo glyph sit on `accentSoft`, not on the
  page surface; they read at a comfortable contrast on the soft
  background and are decorative brand marks.
- The large crosswind display value (48–96pt) is large text where the
  3:1 threshold applies, but it is also decorative-result content
  paired with the unit suffix and the status label.

Dark theme passes WCAG AA for every consumer (`accent` on `bgScreen`
= 8.4:1, on `bgCard` = 8.1:1). The issue is exclusive to light theme.

The project is in Phase D, days from App Store submission. Apple App
Review flags accessibility issues on a case-by-case basis but
contrast failures on primary text are a known rejection trigger.

## Decision

Introduce a **theme-aware text/icon foreground variant** of the brand
accent, named `accentText`, alongside the existing `accent`:

- `tokens.colors.dark.accentText = '#00C2A8'` — identical to dark
  `accent`. Dark cockpit mode is unchanged.
- `tokens.colors.light.accentText = '#006B5E'` — darker variant of
  the brand teal. Measured contrast:
  - on `bgScreen` (`#F4F6F9`): ~**5.94:1** (passes AA, near-AAA).
  - on `bgCard` (`#FFFFFF`): ~**6.43:1** (passes AA, AAA).
  - on `accentSoft` (`#DEF7F3`): ~**5.72:1** (passes AA).

Migrate every text or icon foreground usage of `accent` to
`accentText`. Keep `accent` itself for **decorative surfaces, fills,
borders, focus rings, and gradients** — where contrast is not a
body-text concern and the brand teal remains visually consistent.

The consumer-facing API on `NavigableSettingsRow`
(`valueColor: 'textSecondary' | 'accent'`) stays unchanged: the
`'accent'` value continues to mean "strong-interactivity signal" from
the caller's perspective, and internally the row maps it to
`accentText` for both value text and chevron tone.

## Consequences

**Positive:**

- All text and icon foreground usages of accent in light theme now
  pass WCAG SC 1.4.3 AA. The contrast audit table in
  `08-quality-gates.md` § Audit findings is updated to reflect AA
  pass across the board for text colors.
- Dark theme appearance is **unchanged**: `accentText === accent`
  there. The cockpit-first user (primary persona per `01-vision.md`)
  sees no visible difference.
- The light-theme accent text shifts from bright teal `#00C2A8` to a
  darker teal `#006B5E`. The brand hue is preserved (same H in HSL,
  lower L); the text is recognisably the brand colour but reads
  cleanly on cream and white.
- Snapshot diffs are limited to light-theme renderings of the
  migrated components.

**Negative:**

- A second token to maintain. Future contributors must remember to
  pick `accentText` for foregrounds and `accent` for surfaces. This
  is documented in the `tokens.ts` JSDoc and in
  `module-contracts/design-system.md`, and pinned by token-level
  tests in `tokens.test.ts`.
- The light-theme brand identity is slightly less bold (the bright
  teal moved from active-tab labels and result status to a darker
  variant). For light theme this is a deliberate accessibility
  trade-off; for dark theme nothing changes.

**Neutral:**

- The split mirrors the existing `accent` / `accentOnAccent` split:
  one canonical brand colour, multiple foreground tokens chosen by
  surface. The pattern is internally consistent.

## Alternatives considered

**(a) Darken the light-theme page background instead.** Move `bgPage` /
`bgScreen` from `#F4F6F9` toward a mid-grey so brand `#00C2A8` reads
on top. Rejected: changes the overall light-theme identity (currently
intentionally bright for briefing-room and outdoor iPad use per
`01-vision.md` § Light theme rationale), and ripples through every
other text colour that currently sits comfortably on the cream
surface.

**(b) Restrict `accent` text usage to dark theme only.** In
`<Text color="accent">` we could special-case the resolved theme:
return `accent` for dark, `textSecondary` for light. Rejected: some
labels need brand colour in both themes (active NavPill, About row
affordances, result status) — falling back to `textSecondary` strips
the interactivity signal. The split-token approach keeps both themes
visually equivalent in intent.

**(c) Defer to post-launch.** Document the failure as a known
limitation in `08-quality-gates.md` and ship. Rejected: Apple App
Review treats accessibility contrast failures on primary text as a
likely rejection trigger; the fix is small, well-scoped, and the
audit explicitly flagged it for pre-submission resolution.

**(d) Single `accent` token, change its value globally.** Move
`accent` from `#00C2A8` to `#006B5E` for both themes. Rejected: the
brand teal `#00C2A8` is the single most recognisable visual element
of the product (mockups, marketing surfaces planned for App Store
screenshots). A darker teal in dark theme would feel muddy at low
ambient light in cockpit use, which is the primary persona.
