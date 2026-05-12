// CBT Online - Service Worker (Main)
const CACHE_NAME = 'cbt-main-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style-core.min.css',
  '/style-login-lite.min.css',
  '/style-modals.min.css',
  '/style-dashboard.min.css',
  '/style-sync.min.css',
  '/style-index-modals.min.css',
  '/script.min.js',
  '/supabase-adapter.min.js',
  '/supabase-patch.min.js',
  '/firebase-mock.min.js',
  '/mobile-core.min.js',
  '/admin-auth.min.js',
  '/icon-512.png',
  '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      }))
  );
  self.skipWaiting();
});

// Activate - cleanup old caches
self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && !key.includes('images') && !key.includes('predictive') && !key.includes('differential')) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and API requests
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase')) return;

  e.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request).then(cached => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

console.log('[SW] ✅ Main Service Worker loaded');
