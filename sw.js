var CACHE = 'wagecheck-v1.0.0';
var ASSETS = [
  '/WageCheck/',
  '/WageCheck/index.html',
  '/WageCheck/manifest.json',
  '/WageCheck/favicon.svg',
  '/WageCheck/favicon.ico',
  '/WageCheck/icon-76.png',
  '/WageCheck/icon-120.png',
  '/WageCheck/icon-152.png',
  '/WageCheck/icon-180.png',
  '/WageCheck/icon-192.png',
  '/WageCheck/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=DM+Serif+Display&display=swap'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match('/WageCheck/index.html');
      });
    })
  );
});
