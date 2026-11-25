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

// Small stand-in for the browser's localStorage.
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  return m;
}

test('rename moves every save to the new name', async () => {
  const { renamePlayer, getPlayers, getPlayer } = await import('../js/store.js');
  const m = fakeStorage({
    'wordit.players': '["Jason","Amy"]', 'wordit.player': 'Amy',
    'wordit.profile.Amy': 'six', 'wordit.profile5.Amy': 'five', 'wordit.len.Amy': '5',
  });
  assert.deepEqual(renamePlayer('Amy', ' Amy B '), { name: 'Amy B' });
  assert.deepEqual(getPlayers(), ['Jason', 'Amy B']);
  assert.equal(getPlayer(), 'Amy B');
  assert.equal(m.get('wordit.profile.Amy B'), 'six');
  assert.equal(m.get('wordit.profile5.Amy B'), 'five');
  assert.equal(m.get('wordit.len.Amy B'), '5');
  assert.equal(m.has('wordit.profile.Amy'), false);
  assert.ok(renamePlayer('Amy B', 'jason').error);
  assert.ok(renamePlayer('Amy B', '  ').error);
  assert.deepEqual(renamePlayer('Jason', 'JASON'), { name: 'JASON' });
});

test('remove deletes the player and their saves', async () => {
  const { removePlayer, getPlayers, getPlayer } = await import('../js/store.js');
  const m = fakeStorage({
    'wordit.players': '["Jason","Amy"]', 'wordit.player': 'Amy',
    'wordit.profile.Amy': 'six', 'wordit.profile.Jason': 'j',
  });
  removePlayer('Amy');
  assert.deepEqual(getPlayers(), ['Jason']);
  assert.equal(getPlayer(), null);
  assert.equal(m.has('wordit.profile.Amy'), false);
  assert.equal(m.get('wordit.profile.Jason'), 'j');
  delete globalThis.localStorage;
});
