// Define cache names for static app shell and dynamic assets
const STATIC_CACHE_NAME = 'app-shell-cache-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-assets-cache-v1';

// List of app shell files to be pre-cached
const APP_SHELL_FILES = [
  './library.html',
  './main.html',
  './diaries.html',
  './articles.html',
  './chat.html',
  './follow-up.html',
  './settings.html',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80'
];

/**
 * Install Event:
 * This event is triggered when the service worker is first installed.
 * It opens the static cache and adds all the essential app shell files to it.
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching App Shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .catch(error => {
        console.error('[Service Worker] App Shell caching failed:', error);
      })
  );
});

/**
 * Activate Event:
 * This event is triggered after the service worker is installed and a new version is activated.
 * It's used to clean up old caches to ensure only the latest assets are used and storage is managed.
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

/**
 * Fetch Event:
 * This event intercepts all network requests from the app.
 * It implements a "Cache First, falling back to Network" strategy.
 * When a resource is fetched from the network, it is dynamically added to the cache.
 */
self.addEventListener('fetch', (event) => {
    // Ignore requests to Firebase and Uploadcare to avoid caching issues with dynamic/auth data.
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('ucarecdn.com')) {
        return; // Let the browser handle the request without interception.
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // 1. If the resource is found in any cache, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 2. If not in cache, fetch it from the network.
                return fetch(event.request).then((networkResponse) => {
                    
                    // We only cache successful responses (status 200)
                    // and 'basic' (same-origin) or 'cors' type responses.
                    if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                        return networkResponse;
                    }

                    // IMPORTANT: A response is a stream and can only be consumed once.
                    // We need to clone it to have one stream for the browser and one for the cache.
                    const responseToCache = networkResponse.clone();

                    // 3. Open the dynamic cache and add the new resource for future offline use.
                    caches.open(DYNAMIC_CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                });
            }).catch(error => {
                // This catch handles exceptions from fetch(), which usually means the user is offline.
                console.log('[Service Worker] Fetch failed; user is likely offline.', error);
                // Optionally, you could return a fallback offline page here if one was cached,
                // for example: return caches.match('./offline.html');
            })
    );
});
