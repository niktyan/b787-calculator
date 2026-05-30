# Changelog

All notable changes to **B787 Tools** (formerly B787 Calculator) are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
