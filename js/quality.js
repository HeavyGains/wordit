// Guess quality: how many possible answers were left after each guess, and a
// skill score (0-100) for each guess. Pure functions, no DOM.
//
// Skill compares the guess with the best word you could have picked from the
// words still possible at that point. It uses the *expected* number of words
// left (averaged over every answer still possible), so it rates the choice,
// not luck. 100 = as good as the best possible word, 0 = narrowed nothing.
import { scoreGuess } from './logic.js?v=mwsnsmcm';

// Feedback pattern as a short string, e.g. "hnmmhn".
const pattern = (guess, answer) => scoreGuess(guess, answer).map((m) => m[0]).join('');

// Average number of words left after `guess`, over every possible answer.
export function expectedLeft(guess, pool) {
  const groups = new Map();
  for (const a of pool) {
    const p = pattern(guess, a);
    groups.set(p, (groups.get(p) || 0) + 1);
  }
  let sum = 0;
  for (const n of groups.values()) sum += n * n;
  return sum / pool.length;
}

// Lowest expected-left of any word in the pool. Big pools are sampled evenly
// to keep phones fast (only the first guess has a big pool, and that's cached).
const SAMPLE = 400;
export function bestExpected(pool) {
  const step = Math.max(1, Math.ceil(pool.length / SAMPLE));
  let best = Infinity;
  for (let i = 0; i < pool.length; i += step) best = Math.min(best, expectedLeft(pool[i], pool));
  return best;
}

// The first guess always faces the whole answer list. Its best score is slow to
// work out (SATIRE for the 1,588 6-letter answers, RAISE for the 1,296 5-letter
// answers), so it's stored here by list size.
// If words are appended, the phone works it out once from a sample instead.
const firstBest = new Map([[1588, 19.27455919395466], [1296, 30.621913580246915]]);
function bestFor(pool, isFirst) {
  if (!isFirst) return bestExpected(pool);
  if (!firstBest.has(pool.length)) firstBest.set(pool.length, bestExpected(pool));
  return firstBest.get(pool.length);
}

// For each guess: { guess, before, after, skill, free, settled }.
//   before/after = possible answers before and after the guess.
//   free = only one word was left and you typed it: shown, but not averaged.
//   settled = only one word was already left and you guessed something else.
//     The answer list is hidden, so you couldn't know that. Not scored.
export function analyzeGame(guesses, answer, answers) {
  let pool = answers;
  return guesses.map((guess, i) => {
    const before = pool.length;
    const p = pattern(guess, answer);
    const next = pool.filter((a) => pattern(guess, a) === p);
    let skill = null, free = false, settled = false;
    if (before <= 1) {
      free = guess.toUpperCase() === answer.toUpperCase();
      settled = !free;
      if (free) skill = 100;
    } else {
      const mine = expectedLeft(guess, pool);
      const best = bestFor(pool, i === 0);
      const span = Math.log(before) - Math.log(best);
      skill = span <= 0 ? 100 : (100 * (Math.log(before) - Math.log(mine))) / span;
      skill = Math.round(Math.max(0, Math.min(100, skill)));
    }
    pool = next;
    return { guess, before, after: next.length, skill, free, settled };
  });
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Average skill of one game's guesses (null if there was nothing to judge).
export function gameSkill(rows) {
  const a = avg(rows.filter((r) => !r.free && !r.settled).map((r) => r.skill));
  return a === null ? null : Math.round(a);
}

// Skill over time from a player's history (computed from the saved guesses,
// so old games count too). Results are cached per game.
const cache = new Map();
export function qualityStats(history, answers) {
  const games = history
    .filter((g) => g.guesses.length)
    .map((g) => {
      const key = g.answer + ':' + g.guesses.join(',');
      if (!cache.has(key)) cache.set(key, analyzeGame(g.guesses, g.answer, answers));
      return cache.get(key);
    });
  const skills = games.map(gameSkill).filter((s) => s !== null);
  const round = (x) => (x === null ? null : Math.round(x));
  // Average words left after guess 1, 2, 3 (only games that got that far).
  const leftAfter = [0, 1, 2].map((i) => {
    const a = avg(games.filter((rows) => rows[i]).map((rows) => rows[i].after));
    return a === null ? null : Math.round(a * 10) / 10;
  });
  return {
    avgSkill: round(avg(skills)),
    recentSkill: round(avg(skills.slice(-10))),
    lastSkill: skills.length ? skills[skills.length - 1] : null,
    leftAfter,
  };
}
