import { WORD_LENGTH, MAX_GUESSES, scoreGuess, keyboardMarks, isWin, answerFor } from './logic.js';
import { ANSWERS } from './words.js';
import { ALLOWED } from './allowed.js';
import { PLAYERS, getPlayer, setPlayer, loadProfile, saveProfile } from './store.js';
import { computeStats } from './stats.js';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-']; // + = Enter, - = Back
const REVEAL_MS = 260; // delay between tiles flipping

const boardEl = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');
const toastEl = document.getElementById('toast');
const resultEl = document.getElementById('result');
const pickerEl = document.getElementById('picker');
const statsEl = document.getElementById('stats');

let player = null;   // 'Jason' | 'Amy'
let profile = null;  // { next, current, history }
let state = null;    // profile.current: the game on screen
let busy = false;    // true while a row is revealing

// Deal the player's next numbered puzzle. Everyone plays the same order (see words.js).
function dealPuzzle() {
  const puzzle = profile.next;
  profile.next = puzzle + 1;
  return { puzzle, answer: answerFor(puzzle, ANSWERS), guesses: [], current: '', status: 'playing' };
}

function save() {
  profile.current = state;
  saveProfile(player, profile);
}

// Add a finished game to the player's history (once per puzzle).
function record(skipped = false) {
  if (profile.history.some((g) => g.puzzle === state.puzzle)) return;
  profile.history.push({
    puzzle: state.puzzle,
    answer: state.answer,
    guesses: [...state.guesses],
    won: state.status === 'won',
    ...(skipped ? { skipped: true } : {}),
    at: Date.now(),
  });
}

function startAs(name) {
  player = name;
  setPlayer(name);
  profile = loadProfile(name);
  state = profile.current || dealPuzzle();
  save();
  document.getElementById('player-btn').textContent = name;
  pickerEl.hidden = true;
  buildBoard();
  render();
}

// ---------- Building the page ----------

function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'row');
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }
}

function buildKeyboard() {
  keyboardEl.innerHTML = '';
  for (const letters of ROWS) {
    const row = document.createElement('div');
    row.className = 'kb-row';
    for (const ch of letters) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key';
      if (ch === '+') {
        key.textContent = 'Enter';
        key.dataset.key = 'Enter';
        key.classList.add('wide');
      } else if (ch === '-') {
        key.innerHTML = '&#9003;';
        key.setAttribute('aria-label', 'Backspace');
        key.dataset.key = 'Backspace';
        key.classList.add('wide');
      } else {
        key.textContent = ch;
        key.dataset.key = ch;
      }
      row.appendChild(key);
    }
    keyboardEl.appendChild(row);
  }
}

// ---------- Drawing state ----------

function render() {
  if (!state) return;
  document.getElementById('puzzle-no').textContent = `#${state.puzzle}`;
  const rows = boardEl.children;
  for (let r = 0; r < MAX_GUESSES; r++) {
    const tiles = rows[r].children;
    const guess = state.guesses[r];
    const marks = guess ? scoreGuess(guess, state.answer) : null;
    const text = guess || (r === state.guesses.length ? state.current : '');
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = tiles[c];
      tile.textContent = text[c] || '';
      tile.className = 'tile' + (text[c] ? ' filled' : '') + (marks ? ' ' + marks[c] : '');
    }
  }
  const best = keyboardMarks(state.guesses, state.answer);
  for (const key of keyboardEl.querySelectorAll('.key')) {
    const mark = best[key.dataset.key];
    key.classList.remove('hit', 'near', 'miss');
    if (mark) key.classList.add(mark);
  }
  showResult();
}

