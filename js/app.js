import { MAX_GUESSES, scoreGuess, keyboardMarks, isWin, answerFor } from './logic.js?v=mwsr985p';
import { ANSWERS } from './words.js?v=mwsr985p';
import { ALLOWED } from './allowed.js?v=mwsr985p';
import { ANSWERS5 } from './words5.js?v=mwsr985p';
import { ALLOWED5 } from './allowed5.js?v=mwsr985p';
import { getPlayers, addPlayer, getPlayer, setPlayer, getLength, setLength, loadProfile, saveProfile } from './store.js?v=mwsr985p';
import { computeStats } from './stats.js?v=mwsr985p';
import { analyzeGame, gameSkill, qualityStats } from './quality.js?v=mwsr985p';
import { nextNumber, saveForLater, resume, saved as savedGames } from './puzzles.js?v=mwsr985p';
import { firstEmpty, isComplete, typeLetter, backspace } from './edit.js?v=mwsr985p';
import { setupPWA } from './pwa.js?v=mwsr985p';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-']; // + = Enter, - = Back
const REVEAL_MS = 260; // delay between tiles flipping

const boardEl = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');
const toastEl = document.getElementById('toast');
const resultEl = document.getElementById('result');
const pickerEl = document.getElementById('picker');
const skipEl = document.getElementById('skip');
const gotoEl = document.getElementById('goto');
const statsEl = document.getElementById('stats');
const breakdownEl = document.getElementById('breakdown');

let player = null;   // name typed on the picker
let profile = null;  // { next, current, history }
let state = null;    // profile.current: the game on screen
let cursor = null;   // spot in the current row where the next letter goes (null = first empty)
let busy = false;    // true while a row is revealing

// Word-length modes. Each has its own answer order, puzzle numbers and stats.
const MODES = {
  6: { answers: ANSWERS, allowed: ALLOWED },
  5: { answers: ANSWERS5, allowed: ALLOWED5 },
};
let len = 6;         // letters in the current mode
const answers = () => MODES[len].answers;

// Deal the player's next numbered puzzle. Everyone plays the same order (see words.js).
// Puzzles finished or saved for later are stepped over.
function dealPuzzle() {
  const puzzle = nextNumber(profile);
  profile.next = puzzle + 1;
  return newGame(puzzle);
}

function newGame(puzzle) {
  return { puzzle, answer: answerFor(puzzle, answers()), guesses: [], current: '', status: 'playing' };
}

function save() {
  profile.current = state;
  saveProfile(player, profile, len);
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
  document.getElementById('player-btn').textContent = name;
  pickerEl.hidden = true;
  loadMode(getLength(name));
}

// Switch to 5 or 6 letters. A game in progress stays saved in its own mode.
function loadMode(n) {
  len = n;
  setLength(player, n);
  profile = loadProfile(player, n);
  state = profile.current || dealPuzzle();
  cursor = null;
  save();
  const btn = document.getElementById('mode-btn');
  btn.textContent = `${n} letters`;
  btn.setAttribute('aria-label', `Playing ${n} letters. Switch to ${n === 6 ? 5 : 6} letters`);
  buildBoard();
  render();
}

// ---------- Building the page ----------

function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--cols', len);
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'row');
    for (let c = 0; c < len; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      tile.dataset.col = c;
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
  if (cursor === null) cursor = firstEmpty(state.current, len);
  const editing = state.status === 'playing' ? state.guesses.length : -1;
  for (let r = 0; r < MAX_GUESSES; r++) {
    const tiles = rows[r].children;
    const guess = state.guesses[r];
    const marks = guess ? scoreGuess(guess, state.answer) : null;
    const text = guess || (r === state.guesses.length ? state.current : '');
    for (let c = 0; c < len; c++) {
      const tile = tiles[c];
      const ch = text[c] && text[c] !== ' ' ? text[c] : '';
      tile.textContent = ch;
      tile.className = 'tile' + (ch ? ' filled' : '') + (marks ? ' ' + marks[c] : '')
        + (r === editing ? ' editable' : '') + (r === editing && c === cursor ? ' cursor' : '');
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
    : state.skipped ? `#${state.puzzle} was` : 'Out of guesses';
  document.getElementById('result-word').textContent = state.answer;
  const skill = gameSkill(analyzeGame(state.guesses, state.answer, answers()));
  const avg = qualityStats(profile.history, answers()).avgSkill;
  document.getElementById('result-skill').textContent =
    skill === null ? '' : `Skill ${skill}` + (avg === null ? '' : ` \u00b7 your average ${avg}`);
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
  if ([pickerEl, statsEl, breakdownEl, skipEl, gotoEl].some((el) => !el.hidden)) return;
  if (busy || state.status !== 'playing') return;
  if (key === 'Enter') return submit();
  let edit;
  if (key === 'Backspace') edit = backspace(state.current, cursor, len);
  else if (/^[A-Z]$/.test(key)) edit = typeLetter(state.current, cursor, key, len);
  else return;
  state.current = edit.current;
  cursor = edit.cursor;
  save();
  render();
  if (edit.placed !== undefined) popTile(edit.placed);
}

// Tap a tile in the row being typed to move the cursor there.
function moveCursor(col) {
  if ([pickerEl, statsEl, breakdownEl, skipEl, gotoEl].some((el) => !el.hidden)) return;
  if (busy || state.status !== 'playing') return;
  cursor = col;
  render();
}

function popTile(col) {
  const row = boardEl.children[state.guesses.length];
  const tile = row && row.children[col];
  if (!tile) return;
  tile.classList.add('pop');
  setTimeout(() => tile.classList.remove('pop'), 120);
}

function submit() {
  if (!isComplete(state.current, len)) {
    shakeRow();
    toast(`Need ${len} letters`);
    return;
  }
  const guess = state.current;
  if (!MODES[len].allowed.has(guess)) {
    shakeRow();
    toast('Not in word list');
    return;
  }
  const rowIndex = state.guesses.length;
  state.guesses.push(guess);
  state.current = '';
  cursor = null;
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
  }, len * REVEAL_MS + 150);
}

