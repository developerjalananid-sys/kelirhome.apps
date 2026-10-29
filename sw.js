// ================================================================
// Service Worker KELIR HOME APPS
// - Berkas aplikasi (same-origin): network-first (batas 4 dtk) -> cache
//   sehingga update di GitHub langsung terpakai, tetap bisa dibuka offline.
// - Pustaka CDN & font: stale-while-revalidate.
// - Panggilan API ke Google Apps Script: TIDAK pernah di-cache.
// Naikkan VERSION setiap kali Anda mengubah daftar SHELL.
// ================================================================
const VERSION = 'kelir-v2';
const SHELL = [
  './', 'index.html', 'config.js', 'api.js', 'pwa.js', 'pwa.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
const CDN_PRECACHE = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all([
        ...SHELL.map((u) => cache.add(u).catch(() => null)),
        ...CDN_PRECACHE.map((u) => cache.add(new Request(u, { mode: 'no-cors' })).catch(() => null))
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const fallback = () =>
      caches.match(request, { ignoreSearch: true })
        .then((hit) => hit || (request.mode === 'navigate' ? (caches.match('index.html').then((r) => r || caches.match('./'))) : undefined));
    const timer = setTimeout(() => {
      fallback().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, timeoutMs);
    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        if (!settled) { settled = true; resolve(res); }
      })
      .catch(() => {
        clearTimeout(timer);
        fallback().then((hit) => { if (!settled) { settled = true; resolve(hit || Response.error()); } });
      });
  });
}

function staleWhileRevalidate(request) {
  return caches.open(VERSION).then((cache) =>
    cache.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API Apps Script: biarkan lewat apa adanya.
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com')) return;

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, 4000));
    return;
  }
  if (/(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
