// WORDIT service worker: lets the game open offline and from the home screen.
// The page comes fresh from the site when the network answers quickly, so a
// new release shows up right away; see the fetch handler for the details.
// VERSION and ASSETS are rewritten by `npm run bump`; a new VERSION makes
// phones install this worker again and drop the old cache.
const VERSION = 'mwvfdvot';
const ASSETS = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","css/style.css?v=mwvfdvot","js/allowed.js?v=mwvfdvot","js/allowed5.js?v=mwvfdvot","js/app.js?v=mwvfdvot","js/edit.js?v=mwvfdvot","js/logic.js?v=mwvfdvot","js/puzzles.js?v=mwvfdvot","js/pwa.js?v=mwvfdvot","js/quality.js?v=mwvfdvot","js/stats.js?v=mwvfdvot","js/store.js?v=mwvfdvot","js/words.js?v=mwvfdvot","js/words5.js?v=mwvfdvot"];
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

// Files with ?v= never change (a release gets a new ?v=), so they come
// straight from the cache: a slow or stalled connection can't hold up the
// game. Everything else (the page itself) tries the network first, but gives
// up after a few seconds and uses the saved copy so the game still opens.
const NETWORK_WAIT_MS = 3000;

function fromNetwork(req) {
  return fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}

function fromCache(req) {
  return caches.match(req, { ignoreSearch: req.mode === 'navigate' })
    .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.searchParams.has('v')) {
    e.respondWith(caches.match(req).then((hit) => hit || fromNetwork(req)));
    return;
  }
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (res) => { if (!done && res) { done = true; resolve(res); } };
    // Slow network: use the saved copy if there is one, else keep waiting.
    const timer = setTimeout(() => fromCache(req).then(finish), NETWORK_WAIT_MS);
    fromNetwork(req)
      .then((res) => { clearTimeout(timer); finish(res); })
      .catch(() => { clearTimeout(timer); fromCache(req).then((hit) => finish(hit || Response.error())); });
  }));
});
