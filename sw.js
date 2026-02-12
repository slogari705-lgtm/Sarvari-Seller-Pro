
const CACHE_NAME = 'sarvari-pos-v1.3.2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/9422/9422501.png',
  // Pre-cache core dependencies from importmap
  'https://esm.sh/react@^19.2.4',
  'https://esm.sh/react-dom@^19.2.4/',
  'https://esm.sh/lucide-react@^0.563.0',
  'https://esm.sh/recharts@^3.7.0',
  'https://esm.sh/html5-qrcode@^2.3.8',
  'https://esm.sh/jspdf@^2.5.1',
  'https://esm.sh/html2canvas@^1.4.1'
];

// Install Event - Pre-cache core UI
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    ))
  );
  return self.clients.claim();
});

// Background Sync Logic
self.addEventListener('sync', (event) => {
  if (event.tag === 'sarvari-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'TRIGGER_SYNC' });
  });
}

// Fetch Event - Cache First for assets, Network First for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Navigation requests: Try network, fallback to offline index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // General caching strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // Cache external assets (Tailwind, ESM.sh, Google Fonts)
        const shouldCache = url.origin === location.origin || 
                           url.hostname.includes('esm.sh') || 
                           url.hostname.includes('tailwindcss.com') ||
                           url.hostname.includes('fonts.googleapis.com') ||
                           url.hostname.includes('fonts.gstatic.com');

        if (networkResponse && networkResponse.status === 200 && shouldCache) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for missing images
        if (event.request.destination === 'image') {
          return new Response('<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><rect width="100%" height="100%" fill="#eee" /><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#999" text-anchor="middle">Asset Offline</text></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});
