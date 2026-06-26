const CACHE_NAME = 'kazify-pwa-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install event - Precache basic skeleton
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[Service Worker] Pre-caching core skeleton and fonts');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up stale caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network First with Cache Fallback for robust offline resilience in Kisumu
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);

  // Skip API calls, chrome-extension, and non-GET requests to prevent corruption
  if (
    event.request.method !== 'GET' || 
    requestUrl.pathname.includes('/api/') || 
    !event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('https://fonts.')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(networkResponse) {
        // Guard response validation
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !event.request.url.startsWith('https://fonts.')) {
          return networkResponse;
        }

        // Cache the successful dynamic asset (JS bundles, images, css)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(function() {
        console.log('[Service Worker] Network failed, searching cache for:', event.request.url);
        // Fall back to offline cache
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return index.html for navigation requests to enable SPA routing support offline
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Push Notifications
self.addEventListener('push', function(event) {
  let data = { title: 'New Job Request 🚀', body: 'A new service request is available on Kazify!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Job Request 🚀', body: event.data.text() };
    }
  }

  const notif = data.notification || data;

  const options = {
    body: notif.body || notif.content || '',
    icon: notif.icon || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=128&q=80',
    badge: notif.badge || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=128&q=80',
    vibrate: notif.vibrate || [100, 50, 100],
    data: notif.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(notif.title || 'New Kazify Service Alert', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
