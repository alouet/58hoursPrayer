/* ==========================================================================
   service-worker.js — offline support
   • App shell: pre-cached, served cache-first, refreshed in the background.
   • Google Fonts: cached at runtime (stale-while-revalidate).
   • Everything else (e.g. your sync endpoint) goes straight to the network.
   Bump VERSION whenever you deploy changed files.
   ========================================================================== */
const VERSION = 'mdt-v1.1.0';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.json',
  'js/worldmap.js', 'js/util.js', 'js/storage.js', 'js/sync.js', 'js/timer.js', 'js/goals.js',
  'js/declarations.js', 'js/scriptures.js', 'js/sound.js', 'js/visualization.js', 'js/achievements.js',
  'js/analytics.js', 'js/vision.js', 'js/prayer.js', 'js/journal.js', 'js/notifications.js', 'js/settings.js', 'js/pwa.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg'
];
const FONT_CACHE = 'mdt-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return; // sync endpoints etc.

  // Navigations: network first (fresh deploys), fall back to cached shell offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Static files: cache first, update in background
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});

// Focus the app when a reminder notification is tapped
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./#pray');
  }));
});
