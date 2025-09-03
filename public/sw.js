// Simple service worker for PWA functionality
const CACHE_NAME = 'nbd-v2'; // Increment cache version
const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
]; // Remove pages from cache, only cache static assets

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - network first strategy for better development experience
self.addEventListener('fetch', (event) => {
  // Only cache static assets, let pages/API calls go through network
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('.js') ||
      event.request.url.includes('.css') ||
      event.request.method !== 'GET') {
    // Always fetch from network for API calls, scripts, styles
    return;
  }

  // For static assets, try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network succeeds, use that and update cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache as fallback
        return caches.match(event.request);
      })
  );
});

// Activate event - clean up old caches
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
    })
  );
});