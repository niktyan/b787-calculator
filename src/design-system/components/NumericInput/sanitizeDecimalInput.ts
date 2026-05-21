const NON_NUMERIC_CHARS_PATTERN = /[^0-9.,]/g;
const COMMA_PATTERN = /,/g;
const DOT_PATTERN = /\./g;
const DECIMAL_SEPARATOR = '.';
const NOT_FOUND = -1;
const NEXT_INDEX = 1;

// Defence-in-depth normalizer for numeric inputs. iPad's system keyboard
// exposes an "ABC" mode that can inject letters into a `decimal-pad`
// field, and paste / 3rd-party keyboards can deliver arbitrary text.
// We strip non-digits, normalize the European decimal comma to a dot,
// and keep only the first decimal separator. See 06-ui-spec.md
// § Экран 4 "Keyboard behavior".
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw
    .replace(NON_NUMERIC_CHARS_PATTERN, '')
    .replace(COMMA_PATTERN, DECIMAL_SEPARATOR);
  const firstDot = cleaned.indexOf(DECIMAL_SEPARATOR);
  if (firstDot === NOT_FOUND) {
    return cleaned;
  }
  const head = cleaned.slice(0, firstDot + NEXT_INDEX);
  const tail = cleaned.slice(firstDot + NEXT_INDEX).replace(DOT_PATTERN, '');
  return head + tail;
}
