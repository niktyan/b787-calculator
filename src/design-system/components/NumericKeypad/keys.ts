export type NumericKeypadDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type NumericKeypadKey = NumericKeypadDigit | '.' | 'backspace';

// Visual layout of the keypad. 4 rows × 3 columns; last cell of row 4
// is the backspace key. Dot lives at row 4 col 1 so it sits diagonally
// opposite backspace and reads as the "leftmost punctuation" position
// pilots are used to from FMS / EFB scratchpads.
export const KEYPAD_LAYOUT: readonly (readonly NumericKeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];
