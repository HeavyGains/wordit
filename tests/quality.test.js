import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGame, gameSkill, qualityStats, expectedLeft } from '../js/quality.js';
import { ANSWERS } from '../js/words.js';

const POOL = ['PLANET', 'PLANES', 'PLANKS', 'GARDEN', 'MARKET', 'BASKET'];

test('words left shrink with each guess and end at 1 on a win', () => {
  const rows = analyzeGame(['GARDEN', 'PLANKS', 'PLANET'], 'PLANET', POOL);
  assert.deepEqual(rows.map((r) => r.before), [6, rows[0].after, rows[1].after]);
  assert.equal(rows[2].after, 1);
  for (const r of rows) assert.ok(r.skill >= 0 && r.skill <= 100);
});

test('typing the only word left is free and not averaged', () => {
  const rows = analyzeGame(['PLANKS', 'PLANES', 'PLANET'], 'PLANET', ['PLANET', 'PLANES', 'PLANKS']);
  const last = rows[rows.length - 1];
  assert.equal(last.before, 1);
  assert.equal(last.free, true);
  assert.equal(gameSkill([last]), null);
});

test('guesses after the answer is pinned down are not scored', () => {
  // GARDEN leaves only PLANET; MARKET and BASKET miss it, then PLANET is free.
  const pool = ['PLANET', 'GARDEN', 'MARKET', 'BASKET'];
  const rows = analyzeGame(['GARDEN', 'MARKET', 'BASKET', 'PLANET'], 'PLANET', pool);
  assert.equal(rows[0].after, 1);
  assert.deepEqual(rows.slice(1, 3).map((r) => [r.settled, r.skill]), [[true, null], [true, null]]);
  assert.equal(rows[3].free, true);
  assert.equal(gameSkill(rows), rows[0].skill);
});

test('the best word scores 100, a useless repeat scores 0', () => {
  const best = POOL.reduce((b, w) => (expectedLeft(w, POOL) < expectedLeft(b, POOL) ? w : b));
  assert.equal(analyzeGame([best], 'BASKET', POOL)[0].skill, 100);
  // A guess sharing no letters can't split the pool.
  assert.equal(analyzeGame(['QQQQQQ'], 'BASKET', ['BASKET', 'MARKET'])[0].skill, 0);
});

test('stored best first-guess score matches the answer list', () => {
  // SATIRE is the best opener for the 1,588 answers. If words are appended,
  // update the number in quality.js (phones fall back to a sample meanwhile).
  assert.equal(ANSWERS.length, 1588);
  assert.equal(expectedLeft('SATIRE', ANSWERS), 19.27455919395466);
});

test('quality stats average games and words left', () => {
  const h = [
    { puzzle: 1, answer: 'PLANET', guesses: ['GARDEN', 'PLANET'], won: true },
    { puzzle: 2, answer: 'BASKET', guesses: [], won: false, skipped: true },
    { puzzle: 3, answer: 'MARKET', guesses: ['PLANKS', 'MARKET'], won: true },
  ];
  const q = qualityStats(h, POOL);
  assert.equal(typeof q.avgSkill, 'number');
  assert.equal(typeof q.leftAfter[0], 'number');
  assert.equal(q.leftAfter[2], null);
  assert.deepEqual(qualityStats([], POOL), { avgSkill: null, recentSkill: null, lastSkill: null, leftAfter: [null, null, null] });
});
