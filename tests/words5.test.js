import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERS5 } from '../js/words5.js';
import { ALLOWED5 } from '../js/allowed5.js';
import { ANSWERS } from '../js/words.js';
import { answerFor } from '../js/logic.js';
import { expectedLeft } from '../js/quality.js';

test('5-letter answers are unique uppercase words, all allowed', () => {
  assert.ok(ANSWERS5.length > 1000);
  for (const w of ANSWERS5) assert.match(w, /^[A-Z]{5}$/);
  assert.equal(new Set(ANSWERS5).size, ANSWERS5.length);
  for (const w of ANSWERS5) assert.ok(ALLOWED5.has(w), w);
});

test('5-letter allowed list is 5-letter words and rejects junk', () => {
  for (const w of ALLOWED5) assert.match(w, /^[A-Z]{5}$/);
  assert.ok(ALLOWED5.has('CRANE'));
  assert.ok(!ALLOWED5.has('QQQQQ'));
});

test('5-letter puzzle order is fixed', () => {
  assert.deepEqual([1, 2, 3].map((n) => answerFor(n, ANSWERS5)), ['TRACE', 'RABBI', 'PACED']);
});

test('stored best 5-letter opener matches the list', () => {
  // RAISE is the best opener for the 1,296 answers; update quality.js if words are appended.
  assert.equal(ANSWERS5.length, 1296);
  assert.notEqual(ANSWERS5.length, ANSWERS.length); // quality.js caches by list size
  assert.equal(expectedLeft('RAISE', ANSWERS5), 30.621913580246915);
});
