import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../js/stats.js';

const g = (n, won) => ({ puzzle: 1, answer: 'PLANET', guesses: Array(n).fill('GARDEN'), won });

test('empty history', () => {
  const s = computeStats([]);
  assert.equal(s.played, 0);
  assert.equal(s.winPct, 0);
  assert.equal(s.avgGuesses, null);
  assert.deepEqual(s.dist, [0, 0, 0, 0, 0, 0, 0]);
});

test('streaks, win %, distribution and average', () => {
  const s = computeStats([g(3, true), g(4, true), g(7, false), g(2, true), g(4, true), g(5, true)]);
  assert.equal(s.played, 6);
  assert.equal(s.wins, 5);
  assert.equal(s.winPct, 83);
  assert.equal(s.currentStreak, 3);
  assert.equal(s.maxStreak, 3);
  assert.deepEqual(s.dist, [0, 1, 1, 2, 1, 0, 0]);
  assert.equal(s.avgGuesses, 3.6);
});

test('loss at the end resets current streak only', () => {
  const s = computeStats([g(3, true), g(3, true), g(7, false)]);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.maxStreak, 2);
});
