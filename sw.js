// --- START: Added Spinner Functions ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.add('show');
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.remove('show');
    }
}
// --- END: Added Spinner Functions ---

// Define the cache name and version. A new version will trigger the 'activate' event.
const CACHE_NAME = 'my-app-cache-v11';

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
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80'
];

// --- Install Event ---
// This event is triggered when the service worker is first installed.
// It opens the cache and adds all the essential app files to it.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
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
