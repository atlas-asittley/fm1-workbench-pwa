// Service worker for fm1-workbench-pwa (not part of M-VAVE's build).
// Pre-caches the wrapped workbench and serves it cache-first, so the app works offline after
// the first visit. tools/update.mjs rewrites CACHE_VERSION on every update; a new version
// installs alongside, then deletes every older fm1-wb-* cache when it activates.
const CACHE_VERSION = 'fm1-wb-V14-4b3197fd-r6';
const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'gate.js',
  'phone.css',
  'phone.js',
  'cheatsheet.html',
  'vendor/supabase.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // cache:'reload' skips the HTTP cache so an update never pre-caches a stale copy.
    await cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys())
      if (key.startsWith('fm1-wb-') && key !== CACHE_VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // leave everything else to the network
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    if (req.mode === 'navigate') {
      // Any page load inside the app (./, ./index.html, ?lang=en …) gets the cached workbench.
      return (await cache.match('index.html')) || fetch(req);
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || fetch(req);
  })());
});
