import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreGuess, keyboardMarks, isWin } from '../js/logic.js';

test('all hits on exact match', () => {
  assert.deepEqual(scoreGuess('PLANET', 'PLANET'), Array(6).fill('hit'));
  assert.ok(isWin('planet', 'PLANET'));
});

test('all misses when no letters shared', () => {
  assert.deepEqual(scoreGuess('BUMPYQ', 'LATENT'), Array(6).fill('miss'));
});

test('near letters in wrong spots', () => {
  // GARDEN vs DANGER: A and N/E/R/D/G placement
  assert.deepEqual(scoreGuess('GARDEN', 'DANGER'),
    ['near', 'hit', 'near', 'near', 'hit', 'near']);
});

test('duplicate guess letter only counts once when answer has one', () => {
  // answer has one L; guess has two Ls, neither in place
  // second L is the hit, so the first L gets nothing
  assert.deepEqual(scoreGuess('LLAMAS', 'PLANET'),
    ['miss', 'hit', 'hit', 'miss', 'miss', 'miss']);
  // A is in PLANET but not at index 0; second L (index 2) has no spare L left
  assert.deepEqual(scoreGuess('ALLOYS', 'PLANET'),['near', 'hit', 'miss', 'miss', 'miss', 'miss']);
});

test('exact hit takes priority over earlier near for duplicate letter', () => {
  // answer KITTEN has two Ts at 2,3. Guess TTTXYZ: T at 2 hit, first T near, second T near
  assert.deepEqual(scoreGuess('TTTXYZ', 'KITTEN'), ['near', 'miss', 'hit', 'miss', 'miss', 'miss']);
  // only one leftover T (index 3) after the hit at 2, so only one extra T is near
});

test('keyboard keeps best mark per letter', () => {
  const k = keyboardMarks(['ALLOYS', 'PLANET'], 'PLANET');
  assert.equal(k.L, 'hit');
  assert.equal(k.A, 'hit');
  assert.equal(k.Y, 'miss');
});
