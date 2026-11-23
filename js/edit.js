// Editing the guess being typed, with a cursor so letters can go in any spot.
// No DOM here, so it can be unit tested in Node.
// The guess is a string where ' ' marks an empty spot; trailing blanks are trimmed.

const tidy = (slots) => slots.join('').replace(/ +$/, '');

function slotsOf(current, len) {
  return Array.from({ length: len }, (_, i) => (current[i] && current[i] !== ' ' ? current[i] : ' '));
}

// Where the cursor sits by default: the first empty spot, or past the end when full.
export function firstEmpty(current, len) {
  const i = slotsOf(current, len).indexOf(' ');
  return i === -1 ? len : i;
}

export function isComplete(current, len) {
  return firstEmpty(current, len) === len;
}

// Put a letter at the cursor (replacing what's there), then move to the next empty
// spot to the right, else the first empty spot anywhere, else past the end.
export function typeLetter(current, cursor, letter, len) {
  if (cursor >= len) return { current, cursor };
  const slots = slotsOf(current, len);
  slots[cursor] = letter;
  let next = slots.indexOf(' ', cursor + 1);
  if (next === -1) next = slots.indexOf(' ');
  if (next === -1) next = len;
  return { current: tidy(slots), cursor: next, placed: cursor };
}

// Backspace: clear the letter under the cursor if there is one,
// otherwise clear the letter before the cursor and step back onto it.
export function backspace(current, cursor, len) {
  const slots = slotsOf(current, len);
  if (cursor < len && slots[cursor] !== ' ') {
    slots[cursor] = ' ';
    return { current: tidy(slots), cursor };
  }
  let i = Math.min(cursor, len) - 1;
  while (i > 0 && slots[i] === ' ') i--; // skip over gaps
  if (i < 0) return { current, cursor };
  slots[i] = ' ';
  return { current: tidy(slots), cursor: i };
}
