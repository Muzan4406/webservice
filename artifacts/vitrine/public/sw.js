const CACHE_NAME = 'muzan-v1';
const STATIC_ASSETS = ['/', '/logo.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests; pass everything else (API, etc.) through
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never cache API calls
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/webhooks')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
