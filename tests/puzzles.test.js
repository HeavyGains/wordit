import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextNumber, saveForLater, resume, saved, isFinished } from '../js/puzzles.js';

const game = (puzzle, guesses = []) => ({ puzzle, answer: 'X', guesses, current: 'AB', status: 'playing' });

test('saved games keep guesses and come back out once', () => {
  const p = { next: 4, current: null, history: [] };
  saveForLater(p, game(3, ['PLANET']));
  assert.deepEqual(saved(p).map((g) => g.puzzle), [3]);
  assert.equal(saved(p)[0].current, '');
  const g = resume(p, 3);
  assert.deepEqual(g.guesses, ['PLANET']);
  assert.equal(resume(p, 3), null);
  assert.deepEqual(saved(p), []);
});

test('finished games are never saved for later', () => {
  const p = { next: 1, history: [] };
  saveForLater(p, { ...game(1), status: 'won' });
  assert.deepEqual(saved(p), []);
});

test('next puzzle steps over finished and saved ones', () => {
  const p = { next: 5, history: [{ puzzle: 5 }, { puzzle: 7 }], skipped: [game(6)] };
  assert.equal(nextNumber(p), 8);
  assert.ok(isFinished(p, 7));
  assert.ok(!isFinished(p, 6));
});
