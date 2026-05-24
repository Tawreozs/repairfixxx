const CACHE_NAME = 'repair-new-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let API requests bypass the cache so they always hit the actual database/express routes
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, but fetch fresh in the background for next load (stale-while-revalidate)
        fetch(event.request).then((freshResponse) => {
          if (freshResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, freshResponse));
          }
        }).catch(() => {/* Ignore network errors offline */});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Cache static files on-the-fly (assets, fonts, etc.)
        if (response.status === 200 && event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => {
      // Fallback in case of absolute offline and missing cache
      return caches.match('/index.html');
    })
  );
});
