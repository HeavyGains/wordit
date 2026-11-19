import { WORD_LENGTH, MAX_GUESSES, scoreGuess, keyboardMarks, isWin } from './logic.js';
import { ANSWERS } from './words.js';

const SAVE_KEY = 'wordit.current';
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-']; // + = Enter, - = Back
const REVEAL_MS = 260; // delay between tiles flipping

const boardEl = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');
const toastEl = document.getElementById('toast');
const resultEl = document.getElementById('result');

let state = load() || newState();
let busy = false; // true while a row is revealing

function newState(prevAnswer) {
  let answer;
  do answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  while (ANSWERS.length > 1 && answer === prevAnswer);
  return { answer, guesses: [], current: '', status: 'playing' };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.answer === 'string' && Array.isArray(s.guesses)) return s;
  } catch {}
  return null;
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
  const rowIndex = state.guesses.length;
  state.guesses.push(guess);
  state.current = '';
  if (isWin(guess, state.answer)) state.status = 'won';
  else if (state.guesses.length >= MAX_GUESSES) state.status = 'lost';
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
  state = newState(state.answer);
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
  if (state.status === 'playing' && state.guesses.length > 0) {
    toast(`Skipped: it was ${state.answer}`);
  }
  nextWord();
});

buildBoard();
buildKeyboard();
render();
