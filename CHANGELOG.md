# Changelog

All notable changes to **B787 Tools** (formerly B787 Calculator) are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-06-11

### Added

- Crosswind Takeoff: FCOM CAUTION advisory line displayed under result
  panel (ADR-0020). Verbatim FCOM B787 Tab.2.29.2 text about reducing
  crosswind by 5 KT when thrust >40% N1 at brake release for static
  takeoff.

### Changed

- Crosswind Takeoff: runway condition control switched from segmented
  control to dropdown picker matching the Landing module pattern
  (ADR-0021). Adaptive presentation: anchored popover on iPad landscape,
  centred modal on iPhone + iPad portrait. 6-option taxonomy unchanged.
- Numeric keypad on iPhone: switched from anchored-popover to
  bottom-docked sheet for more natural input UX (ADR-0011 §Iteration 4).
  iPad keypad behavior unchanged.

### Fixed

- RunwayConditionPicker promoted from feature-local to design-system
  primitive (ADR-0021).
- NumericKeypadHost layout extracted into pure helper to satisfy
  max-lines-per-function lint.

## [1.1.1] - 2026-05-28

### Changed

- Crosswind (Takeoff): max crosswind output now rounds DOWN to 0.1 KT
  precision for all runway conditions (was integer). Conservative per
  FCOM presentation. (ADR-0017)
- Landing: runway condition "Good" split into two AFM-aligned variants —
  "Good (Wet, Damp)" and "Good (Slush, Dry Snow, Wet Snow)" — with
  distinct values per Boeing 787 FCOM Rev. 20. (ADR-0018)
- Landing screen: static layout, no scroll, Autoland-only toggles
  (CAT II-III, ONE ENG INOP) appear in pre-reserved slots without
  shifting other controls. (ADR-0019)
- In-app display name: "B787 Calculator" → "B787 Tools". Bundle ID
  unchanged.

## [1.1.0] - 2026-05-25

First publicly-targeted release. Apple App Review approved this build
but it was never released to the public — superseded by 1.1.1 before
publication. See git history for the full Sprint A–E scope.
