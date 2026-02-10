/**
 * Service Worker for offline support
 * Safari-compatible version
 */

const CACHE_NAME = 'kitchen-profi-v3'; // Incremented version to force update
// Remove static assets that don't exist as files
// Safari fails if cache.addAll() includes non-existent URLs
const STATIC_ASSETS = [
  '/', // Only cache root, let Next.js handle routing
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Safari-compatible: Add assets one by one and catch errors
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              // Don't fail the entire install if one asset fails
              return null;
            })
          )
        );
      })
      .then(() => {
        // Only skip waiting if we're not already active
        if (!self.registration.active) {
          self.skipWaiting();
        }
      })
      .catch((error) => {
        console.warn('Service Worker install error:', error);
        // Don't fail silently - Safari needs explicit error handling
        // But don't block the app from loading
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        // Safari-compatible: Only claim clients if we have an active registration
        if (self.registration.active) {
          return self.clients.claim();
        }
      })
      .catch((error) => {
        console.warn('Service Worker activate error:', error);
        // Don't fail the activation
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests (they should use IndexedDB cache)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // CRITICAL: Skip ALL external resources BEFORE attempting to fetch
  // This prevents CSP violations for Google Fonts, etc.
  if (url.origin !== self.location.origin) {
    // Don't intercept external requests - let browser handle them
    return;
  }

  // Safari-compatible: Only respond to requests we can handle
  try {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Cache asynchronously (don't block response)
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                })
                .catch((err) => {
                  console.warn('Failed to cache response:', err);
                });

              return response;
            })
            .catch((error) => {
              // Safari-compatible: Return original fetch error, don't create fake response
              console.warn('Service Worker fetch error:', error);
              // Let browser handle the error naturally
              throw error;
            });
        })
        .catch(() => {
          // If cache match fails, try network
          return fetch(request).catch((err) => {
            console.warn('Service Worker network fallback failed:', err);
            // Return a minimal error response for Safari
            return new Response('Network error', { 
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
  } catch (error) {
    // Safari-compatible: If respondWith fails, don't break the app
    console.warn('Service Worker respondWith error:', error);
    // Let the browser handle the request normally
  }
});
