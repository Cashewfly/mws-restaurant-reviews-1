//https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

importScripts('js/idb.js');

//TODO Note that having this in multiple places is an invitation for problems...

var dbPromise = idb.open('udacity-rr-idb',/*version*/1,upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var db = upgradeDb.createObjectStore('rr',{keyPath: "key"});  // At this point I'm not sure 
      db.createIndex("rr_key","rr_key");                            // that storing anything but the 
                                                                    // single giant json response has
                                                                    // benefit given the way dbhelper 
                                                                    // works.  Performance tests will
                                                                    // tell... TODO
    // end case - remember to fall through on cases for versioning
  }
});

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

//Per https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent, the
//event that is handed to this listener will do it's default fetch action
//unless somewhere in the listener there is a event.respondWith(...).  Note
//that event.respondWith(...) returns a Promise.
//
//Note that dbhelper expects the response in the format that it comes from the
//server.  Also note that I can change that :)

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  if (url.port === "1337") {
    if (event.request.method === "GET") {
      console.log("GET: "+url);

      fetch(event.request).then(function(response) {
        // TODO - first test - store it, then return it.  No retrieving
        dbPromise.then(function(db) {
          var tx    = db.transaction('udacity-rr-idb','readwrite');
          var store = tx.objectStore('udacity-rr-idb');

          store.put(response);
        })
        return response;
      }).catch(function(error) {
        console.log("Responding with an error " + error);
        event.respondWith(new Response("Error fetching data",{status:500}));
      });
    }
  } else {
    //console.log("!1337 "+event.request.method + " " + url);

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

