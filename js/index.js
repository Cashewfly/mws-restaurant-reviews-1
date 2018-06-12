var staticCacheName = 'wittr-static-v3';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
      "/",
      "/index.html",
      "/restaurant.html",
      "/css/styles.css",
      "/js/dbhelper.js",
      "/js/indexController.js",               // TODO Need to change this to sw-register.js or something
      "/js/index.js",                         // TODO Need to change this to sw.js or something
      "/js/main.js",
      "/js/restaurant_info.js",
      ]).catch(function(error) {
        console.log("caches.open failed: " + error);
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('wittr-') &&
                 cacheName != staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  // TODO:  respond to requests for the root page with
  // the page skeleton from the cache

  var requestUrl	=	new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/skeleton'));
      return;
    }
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
