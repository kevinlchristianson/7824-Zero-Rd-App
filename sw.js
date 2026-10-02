// Bump VERSION whenever you change index.html so phones pick up the new copy,
// and set the same value in index.html (meta app-version and the #appver label in the header).
const VERSION = 'v15';
const CACHE = 'zr-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './chat-config.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/three/build/three.module.min.js',
  './vendor/three/examples/jsm/controls/OrbitControls.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('zr-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so edits show up when online), fall back to cache offline.
// Anything fetched successfully (fonts, packet PDFs you've opened) is cached for next time.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // chat traffic (Firestore, sign-in) goes straight to the network: its long-lived streams must never be cached
  const host = new URL(e.request.url).hostname;
  if (host.endsWith('googleapis.com') && host !== 'fonts.googleapis.com') return;
  e.respondWith(
    // same-origin files skip the browser's HTTP cache (GitHub Pages lets it keep pages for 10 minutes)
    fetch(e.request, new URL(e.request.url).origin === self.location.origin ? { cache: 'no-cache' } : undefined)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
