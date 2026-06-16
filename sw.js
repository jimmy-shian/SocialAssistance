// Service Worker for image and data caching (7 days)
const CACHE_NAME = 'social-assistance-cache-v2';
const IMAGE_CACHE_NAME = 'images-v2';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMAGE_CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isImageRequest(req) {
  try {
    const url = new URL(req.url);
    if (req.destination === 'image') return true;
    const path = url.pathname.toLowerCase();
    if (path.endsWith('.webp') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.svg') || path.endsWith('.gif')) {
      return true;
    }
    return false;
  } catch (e) { return false; }
}

function isDataRequest(req) {
  try {
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return false;
    // Do not cache /js/data/ files to prevent stale caching issues
    if (url.pathname.startsWith('/js/data/')) return false;
    return false;
  } catch (e) { return false; }
}

async function putWithTimestamp(cache, request, response) {
  try {
    if (response.type === 'opaque') {
      await cache.put(request, response.clone());
      return response;
    }
    const cloned = response.clone();
    const body = await cloned.blob();
    const headers = new Headers(cloned.headers);
    headers.set('x-sw-fetch-time', Date.now().toString());
    const wrapped = new Response(body, { status: cloned.status, statusText: cloned.statusText, headers });
    await cache.put(request, wrapped.clone());
    return wrapped;
  } catch (e) {
    await cache.put(request, response.clone());
    return response;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isImg = isImageRequest(req);
  const isData = isDataRequest(req);
  if (!isImg && !isData) return;

  const cacheName = isImg ? IMAGE_CACHE_NAME : CACHE_NAME;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req, { ignoreSearch: false });
    if (cached) {
      const ts = Number(cached.headers.get('x-sw-fetch-time') || '0');
      if (ts && (Date.now() - ts) < TTL_MS) {
        event.waitUntil(
          fetch(req)
            .then(res => { if (res && (res.ok || res.type === 'opaque')) return putWithTimestamp(cache, req, res); })
            .catch(()=>{})
        );
        return cached;
      }
    }
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) return await putWithTimestamp(cache, req, res);
      if (cached) return cached;
      return res;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  })());
});
