import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, findName, oldPlayersWithSaves, MAX_NAME } from '../js/store.js';

test('names are trimmed, spaces squashed, length capped', () => {
  assert.equal(cleanName('  Amy  '), 'Amy');
  assert.equal(cleanName('Mary   Jo'), 'Mary Jo');
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName('x'.repeat(30)).length, MAX_NAME);
});

test('same name with different capitals is the same player', () => {
  assert.equal(findName(['Jason', 'Amy'], 'amy'), 'Amy');
  assert.equal(findName(['Jason'], 'Bob'), null);
});

test('old Jason/Amy saves are kept as players', () => {
  const keys = new Set(['wordit.profile.Jason', 'wordit.profile5.Amy']);
  assert.deepEqual(oldPlayersWithSaves((k) => keys.has(k)), ['Jason', 'Amy']);
  assert.deepEqual(oldPlayersWithSaves((k) => k === 'wordit.profile.Jason'), ['Jason']);
  assert.deepEqual(oldPlayersWithSaves(() => false), []);
});
