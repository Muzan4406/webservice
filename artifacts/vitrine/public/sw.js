const CACHE_NAME = 'muzan-v2';
const APP_SHELL = '/';
const STATIC_ASSETS = ['/logo.png', '/icon-192.png', '/icon-512.png'];

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

  // Always prefer the network for document navigations. The old service
  // worker cached "/" as the app shell, which could leave an installed PWA
  // serving an old HTML file pointing to a deleted, hashed JS bundle after a
  // deployment. Use the cached shell only when the device is offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(APP_SHELL))
    );
    return;
  }

  // Hashed Vite assets are safe to cache, while the service worker itself
  // must always be checked so installed clients can receive updates.
  if (url.pathname === '/sw.js' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