function showResult() {
  if (state.status === 'playing') {
    resultEl.hidden = true;
    keyboardEl.hidden = false;
    return;
  }
  const won = state.status === 'won';
  document.getElementById('result-title').textContent = won
    ? `Got it in ${state.guesses.length}!`
    : 'Out of guesses';
  document.getElementById('result-word').textContent = state.answer;
  resultEl.hidden = false;
  keyboardEl.hidden = true;
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function shakeRow() {
  const row = boardEl.children[state.guesses.length];
  row.classList.remove('shake');
  void row.offsetWidth; // restart animation
  row.classList.add('shake');
}

// ---------- Input ----------

function press(key) {
  if (!pickerEl.hidden || !statsEl.hidden) return;
  if (busy || state.status !== 'playing') return;
  if (key === 'Enter') return submit();
  if (key === 'Backspace') {
    state.current = state.current.slice(0, -1);
  } else if (/^[A-Z]$/.test(key) && state.current.length < WORD_LENGTH) {
    state.current += key;
  } else {
    return;
  }
  save();
  render();
  popTile();
}

function popTile() {
  const row = boardEl.children[state.guesses.length];
  const tile = row && row.children[state.current.length - 1];
  if (!tile) return;
  tile.classList.add('pop');
  setTimeout(() => tile.classList.remove('pop'), 120);
}

function submit() {
  if (state.current.length < WORD_LENGTH) {
    shakeRow();
    toast('Need 6 letters');
    return;
  }
  const guess = state.current;
  if (!ALLOWED.has(guess)) {
    shakeRow();
    toast('Not in word list');
    return;
  }
  const rowIndex = state.guesses.length;
  state.guesses.push(guess);
  state.current = '';
  if (isWin(guess, state.answer)) state.status = 'won';
  else if (state.guesses.length >= MAX_GUESSES) state.status = 'lost';
  if (state.status !== 'playing') record();
  save();
  revealRow(rowIndex, guess);
}

function revealRow(rowIndex, guess) {
  busy = true;
  const tiles = boardEl.children[rowIndex].children;
  const marks = scoreGuess(guess, state.answer);
  [...tiles].forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => tile.classList.add(marks[i]), REVEAL_MS / 2);
    }, i * REVEAL_MS);
  });
  setTimeout(() => {
    busy = false;
    render();
    if (state.status === 'won') {
      boardEl.children[rowIndex].classList.add('win');
      toast(['Genius!', 'Brilliant!', 'Superb!', 'Great!', 'Nice!', 'Solid!', 'Phew!'][rowIndex] || 'Nice!');
    }
  }, WORD_LENGTH * REVEAL_MS + 150);
}

function nextWord() {
  state = dealPuzzle();
  save();
  buildBoard();
  render();
}

keyboardEl.addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (key) press(key.dataset.key);
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter' || e.key === 'Backspace') {
    e.preventDefault(); // stop Enter from also clicking a focused button
    press(e.key);
  }
  else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
});

document.getElementById('next-word').addEventListener('click', nextWord);
document.getElementById('new-game').addEventListener('click', () => {
  if (busy) return;
  if (state.status === 'playing' && state.guesses.length > 0) {
    // A skip after guessing counts as a loss, so stats stay honest.
    state.status = 'lost';
    record(true);
    toast(`Skipped: it was ${state.answer}`);
  }
  nextWord();
});

// ---------- Player picker ----------

function showPicker() {
  const list = document.getElementById('picker-list');
  list.innerHTML = '';
  for (const name of PLAYERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'primary-btn picker-btn' + (name === player ? ' current' : '');
    b.textContent = name;
    b.addEventListener('click', () => startAs(name));
    list.appendChild(b);
  }
  pickerEl.hidden = false;
}

document.getElementById('player-btn').addEventListener('click', () => { if (!busy) showPicker(); });

// ---------- Stats ----------

function showStats() {
  const s = computeStats(profile.history);
  document.getElementById('stats-title').textContent = `${player}'s stats`;
  const nums = [
    [s.played, 'Played'],
    [s.winPct + '%', 'Won'],
    [s.currentStreak, 'Streak'],
    [s.maxStreak, 'Best streak'],
    [s.avgGuesses ?? '-', 'Avg guesses'],
  ];
  document.getElementById('stats-nums').innerHTML = nums
    .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');

  const last = profile.history[profile.history.length - 1];
  const lastBar = last && last.won ? last.guesses.length - 1 : -1;
  const max = Math.max(1, ...s.dist);
  document.getElementById('stats-dist').innerHTML = s.dist.map((n, i) => `
    <div class="bar-row">
      <span class="bar-label">${i + 1}</span>
      <span class="bar${i === lastBar ? ' last' : ''}" style="width:${Math.max(8, (n / max) * 100)}%">${n}</span>
    </div>`).join('') + `
    <div class="bar-row"><span class="bar-label">X</span>
      <span class="bar lost" style="width:${Math.max(8, ((s.played - s.wins) / max) * 100)}%">${s.played - s.wins}</span>
    </div>`;

  const recent = profile.history.slice(-10).reverse();
  document.getElementById('stats-recent').innerHTML = recent.length
    ? recent.map((g) => `
      <li><span class="r-no">#${g.puzzle}</span><span class="r-word">${g.answer}</span>
      <span class="r-res ${g.won ? 'win' : 'loss'}">${g.won ? g.guesses.length + '/' + MAX_GUESSES : g.skipped ? 'skip' : 'X'}</span></li>`).join('')
    : '<li class="empty">No games yet. Go play!</li>';
  statsEl.hidden = false;
}

document.getElementById('stats-btn').addEventListener('click', () => { if (!busy) showStats(); });
document.getElementById('result-stats').addEventListener('click', showStats);
document.getElementById('stats-close').addEventListener('click', () => { statsEl.hidden = true; });

// ---------- Start ----------

buildKeyboard();
const saved = getPlayer();
if (saved) startAs(saved);
else { buildBoard(); showPicker(); }
