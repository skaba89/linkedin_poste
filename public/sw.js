/// <reference lib="webworker" />

const CACHE_NAME = 'datasphere-v2';
const STATIC_CACHE = 'datasphere-static-v2';
const DYNAMIC_CACHE = 'datasphere-dynamic-v2';

// Assets to pre-cache (cache-first)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Cache max age (7 days)
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up ALL old caches (including v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Helper: check if request is for a static asset
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.ico');
}

// Helper: check if request is for an internal navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Fetch strategy: NETWORK-FIRST for everything to avoid stale cache issues
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (except CDN images)
  if (url.origin !== self.location.origin && !url.hostname.includes('z-cdn.chatglm.cn')) return;

  // Strategy: Network-first for ALL requests
  // This ensures users always get the latest version
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const cacheName = isStaticAsset(url) ? STATIC_CACHE : DYNAMIC_CACHE;
          const responseClone = response.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached index page
          if (isNavigationRequest(event.request)) {
            return caches.match('/');
          }
          return new Response('Hors ligne', { status: 503 });
        });
      })
  );
});
