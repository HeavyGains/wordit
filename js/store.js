// Per-player saves in this browser's localStorage. Every read/write is
// wrapped so private browsing or blocked storage just means no saving.
export const PLAYERS = ['Jason', 'Amy'];

const PLAYER_KEY = 'wordit.player';
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

export function getPlayer() {
  const p = get(PLAYER_KEY);
  return PLAYERS.includes(p) ? p : null;
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
