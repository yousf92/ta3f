// Define the cache name and version. A new version will trigger the 'activate' event.
const CACHE_NAME = 'my-app-cache-v4'; // ژمارەی ڤێرژن زیادکرا بۆ ئەوەی ئەپدەیت بێتەوە

// List of all the files and assets to be cached for offline access.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/main.html',
  '/library.html',
  '/diaries.html',
  '/articles.html',
  '/chat.html',
  '/follow-up.html',
  '/settings.html',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  
  // --- START: زیادکردنی هەموو وێنەکان ---
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // main.html
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop', // diaries.html
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80', // follow-up.html
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1920&q=80', // settings.html
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&q=80', // articles.html
  'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2103&auto=format&fit=crop' // chat backgrounds
  // --- END: زیادکردنی هەموو وێنەکان ---
];

// --- Install Event ---
// This event is triggered when the service worker is first installed.
// It opens the cache and adds all the essential app files to it.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Use addAll with a new Request object to bypass cache for the initial fetch
        const cachePromises = FILES_TO_CACHE.map(url => {
            return cache.add(new Request(url, {cache: 'reload'}));
        });
        return Promise.all(cachePromises);
      })
  );
});

// --- Fetch Event ---
// This event intercepts all network requests from the app.
// It applies a "Cache First" strategy: it checks the cache for a response first,
// and if not found, it fetches the resource from the network.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is found in the cache, return it.
        if (response) {
          return response;
        }
        // If not found, fetch it from the network.
        return fetch(event.request);
      })
  );
});

// --- Activate Event ---
// This event is triggered after the service worker is installed and activated.
// It's used to clean up old caches to ensure only the latest version is used.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If a cache name is not in our whitelist, delete it.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
