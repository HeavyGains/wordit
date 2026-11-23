import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstEmpty, isComplete, typeLetter, backspace } from '../js/edit.js';

const typeAll = (word, len = 6) => {
  let s = { current: '', cursor: 0 };
  for (const ch of word) s = typeLetter(s.current, s.cursor, ch, len);
  return s;
};

test('typing left to right works as before', () => {
  assert.deepEqual(typeAll('PLANET'), { current: 'PLANET', cursor: 6, placed: 5 });
  assert.ok(isComplete('PLANET', 6));
});

test('typing past the end does nothing', () => {
  assert.deepEqual(typeLetter('PLANET', 6, 'X', 6), { current: 'PLANET', cursor: 6 });
});

test('a letter typed in the middle leaves a gap, then the cursor jumps right', () => {
  const s = typeLetter('', 3, 'N', 6);
  assert.deepEqual(s, { current: '   N', cursor: 4, placed: 3 });
  assert.equal(firstEmpty(s.current, 6), 0);
  assert.ok(!isComplete(s.current, 6));
});

test('after the last spot, the cursor wraps to the first gap', () => {
  const s = typeLetter('PL NET', 5, 'S', 6); // replace T, gap at 2
  assert.deepEqual(s, { current: 'PL NES', cursor: 2, placed: 5 });
});

test('replacing a letter in a full word moves the cursor past the end', () => {
  assert.deepEqual(typeLetter('PLANET', 2, 'O', 6), { current: 'PLONET', cursor: 6, placed: 2 });
});

test('backspace at the end removes the last letter', () => {
  assert.deepEqual(backspace('PLA', 3, 6), { current: 'PL', cursor: 2 });
  assert.deepEqual(backspace('PLANET', 6, 6), { current: 'PLANE', cursor: 5 });
});

test('backspace on a letter clears it and keeps the cursor there', () => {
  assert.deepEqual(backspace('PLANET', 2, 6), { current: 'PL NET', cursor: 2 });
});

test('backspace on a gap clears the letter before it, skipping gaps', () => {
  assert.deepEqual(backspace('P  N', 2, 6), { current: '   N', cursor: 0 });
});

test('backspace with nothing to clear does nothing', () => {
  assert.deepEqual(backspace('', 0, 6), { current: '', cursor: 0 });
  assert.deepEqual(backspace('   N', 0, 6), { current: '   N', cursor: 0 });
});

test('works for 5-letter mode', () => {
  assert.deepEqual(typeAll('RAISE', 5).current, 'RAISE');
  assert.deepEqual(typeLetter('', 4, 'E', 5), { current: '    E', cursor: 0, placed: 4 });
});
