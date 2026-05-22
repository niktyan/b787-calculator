import { sanitizeDecimalInput } from '../sanitizeDecimalInput';

describe('sanitizeDecimalInput', () => {
  // Defence-in-depth normalizer used by both `NumericKeypadProvider.pressKey`
  // (where it runs in production on every digit / decimal-separator key
  // press) and by `NumericInput.onChangeText` (dead path under
  // `editable={false}`, kept as future-proofing). See ADR-0011.
  const cases: readonly (readonly [string, string, string])[] = [
    ['strips letters mixed into a decimal value', '12abc.5kg', '12.5'],
    ['normalizes the European decimal comma to a dot', '12,5', '12.5'],
    ['keeps only the first dot when multiple dots are entered', '12.5.7', '12.57'],
    ['treats a comma after a dot as a duplicate separator', '12.5,7', '12.57'],
    ['returns an empty string when input has no digits', 'abc', ''],
    ['preserves a leading dot (user is mid-typing ".5")', '.5', '.5'],
    ['preserves a trailing dot (user is mid-typing "12.")', '12.', '12.'],
    ['passes through a clean integer unchanged', '170', '170'],
    ['passes through a clean decimal unchanged', '25.5', '25.5'],
    ['returns an empty string for an empty input', '', ''],
  ];

  it.each(cases)('%s', (_label, raw, expected) => {
    expect(sanitizeDecimalInput(raw)).toBe(expected);
  });
});
