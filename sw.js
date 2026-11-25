// Service worker: makes the game work offline and installable.
// Bump CACHE when releasing a new version so phones download the update.
const CACHE = 'hnk-v2.7';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-32.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/animals.js',
  './js/audio.js',
  './js/boot.js',
  './js/chapter3.js',
  './js/chapter4.js',
  './js/chapter5.js',
  './js/economy.js',
  './js/events.js',
  './js/family.js',
  './js/game.js',
  './js/guns.js',
  './js/i18n.js',
  './js/jobs.js',
  './js/lang_en.js',
  './js/life.js',
  './js/map.js',
  './js/mapview.js',
  './js/minigames.js',
  './js/missions.js',
  './js/music.js',
  './js/people.js',
  './js/phmap.js',
  './js/police.js',
  './js/portraits.js',
  './js/progression.js',
  './js/pwa.js',
  './js/save.js',
  './js/settings.js',
  './js/share.js',
  './js/traffic.js',
  './js/tutorial.js',
  './js/ui.js',
  './js/util.js',
  './js/vehicles.js',
  './js/wardrobe.js',
  './js/weapons.js',
  './js/world.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fonts: cache as they load (stale-while-revalidate)
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // game files: network first (so updates arrive), cache fallback when offline
  e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then((h) => h || caches.match('./index.html'))));
});
