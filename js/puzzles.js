// Which puzzle to play: the next one in order, a puzzle saved for later, or
// any number the player picks. Pure functions on a profile, no DOM.
// profile: { next, current, history: [finished games], skipped?: [games saved for later] }

export const saved = (profile) => profile.skipped || [];

export function isFinished(profile, n) {
  return profile.history.some((g) => g.puzzle === n);
}

export function isSaved(profile, n) {
  return saved(profile).some((g) => g.puzzle === n);
}

// Next puzzle in order, stepping over ones already finished or saved for later
// (those can be reached by number or from the saved list).
export function nextNumber(profile) {
  let n = profile.next;
  while (isFinished(profile, n) || isSaved(profile, n)) n++;
  return n;
}

// Put an unfinished game aside so it can be picked up later, guesses and all.
export function saveForLater(profile, game) {
  if (!game || game.status !== 'playing') return;
  const rest = saved(profile).filter((g) => g.puzzle !== game.puzzle);
  profile.skipped = [...rest, { ...game, current: '' }].sort((a, b) => a.puzzle - b.puzzle);
}

// Take a saved game back out (null if that number isn't saved).
export function resume(profile, n) {
  const game = saved(profile).find((g) => g.puzzle === n);
  if (!game) return null;
  profile.skipped = saved(profile).filter((g) => g !== game);
  return game;
}
