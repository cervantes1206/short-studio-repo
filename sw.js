const CACHE_NAME = 'shorts-studio-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GET requests: network-first, falling back to cache only when
// offline. The app is under active development — always prefer the latest
// server response over a possibly-stale cached one; cache exists purely for
// offline support, not as the default source of truth.
// Cross-origin requests (fonts, Google Identity Services, YouTube API) pass through untouched.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
