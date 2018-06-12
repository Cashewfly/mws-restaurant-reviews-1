var staticCacheName = 'restrev-v2';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      console.log("caches.open worked.  Adding assets");
      return cache.addAll([
      "/",
      "/index.html",
      "/restaurant.html",
      "/sw.js",
      "/css/styles.css",
      "/js/dbhelper.js",
      "/js/sw-register.js",    
      "/js/main.js",
      "/js/restaurant_info.js",
      ]).catch(function(error) {
        console.log("caches.open failed: " + error);
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log("activate");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restrev-') &&
                 cacheName != staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  console.log("fetch");
  //var requestUrl = new URL(event.request.url);

  //console.log("fetch: requestUrl is " + requestUrl);
  //

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
