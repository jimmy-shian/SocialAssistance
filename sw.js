// Service Worker for image and data caching (7 days)
const CACHE_NAME = 'sa-static-v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Cleanup old caches if version changed
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isCacheTarget(req) {
  try {
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return false; // same-origin only
    // Cache images and generated data files
    if (req.destination === 'image') return true;
    if (url.pathname.startsWith('/img/')) return true;
    if (url.pathname.startsWith('/js/data/')) return true;
    return false;
  } catch (e) { return false; }
}

async function putWithTimestamp(cache, request, response) {
  try {
    const cloned = response.clone();
    const body = await cloned.blob();
    const headers = new Headers(cloned.headers);
    headers.set('x-sw-fetch-time', Date.now().toString());
    const wrapped = new Response(body, { status: cloned.status, statusText: cloned.statusText, headers });
    await cache.put(request, wrapped.clone());
    return wrapped;
  } catch (e) {
    // Fallback: store original response if wrapping fails
    await cache.put(request, response.clone());
    return response;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!isCacheTarget(req)) return; // pass-through

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: false });
    // If cached and fresh within TTL -> serve
    if (cached) {
      const ts = Number(cached.headers.get('x-sw-fetch-time') || '0');
      if (ts && (Date.now() - ts) < TTL_MS) {
        // Revalidate in background
        event.waitUntil(fetch(req).then(res => { if (res && res.ok) return putWithTimestamp(cache, req, res); }).catch(()=>{}));
        return cached;
      }
    }
    // Otherwise fetch from network
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.ok) return await putWithTimestamp(cache, req, res);
      if (cached) return cached; // fallback to stale cached
      return res;
    } catch (e) {
      if (cached) return cached; // offline fallback
      throw e;
    }
  })());
});
