// Register the service worker and check for a new version whenever the game
// comes back on screen. When a new version takes over, reload once so the
// phone never runs a mix of old and new files. Game progress is saved, so a
// reload only loses letters typed into the current row.
export function setupPWA() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; // first install: nothing old to replace
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
}
