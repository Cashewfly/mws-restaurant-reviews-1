var staticCacheName = 'restrev-v2';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      //console.log("caches.open worked.  Adding assets");
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
  //console.log("activate");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restrev-') && cacheName != staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  console.log("event.request.method="+event.request.method + " " + url);

  if (url.port === "1337") {
    if (event.request.method === "GET") {
      console.log("port="+url.port);

      fetch(event.request).then(function(response) {
        response.json().then(function(json) {
          console.log("json");
        });
        console.log("Responding with dude");
        event.respondWith(new Response("Dude",{status:200}));
      }).catch(function(error) {
        console.log("Responding with an error " + error);
        event.respondWith(new Response("Error fetching data",{status:500}));
      });
      console.log("post-fetch");
      return;
      console.log("post-return post-fetch");
    } else {
      console.log("Responding with dood");
      event.respondWith(new Response("Dood",{status:500}));
      return;
      console.log("post-return dood");
    }
    console.log("How the heck am I here?");
    event.respondWith(new Response("What?",{status:500}));
    return;
    console.log("post-return heck");
  } else {
    console.log("Oh crap");

    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
