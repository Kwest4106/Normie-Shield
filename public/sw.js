// sw.js - FINAL FIXED - immediate control on first load

self.importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

if (typeof workbox !== 'undefined') {
  // Empty precache to prevent appendChild crash
  workbox.precaching.precacheAndRoute([]);

  // Pages - NetworkFirst
  workbox.routing.registerRoute(
    ({request}) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages'
    })
  );

  // Static assets (CSS, JS, JSON, manifest)
  workbox.routing.registerRoute(
    /\.(?:css|js|json|webmanifest)$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'static-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365
        })
      ]
    })
  );

  // Images/SVGs/icons
  workbox.routing.registerRoute(
    /\.(?:png|jpg|jpeg|svg|ico)$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30
        })
      ]
    })
  );

  // Solana RPC endpoints - bypass cache
  workbox.routing.registerRoute(
    ({url}) => url.hostname.includes('solana.com') || url.hostname.includes('ankr.com') || url.hostname.includes('extrnode.com') || url.hostname.includes('projectserum.com'),
    new workbox.strategies.NetworkOnly()
  );

  // External libraries
  workbox.routing.registerRoute(
    ({url}) => url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com'),
    new workbox.strategies.CacheFirst({
      cacheName: 'external-scripts',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Default handler
  workbox.routing.setDefaultHandler(new workbox.strategies.NetworkFirst());

  // === CRITICAL FIX: Take control immediately ===
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  // Claim clients on activate
  self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
  });
} else {
  // Silent fallback
  self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  });
}
