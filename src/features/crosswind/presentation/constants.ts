/**
 * Presentation-layer constants shared across Crosswind UI components and
 * the view-model.
 *
 * Spec: 02_Specification/06-ui-spec.md § Экран 4 → "Envelope-position bar".
 */

/**
 * CG axis upper bound (% MAC) for the EnvelopePositionBar.
 *
 * Chosen so the "out-of-lookup" zone is always visible to the right of
 * the lookup envelope at any operationally-realistic weight:
 *
 *   - lookupMax for W=110 t ≈ 33.8 % MAC
 *   - lookupMax for W=172 t ≈ 41.5 % MAC
 *
 * 50 % MAC keeps the marker comfortably inside the bar even for the
 * above-envelope Excel-quirk cases (CG = 42–50 → algorithm returns the
 * IFNA-fallback 40 KT). Documented in spec as the canonical axis upper
 * bound; do not change without coordinated update of the Visual
 * treatment subsection.
 */
export const ENVELOPE_BAR_CG_MAX_PERCENT = 50;
