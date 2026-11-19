// Pure game rules. No DOM here, so it can be unit tested in Node.

export const WORD_LENGTH = 6;
export const MAX_GUESSES = 7;

// Marks for each letter of a guess:
//   'hit'  = right letter, right spot
//   'near' = letter is in the word, but somewhere else
//   'miss' = letter is not in the word (or all copies already used)
export function scoreGuess(guess, answer) {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const marks = new Array(g.length).fill('miss');
  const leftover = {};

  // Pass 1: exact hits. Count the answer letters not matched exactly.
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) marks[i] = 'hit';
    else leftover[a[i]] = (leftover[a[i]] || 0) + 1;
  }
  // Pass 2: near letters, using each leftover answer letter only once.
  for (let i = 0; i < g.length; i++) {
    if (marks[i] === 'hit') continue;
    if (leftover[g[i]] > 0) {
      marks[i] = 'near';
      leftover[g[i]]--;
    }
  }
  return marks;
}

const RANK = { miss: 1, near: 2, hit: 3 };

// Best mark seen so far for each keyboard letter.
export function keyboardMarks(guesses, answer) {
  const best = {};
  for (const guess of guesses) {
    const marks = scoreGuess(guess, answer);
    [...guess.toUpperCase()].forEach((ch, i) => {
      if (!best[ch] || RANK[marks[i]] > RANK[best[ch]]) best[ch] = marks[i];
    });
  }
  return best;
}

export function isWin(guess, answer) {
  return guess.toUpperCase() === answer.toUpperCase();
}
