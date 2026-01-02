// Service Worker for Kapellar RVM Panel - Enhanced Offline Support
const CACHE_NAME = 'kapellar-rvm-v2'
const API_CACHE_NAME = 'kapellar-api-v1'
const OFFLINE_URL = '/offline'

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/routers',
  '/dashboard/rvm',
  '/dashboard/dimdb',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
]

// API endpoints to cache
const API_CACHE_ENDPOINTS = [
  '/api/dashboard/stats',
  '/api/routers',
  '/api/rvm',
  '/api/dimdb',
  '/api/rvm/filters',
]

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) =>
            cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    })
  )
  self.clients.claim()
})

// Helper: Check if request is an API request
function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

// Helper: Check if API should be cached
function shouldCacheApi(url) {
  return API_CACHE_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))
}

// Helper: Check if request is auth-related
function isAuthRequest(url) {
  return url.pathname.includes('/auth/') || url.pathname.includes('/login')
}

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip auth requests - never cache these
  if (isAuthRequest(url)) return

  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(event.request, url))
    return
  }

  // Handle page/asset requests
  event.respondWith(handleAssetRequest(event.request))
})

// Network-first strategy for API with fallback to cache
async function handleApiRequest(request, url) {
  // Only cache specific API endpoints
  if (!shouldCacheApi(url)) {
    try {
      return await fetch(request)
    } catch {
      return new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    // Try network first
    const response = await fetch(request)

    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME)
      // Clone response before caching
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', url.pathname)
      return cachedResponse
    }

    // No cache, return offline response
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Çevrimdışı - önbelleğe alınmış veri yok',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Stale-while-revalidate for assets
async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request)

  // Return cached version immediately if available
  if (cachedResponse) {
    // Revalidate in background
    fetch(request).then((response) => {
      if (response.status === 200) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response)
        })
      }
    }).catch(() => {
      // Ignore revalidation errors
    })

    return cachedResponse
  }

  // No cache, try network
  try {
    const response = await fetch(request)

    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }

    return response
  } catch {
    // Network failed and no cache
    if (request.mode === 'navigate') {
      // Return offline page for navigation requests
      const offlinePage = await caches.match(OFFLINE_URL)
      if (offlinePage) return offlinePage
    }

    return new Response('Offline', { status: 503 })
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  // Clear API cache on demand
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      console.log('[SW] API cache cleared')
    })
  }

  // Force refresh API cache
  if (event.data && event.data.type === 'REFRESH_API_CACHE') {
    caches.open(API_CACHE_NAME).then((cache) => {
      API_CACHE_ENDPOINTS.forEach((endpoint) => {
        fetch(endpoint).then((response) => {
          if (response.status === 200) {
            cache.put(endpoint, response)
          }
        }).catch(() => {})
      })
    })
  }
})

// Background sync for offline actions (future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  console.log('[SW] Background sync triggered')
  // Implement background sync logic here if needed
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
      },
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  )
})
