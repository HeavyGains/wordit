// WORDIT service worker: lets the game open offline and from the home screen.
// Network first: when online, every file comes fresh from the site, so a new
// release shows up right away. The cache is only used when there's no signal.
// VERSION and ASSETS are rewritten by `npm run bump`; a new VERSION makes
// phones install this worker again and drop the old cache.
const VERSION = 'mwqqiun3';
const ASSETS = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","css/style.css?v=mwqqiun3","js/allowed.js?v=mwqqiun3","js/allowed5.js?v=mwqqiun3","js/app.js?v=mwqqiun3","js/logic.js?v=mwqqiun3","js/puzzles.js?v=mwqqiun3","js/pwa.js?v=mwqqiun3","js/quality.js?v=mwqqiun3","js/stats.js?v=mwqqiun3","js/store.js?v=mwqqiun3","js/words.js?v=mwqqiun3","js/words5.js?v=mwqqiun3"];
const CACHE = `wordit-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wordit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
