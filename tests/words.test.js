import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERS } from '../js/words.js';
import { ALLOWED } from '../js/allowed.js';
import { answerFor } from '../js/logic.js';

test('answers are unique 6-letter uppercase words', () => {
  assert.ok(ANSWERS.length > 1000);
  for (const w of ANSWERS) assert.match(w, /^[A-Z]{6}$/);
  assert.equal(new Set(ANSWERS).size, ANSWERS.length);
});

test('every answer is an allowed guess', () => {
  for (const w of ANSWERS) assert.ok(ALLOWED.has(w), w);
});

test('allowed list is 6-letter words and rejects junk', () => {
  for (const w of ALLOWED) assert.match(w, /^[A-Z]{6}$/);
  assert.ok(ALLOWED.has('PLANET'));
  assert.ok(!ALLOWED.has('QQQQQQ'));
});

test('puzzle order is fixed and wraps around', () => {
  // Pin the first puzzles so the shared order can't change by accident.
  assert.deepEqual([1, 2, 3].map(n => answerFor(n, ANSWERS)), ['DONATE', 'PETROL', 'CLOSET']);
  assert.equal(answerFor(ANSWERS.length + 1, ANSWERS), ANSWERS[0]);
});
