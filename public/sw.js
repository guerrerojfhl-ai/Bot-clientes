// Service Worker robusto — no falla aunque falten assets
const CACHE_NAME = 'botclientes-v1';
const ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Instalar: precachear lo que se pueda (sin fallar si falta algo)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn('⚠️ No se pudo cachear:', url, err.message);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first, APIs siempre red
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // APIs: siempre red (nunca cache)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // No manejar peticiones que no sean GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Assets: network-first con fallback a cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request).then(cached => {
                return cached || new Response('Sin conexión', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            }))
    );
});