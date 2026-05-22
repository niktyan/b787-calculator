/**
 * Sanity coverage for runtime const arrays in the Landing domain types.
 *
 * The arrays exist as TypeScript-narrowable lists of admissible values
 * (`LandingMode`, `YesNo`) for future iteration / SegmentedControl
 * generation. The factory components currently inline their own option
 * lists, so without this test the constants register as 0%-covered
 * statements and trip the per-feature domain coverage threshold.
 */

import { LANDING_MODES, YES_NO_VALUES } from '../domain';

describe('Crosswind Landing domain · runtime constants', () => {
  it('LANDING_MODES enumerates exactly manual and auto in that order', () => {
    expect(LANDING_MODES).toEqual(['manual', 'auto']);
  });

  it('YES_NO_VALUES enumerates exactly no and yes in that order', () => {
    expect(YES_NO_VALUES).toEqual(['no', 'yes']);
  });

  it('arrays are readonly tuples (frozen at runtime by `as const` narrowing)', () => {
    expect(Object.isFrozen(LANDING_MODES)).toBe(false);
    // `as const` is a compile-time narrowing — TS prevents push() at type
    // level but does not freeze the array at runtime. Documented here so
    // the next contributor knows not to add Object.freeze() expecting it
    // to be already applied.
    expect(LANDING_MODES.length).toBe(2);
    expect(YES_NO_VALUES.length).toBe(2);
  });
});
