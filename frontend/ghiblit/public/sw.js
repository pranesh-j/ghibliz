// public/sw.js
const CACHE_NAME = 'ghiblit-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/ghiblit.webp',
  '/style-icons/ghibli.webp',
  '/style-icons/onepiece.webp',
  '/style-icons/cyberpunk.webp',
  '/style-icons/shinchan.webp',
  '/style-icons/solo.webp',
  '/style-icons/pixar.webp',
  '/style-icons/dragonball.webp',
  '/gpay.svg',
  '/phonepe.svg',
  '/cred.svg',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback for API, cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try from cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Handle static assets - cache first
  if (
    url.pathname.match(/\.(webp|jpg|jpeg|png|svg|js|css)$/) ||
    ASSETS_TO_CACHE.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network and cache
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        });
      })
    );
    return;
  }
  
  // Default strategy for other requests - network first
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});