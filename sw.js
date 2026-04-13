const CACHE_NAME = 'brand-jamaica-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json',
  '/icon-512.png',
  '/cream-paper-ai.png',
  '/new-tape.png'
];

// 1. Install - Pre-cache the shell
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become active
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all open pages immediately
});

// 3. Fetch - "Network-First" Strategy (to ensure updates are seen each time)
self.addEventListener('fetch', (event) => {
  // We prefer network for the main app logic to show fresh changes
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network is successful, update cache and return
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), use the cache
        return caches.match(event.request);
      })
  );
});
