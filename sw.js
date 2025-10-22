// sw.js
const CACHE_NAME = 'la-abrah-cache-v2'; // قمنا بتغيير الإصدار لتحديث الكاش

const STATIC_FILES_TO_CACHE = [
  '/',
  'index.html',
  'signup.html',
  'main.html',
  'diaries.html',
  'articles.html',
  'chat.html',
  'follow-up.html',
  'library.html',
  'settings.html',
  'chat.style.css',
  'chat.setup.js',
  'chat.script.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// عند التثبيت: تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      // Using addAll for atomic caching of essential files
      return cache.addAll(STATIC_FILES_TO_CACHE).catch(error => {
        console.error('[Service Worker] Failed to cache static assets during install:', error);
        // If addAll fails, try adding individually to see which ones failed
        STATIC_FILES_TO_CACHE.forEach(fileUrl => {
            cache.add(fileUrl).catch(err => console.warn(`Failed to cache ${fileUrl}: ${err}`));
        });
      });
    })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

// عند التفعيل: حذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages under this SW's scope immediately.
  );
});

// عند طلب أي ملف (Fetch): تطبيق استراتيجية التخزين المؤقت
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // تجاهل الطلبات التي ليست من نوع GET أو طلبات الامتدادات (إذا كانت لديك)
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }

  // استراتيجية "Stale-While-Revalidate" للصور وملفات PDF والمصادر الخارجية المحددة
  const isExternalAsset = request.url.includes('ucarecdn.com') || request.url.includes('cloudinary.com') || request.url.includes('unsplash.com') || request.url.includes('gstatic.com/firebasejs') || request.url.includes('cdn.jsdelivr.net') || request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com') || request.url.includes('cdnjs.cloudflare.com');

  if (request.destination === 'image' || request.url.endsWith('.pdf') || isExternalAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // تأكد من أن الرد صالح قبل تخزينه
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors') {
              cache.put(request, networkResponse.clone());
            } else if (!networkResponse || networkResponse.status !== 200) {
               console.warn(`[Service Worker] Failed to fetch and cache: ${request.url}, Status: ${networkResponse ? networkResponse.status : 'No Response'}`);
            }
            return networkResponse;
          }).catch(err => {
            console.error('[Service Worker] Network fetch failed; returning cached response if available.', request.url, err);
            // إذا فشل الاتصال بالشبكة وكان هناك رد مخزن، سيتم إرجاعه أدناه
            // يمكنك هنا إرجاع رد احتياطي عام إذا لم يكن هناك رد مخزن
             if (!cachedResponse) {
                // Example: Return a placeholder image if it's an image request
                // if (request.destination === 'image') {
                //   return caches.match('/placeholder-image.png');
                // }
                // For other types, just let the browser handle the error
             }
          });

          // إذا كان الملف موجوداً في الكاش، أرجعه فوراً، وفي الخلفية حاول تحديثه.
          // إذا لم يكن في الكاش، انتظر جلبه من الشبكة.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // استراتيجية "Cache First, falling back to Network" للملفات الأساسية والتنقل بين الصفحات
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        // console.log('[Service Worker] Returning from cache:', request.url);
        return response;
      }
      // console.log('[Service Worker] Fetching from network:', request.url);
      return fetch(request).then(networkResponse => {
           // Optionally cache newly fetched navigation/static assets if needed,
           // but be careful as STATIC_FILES_TO_CACHE should handle the core ones.
           // Caching everything here might bloat the cache unnecessarily.
           /*
           if (networkResponse && networkResponse.status === 200) {
                const shouldCache = STATIC_FILES_TO_CACHE.includes(new URL(request.url).pathname) || request.destination === 'document';
                if(shouldCache){
                    caches.open(CACHE_NAME).then(cache => {
                         cache.put(request, networkResponse.clone());
                    });
                }
           }
           */
           return networkResponse;
      }).catch(error => {
          console.error('[Service Worker] Fetch failed for non-asset; returning offline fallback page might be needed here.', request.url, error);
          // Optional: Return a specific offline fallback HTML page for navigation requests
          // if (request.mode === 'navigate') {
          //   return caches.match('/offline.html');
          // }
      });
    })
  );
});