function nextWord() {
  state = dealPuzzle();
  cursor = null;
  save();
  buildBoard();
  render();
}

boardEl.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (tile && tile.parentElement === boardEl.children[state.guesses.length]) moveCursor(Number(tile.dataset.col));
});

const typingInBox = (e) => e.target instanceof HTMLInputElement;

document.addEventListener('keydown', (e) => {
  if (typingInBox(e)) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (cursor === null) return;
    moveCursor(Math.max(0, Math.min(len - 1, cursor + (e.key === 'ArrowLeft' ? -1 : 1))));
  }
});

keyboardEl.addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (key) press(key.dataset.key);
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || typingInBox(e)) return;
  if (e.key === 'Enter' || e.key === 'Backspace') {
    e.preventDefault(); // stop Enter from also clicking a focused button
    press(e.key);
  }
  else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
});

document.getElementById('next-word').addEventListener('click', nextWord);
document.getElementById('new-game').addEventListener('click', () => {
  if (busy) return;
  if (state.status !== 'playing') return nextWord();
  document.getElementById('skip-title').textContent = `Skip #${state.puzzle}?`;
  skipEl.hidden = false;
});

// ---------- Skip: save for later or show the word ----------

document.getElementById('skip-later').addEventListener('click', () => {
  skipEl.hidden = true;
  const n = state.puzzle;
  saveForLater(profile, state);
  nextWord();
  toast(`#${n} saved for later`);
});

document.getElementById('skip-show').addEventListener('click', () => {
  skipEl.hidden = true;
  // Seeing the word counts as a loss, so stats stay honest.
  state.status = 'lost';
  state.skipped = true;
  record(true);
  save();
  render();
});

document.getElementById('skip-cancel').addEventListener('click', () => { skipEl.hidden = true; });

// ---------- Go to a puzzle number ----------

function showGoto() {
  const max = answers().length;
  const input = document.getElementById('goto-input');
  input.value = '';
  input.max = max;
  document.getElementById('goto-hint').textContent = `${len}-letter puzzles go from 1 to ${max}.`;
  const list = savedGames(profile);
  document.getElementById('goto-saved-head').hidden = !list.length;
  document.getElementById('goto-saved').innerHTML = list.map((g) =>
    `<button type="button" class="icon-btn" data-n="${g.puzzle}">#${g.puzzle}${g.guesses.length ? ` \u00b7 ${g.guesses.length} tried` : ''}</button>`).join('');
  gotoEl.hidden = false;
}

function goTo(n) {
  if (!Number.isInteger(n) || n < 1 || n > answers().length) {
    toast(`Pick 1 to ${answers().length}`);
    return;
  }
  if (n === state.puzzle) { gotoEl.hidden = true; return; }
  const done = profile.history.find((g) => g.puzzle === n);
  if (done) {
    toast(`You already finished #${n}` + (done.won ? ` in ${done.guesses.length}` : ''));
    return;
  }
  gotoEl.hidden = true;
  let left = null;
  if (state.status === 'playing' && !state.guesses.length && state.puzzle === profile.next - 1) {
    profile.next = state.puzzle; // untouched: it simply comes up next again
  } else if (state.status === 'playing') {
    left = state.puzzle;
    saveForLater(profile, state); // the game you leave is kept, not lost
  }
  state = resume(profile, n) || newGame(n);
  cursor = null;
  save();
  buildBoard();
  render();
  if (left) toast(`#${left} saved for later`);
}

