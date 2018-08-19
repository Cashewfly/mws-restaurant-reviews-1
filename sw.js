//importScripts('js/idb.js');

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
        "/js/idb.js",
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

//Per https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent, the
//event that is handed to this listener will do it's default fetch action
//unless somewhere in the listener there is a event.respondWith(...).  Note
//that event.respondWith(...) returns a Promise.
//
//Note that dbhelper expects the response in the format that it comes from the
//server.  Also note that I can change that :)

self.addEventListener('fetch', function(event) {
  //const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        //console.log("Returning cached response for " + url);
        return response;
      } else {
        //var i  = url.pathname.search('/jpg|mapbox|leaflet/');

        //if (i == -1) console.log("fetch " +i+ url.pathname);
        return(fetch(event.request));
      }
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

