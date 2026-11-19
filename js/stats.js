// Pure stats from a player's finished games. Each game:
//   { puzzle, answer, guesses: [...], won: bool, skipped?: bool, at: ms }
import { MAX_GUESSES } from './logic.js?v=mwn5yvnd';

export function computeStats(history) {
  const dist = Array(MAX_GUESSES).fill(0); // dist[0] = wins in 1 guess
  let wins = 0, streak = 0, maxStreak = 0, guessTotal = 0;
  for (const g of history) {
    if (g.won) {
      wins++;
      streak++;
      maxStreak = Math.max(maxStreak, streak);
      dist[g.guesses.length - 1]++;
      guessTotal += g.guesses.length;
    } else {
      streak = 0;
    }
  }
  const played = history.length;
  return {
    played,
    wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    currentStreak: streak,
    maxStreak,
    dist,
    avgGuesses: wins ? Math.round((guessTotal / wins) * 10) / 10 : null,
  };
}
