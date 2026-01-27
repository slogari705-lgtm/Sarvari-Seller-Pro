const CACHE_NAME = 'sarvari-pos-v10'; // Incremented version for deployment

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/lucide-react@^0.563.0',
  'https://esm.sh/recharts@^3.7.0',
  'https://esm.sh/jsbarcode@^3.12.3',
  'https://esm.sh/@google/genai@^1.38.0',
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/html2canvas@^1.4.1',
  'https://cdn-icons-png.flaticon.com/512/9422/9422501.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching Core Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('SW: Purging Legacy Cache', key);
          return caches.delete(key);
        }
      })
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});