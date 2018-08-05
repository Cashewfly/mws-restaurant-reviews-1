//https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
//https://github.com/jakearchibald/idb
//https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

importScripts('js/idb.js');

const db_name         =  'udacity-rr-idb';
const db_store        =  'rr';
const db_key          =  'id';
const i_hood          =  'neighborhood';
const i_type          =  'cuisine_type';
const i_hood_type     =  i_hood+i_type;
const db_version      =  1;

var dbPromise = idb.open(db_name,db_version,upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var db = upgradeDb.createObjectStore(db_store,{keyPath: db_key});

      db.createIndex(i_hood       ,'neighborhood');                   //  Not sure this is needed
      db.createIndex(i_type       ,'cuisine_type');                   //  Not sure this is needed
      db.createIndex(i_hood_type  ,['neighborhood','cuisine_type']);

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
  const url = new URL(event.request.url);

  if (url.port === "1337") {
    if (event.request.method === "GET") {
      console.log("GET: "+url);

      dbPromise.then(function(db) {
        var tx    = db.transaction(db_store,'readwrite');
        var store = tx.objectStore(db_store);

        console.log("pre-Retrieving items\n");

        store.getAll().then(function(data) {
          if (data.length) {
            console.log("Returning " + data.length + " items");
            return(data);
          } else {
            console.log("Fetching event.request");
    
            fetch(event.request).then(function(response) {
              dbPromise.then(function(db) {
                response.clone().json().then(function(json_array) {
                  var tx    = db.transaction(db_store,'readwrite');
                  var store = tx.objectStore(db_store);

                  console.log("Saving " + data.length + " items");

                  json_array.forEach(function(item) {
                    //console.log("id: "+item[db_key]+" hood "+item[i_hood]+" type "+item[i_type]);
                    store.put(item);
                  });
                });
              });
                   
              return response;
            }).catch(function(error) {
              console.log("Responding with an error " + error);
              return new Response("Error fetching data " + error,{status:500});
            })
          }
        })
      })
    }
  } else {
    //console.log("!1337 "+event.request.method + " " + url);

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
  }
});

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

