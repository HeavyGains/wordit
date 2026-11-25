// Per-player saves in this browser's localStorage. Every read/write is
// wrapped so private browsing or blocked storage just means no saving.
// Players are whoever typed a name on this phone. Before names could be
// typed, the game had two fixed players; they're kept if they have saves.
const OLD_PLAYERS = ['Jason', 'Amy'];
export const MAX_NAME = 16;

const PLAYER_KEY = 'wordit.player';
const PLAYERS_KEY = 'wordit.players';
// 6-letter saves keep their original key; other lengths get their own, so
// stats and puzzle numbers stay separate per mode.
const profileKey = (name, len = 6) => (len === 6 ? `wordit.profile.${name}` : `wordit.profile${len}.${name}`);
const modeKey = (name) => `wordit.len.${name}`;
export const LENGTHS = [6, 5];
// Keys used before players existed (PR 1/2); moved to the first player picked.
const OLD_CURRENT = 'wordit.current';
const OLD_NEXT = 'wordit.nextPuzzle';

function get(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export function emptyProfile() {
  return { next: 1, current: null, history: [] };
}

// Tidy a typed name: trim, squash spaces, cap the length. '' = not usable.
export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}

// The same name typed with different capitals is the same player.
export function findName(list, name) {
  const key = name.toLowerCase();
  return list.find((n) => n.toLowerCase() === key) || null;
}

// Old fixed players that already have something saved on this phone.
export function oldPlayersWithSaves(has) {
  const current = get(PLAYER_KEY);
  return OLD_PLAYERS.filter((n) => n === current
    || LENGTHS.some((l) => has(profileKey(n, l))) || has(modeKey(n)));
}

export function getPlayers() {
  try {
    const list = JSON.parse(get(PLAYERS_KEY));
    if (Array.isArray(list)) return list.filter((n) => typeof n === 'string' && n);
  } catch {}
  const list = oldPlayersWithSaves((k) => get(k) !== null);
  if (list.length) set(PLAYERS_KEY, JSON.stringify(list));
  return list;
}

// Add a player (or find the one already using that name). Returns the name
// to play as, or null if the typed name is empty.
export function addPlayer(raw) {
  const name = cleanName(raw);
  if (!name) return null;
  const list = getPlayers();
  const existing = findName(list, name);
  if (existing) return existing;
  list.push(name);
  savePlayers(list);
  return name;
}

function savePlayers(list) {
  set(PLAYERS_KEY, JSON.stringify(list));
}

// Move a player's saves to a new name. Returns { name } on success or
// { error } if the new name is empty or already taken by someone else.
export function renamePlayer(oldName, raw) {
  const name = cleanName(raw);
  if (!name) return { error: 'Type a name' };
  const list = getPlayers();
  const i = list.indexOf(oldName);
  if (i < 0) return { error: 'Player not found' };
  const other = findName(list.filter((n) => n !== oldName), name);
  if (other) return { error: `${other} is already a player` };
  if (name === oldName) return { name };
  for (const key of [...LENGTHS.map((l) => [profileKey(oldName, l), profileKey(name, l)]), [modeKey(oldName), modeKey(name)]]) {
    const v = get(key[0]);
    if (v !== null) { set(key[1], v); remove(key[0]); }
  }
  list[i] = name;
  savePlayers(list);
  if (get(PLAYER_KEY) === oldName) set(PLAYER_KEY, name);
  return { name };
}

// Delete a player and all their puzzles and stats on this phone.
export function removePlayer(name) {
  for (const l of LENGTHS) remove(profileKey(name, l));
  remove(modeKey(name));
  savePlayers(getPlayers().filter((n) => n !== name));
  if (get(PLAYER_KEY) === name) remove(PLAYER_KEY);
}

export function getPlayer() {
  const p = get(PLAYER_KEY);
  return getPlayers().includes(p) ? p : null;
}

export function setPlayer(name) {
  set(PLAYER_KEY, name);
}

// Word length each player last played (6 unless they switched).
export function getLength(name) {
  const n = parseInt(get(modeKey(name)), 10);
  return LENGTHS.includes(n) ? n : 6;
}

export function setLength(name, len) {
  set(modeKey(name), String(len));
}

export function loadProfile(name, len = 6) {
  try {
    const p = JSON.parse(get(profileKey(name, len)));
    if (p && typeof p.next === 'number' && Array.isArray(p.history)) return p;
  } catch {}
  return (len === 6 && migrateOld()) || emptyProfile();
}

export function saveProfile(name, profile, len = 6) {
  set(profileKey(name, len), JSON.stringify(profile));
}

// One-time: carry a game in progress from before players existed.
function migrateOld() {
  const oldNext = parseInt(get(OLD_NEXT), 10);
  if (!oldNext) return null;
  const profile = emptyProfile();
  profile.next = oldNext;
  try {
    const cur = JSON.parse(get(OLD_CURRENT));
    if (cur && typeof cur.puzzle === 'number' && cur.status === 'playing') profile.current = cur;
  } catch {}
  remove(OLD_NEXT);
  remove(OLD_CURRENT);
  return profile;
}
