// MC Recovery Fund - Service Worker
// Version 1.2.0

const CACHE_NAME = 'mc-recovery-v1.2.0';
const STATIC_CACHE = 'mc-recovery-static-v1';
const DYNAMIC_CACHE = 'mc-recovery-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/favicon.webp',
  '/logo-mc-recovery.webp',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap&subset=cyrillic'
];

// JSON data files (dynamic content)
const DATA_FILES = [
  '/data/quizzes.json',
  '/data/glossary.json',
  '/data/edu.json',
  '/data/instructions.json',
  '/data/announcements.json',
  '/data/broadcasts.json',
  '/data/documents.json',
  '/data/support.json',
  '/data/dashboard.json',
  '/data/faq.json'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', event);
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', event);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Network-first strategy for JSON data (always fresh)
  if (request.url.includes('/data/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response to cache it
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache if not a success response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone response to cache it
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch((error) => {
          console.error('[SW] Fetch failed:', error);
          
          // Return offline page if available
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Message Event - Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => caches.delete(cache))
        );
      })
    );
  }
});

// Background Sync (future feature)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-user-data') {
    event.waitUntil(
      // Implement background sync logic here
      Promise.resolve()
    );
  }
});

// Push Notification (future feature)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление от MC Recovery Fund',
    icon: '/favicon.webp',
    badge: '/favicon.webp',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MC Recovery Fund', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