document.getElementById('puzzle-no').addEventListener('click', () => { if (!busy) showGoto(); });
document.getElementById('goto-go').addEventListener('click', () => {
  goTo(parseInt(document.getElementById('goto-input').value, 10));
});
document.getElementById('goto-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); goTo(parseInt(e.target.value, 10)); }
});
document.getElementById('goto-saved').addEventListener('click', (e) => {
  const b = e.target.closest('[data-n]');
  if (b) goTo(Number(b.dataset.n));
});
document.getElementById('goto-close').addEventListener('click', () => { gotoEl.hidden = true; });

// ---------- Guess breakdown ----------

function showBreakdown() {
  const rows = analyzeGame(state.guesses, state.answer, answers());
  document.getElementById('breakdown-rows').innerHTML = rows.map((r) => `
    <tr><td class="b-word">${r.guess}</td>
      <td>${r.settled ? '<span class="b-note">already 1</span>' : `${r.before} &rarr; ${r.after}`}</td>
      <td class="b-skill">${r.free || r.settled ? '&ndash;' : r.skill}</td></tr>`).join('');
  breakdownEl.hidden = false;
}

document.getElementById('result-breakdown').addEventListener('click', showBreakdown);
document.getElementById('breakdown-close').addEventListener('click', () => { breakdownEl.hidden = true; });

// ---------- Player picker ----------

function showPicker() {
  const players = getPlayers();
  const list = document.getElementById('picker-list');
  list.innerHTML = '';
  for (const name of players) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'primary-btn picker-btn' + (name === player ? ' current' : '');
    b.textContent = name;
    b.addEventListener('click', () => startAs(name));
    list.appendChild(b);
  }
  list.hidden = !players.length;
  document.getElementById('picker-title').textContent = players.length ? "Who's playing?" : "What's your name?";
  document.getElementById('name-input').placeholder = players.length ? 'New player' : 'Your name';
  document.getElementById('name-input').value = '';
  document.getElementById('picker-close').hidden = !player;
  pickerEl.hidden = false;
  if (!players.length) document.getElementById('name-input').focus();
}

document.getElementById('name-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('name-input');
  const name = addPlayer(input.value);
  if (!name) { input.focus(); return; } // nothing typed yet
  input.blur();
  startAs(name);
});
document.getElementById('picker-close').addEventListener('click', () => { pickerEl.hidden = true; });

document.getElementById('mode-btn').addEventListener('click', () => {
  if (busy || !player) return;
  loadMode(len === 6 ? 5 : 6);
  toast(`${len} letters`);
});

document.getElementById('player-btn').addEventListener('click', () => { if (!busy) showPicker(); });

// ---------- Stats ----------

function showStats() {
  const s = computeStats(profile.history);
  document.getElementById('stats-title').textContent = `${player}'s stats \u00b7 ${len} letters`;
  const nums = [
    [s.played, 'Played'],
    [s.winPct + '%', 'Won'],
    [s.currentStreak, 'Streak'],
    [s.maxStreak, 'Best streak'],
    [s.avgGuesses ?? '-', 'Avg guesses'],
  ];
  const q = qualityStats(profile.history, answers());
  nums.push([q.avgSkill ?? '-', 'Avg skill']);
  const fmt = (v) => (v === null ? '-' : v);
  document.getElementById('stats-skill').innerHTML = `
    <div class="skill-row"><span>Last game</span><b>${fmt(q.lastSkill)}</b></div>
    <div class="skill-row"><span>Last 10 games</span><b>${fmt(q.recentSkill)}</b></div>
    <div class="skill-row"><span>All games</span><b>${fmt(q.avgSkill)}</b></div>
    <div class="skill-row"><span>Words left after guess 1/2/3</span>
      <b>${q.leftAfter.map(fmt).join(' / ')}</b></div>`;
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
  setRecentOpen(false); // always start hidden so the screen can be shown without spoilers
  statsEl.hidden = false;
}

document.getElementById('stats-btn').addEventListener('click', () => { if (!busy) showStats(); });
document.getElementById('result-stats').addEventListener('click', showStats);
function setRecentOpen(open) {
  const btn = document.getElementById('recent-toggle');
  document.getElementById('stats-recent').hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? 'Hide recent words' : 'Show recent words (spoilers)';
}
document.getElementById('recent-toggle').addEventListener('click', () => {
  setRecentOpen(document.getElementById('stats-recent').hidden);
});
document.getElementById('stats-close').addEventListener('click', () => { statsEl.hidden = true; });

// ---------- Start ----------

buildKeyboard();
const saved = getPlayer();
if (saved) startAs(saved);
else { buildBoard(); showPicker(); }
setupPWA();
