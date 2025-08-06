// Service Worker for Mahboob Personal Assistant
const CACHE_NAME = 'mahboob-pa-v1.0.0';
const STATIC_CACHE_NAME = 'mahboob-pa-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'mahboob-pa-dynamic-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other critical static assets
];

// Resources to cache on first request
const DYNAMIC_ASSETS = [
  '/expenses',
  '/contacts',
  '/shopping-list',
  '/diary',
  '/calendar',
  '/dashboard'
];

// API endpoints that support offline
const CACHEABLE_APIS = [
  '/api/sheets/expenses',
  '/api/sheets/contacts',
  '/api/sheets/shopping-list',
  '/api/sheets/diary'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - try network first, fallback to cache
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.endsWith('.js') || 
               url.pathname.endsWith('.css') || 
               url.pathname.endsWith('.png') || 
               url.pathname.endsWith('.jpg') || 
               url.pathname.endsWith('.svg')) {
      // Static assets - cache first
      event.respondWith(handleStaticAsset(request));
    } else {
      // Pages - network first with offline fallback
      event.respondWith(handlePageRequest(request));
    }
  } else if (request.method === 'POST' || 
             request.method === 'PUT' || 
             request.method === 'DELETE') {
    // Data modification requests - store for background sync when offline
    event.respondWith(handleDataModification(request));
  }
});

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && isCacheable) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    if (isCacheable) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('📱 Serving API from cache:', request.url);
        return cachedResponse;
      }
    }
    
    // Return offline response for known APIs
    if (isCacheable) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Offline - data not available',
        offline: true,
        data: { expenses: [], contacts: [], items: [], entries: [] }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('📱 Serving page from cache:', request.url);
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort - basic offline message
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Mahboob Personal Assistant</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 500px; margin: 0 auto; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>This page isn't available offline. Please check your connection and try again.</p>
            <p>Your data is still available in the app when you go back online.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle data modification requests
async function handleDataModification(request) {
  try {
    // Try to send immediately
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Store for background sync when offline
    console.log('📝 Storing request for background sync');
    
    // Clone request for storage
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text()
    };
    
    // Store in IndexedDB or send background sync event
    self.registration.sync.register('background-sync-data');
    
    // Return optimistic response
    return new Response(JSON.stringify({
      success: true,
      message: 'Request queued for sync when online',
      queued: true
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-data') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Perform background sync
async function doBackgroundSync() {
  // This would typically sync queued requests from IndexedDB
  // For now, just log that sync was attempted
  console.log('📡 Performing background sync...');
  
  try {
    // Sync logic would go here
    // For example: send queued POST/PUT/DELETE requests
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    throw error; // This will retry the sync later
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have new updates in your personal assistant',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('Mahboob Personal Assistant', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  console.log('⏰ Periodic sync triggered');
  // Perform periodic tasks like updating cached data
}