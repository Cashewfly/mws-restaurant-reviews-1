//https://github.com/jakearchibald/idb
//https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

const dbName          =  'udacity-rr-idb';
const dbVersion       =  1;

const sRstName        =  'restaurants';
const iRstKey         =  'id';
const iRstHood        =  'neighborhood';
const iRstType        =  'cuisine_type';
const iRstHoodType    =  iRstHood+iRstType;

const sRevName        =  'reviews';
const iRevKey         =  'id';
const iRevRstId       =  'restaurant_id';

const port            =   1337; // Change this to your server port

var dbPromise = idb.open(dbName,dbVersion,upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var sRst = upgradeDb.createObjectStore(sRstName,{keyPath: iRstKey});

      sRst.createIndex(iRstHood       ,'neighborhood');                 
      sRst.createIndex(iRstType       ,'cuisine_type');                
      sRst.createIndex(iRstHoodType  ,['neighborhood','cuisine_type']);

      var sRev = upgradeDb.createObjectStore(sRevName,{keyPath: iRevKey});

      sRev.createIndex(iRevRstId      ,'restaurant_id');                 
    // end case - remember to fall through on cases for versioning
  }
});

class DBHelper {
  static get RESTAURANT_URL() {
    return `http://localhost:${port}/restaurants`;
  }
  static get REVIEWS_URL() {
    return `http://localhost:${port}/reviews`;
  }

  static fetchRestaurants(callback) {
    dbPromise.then(function(sRst) {
      var tx    = sRst.transaction(sRstName,'readwrite');
      var store = tx.objectStore(sRstName);

      //console.log("pre-Retrieving items\n");

      store.getAll().then(function(data) {
        if (data.length) {
          //console.log("Returning " + data.length + " items");
          callback(null,data);
        } else {
          //console.log("Fetching event.request");
  
          fetch(DBHelper.RESTAURANT_URL, {method: "GET"}).then(function(response) {
            dbPromise.then(function(sRst) {
              response.json().then(function(json_array) {
                var tx    = sRst.transaction(sRstName,'readwrite');
                var store = tx.objectStore(sRstName);

                //console.log("Saving " + data.length + " items");

                json_array.forEach(function(item) {
                  //console.log("id: "+item[iRstKey]+" hood "+item[iRstHood]+" type "+item[iRstType]);
                  store.put(item);
                });
                callback(null,json_array);
              });
            });
          }).catch(function(error) {
            callback("Error fetching data " + error,null);
          });
        }
      });
    });
  }

  // Fetch restaurants by a cuisine and a neighborhood with proper error handling.
  static fetchRestaurantByParms(id, cuisine, neighborhood, callback) {
    dbPromise.then(function(sRst) {
      var tx    = sRst.transaction(sRstName,'readonly');
      var store = tx.objectStore(sRstName);
      var index;
      var key;

      if (id) {
        index   = store;
        key     = Number(id);
      } else if (cuisine === 'all' && neighborhood === 'all') {
        index   = store;
        key     = null;
      } else if (neighborhood === 'all') {
        index   = store.index(iRstType);
        key     = cuisine;
      } else if (cuisine === 'all') {
        index   = store.index(iRstHood);
        key     = neighborhood;
      } else {
        index   = store.index(iRstHoodType);
        key     = [neighborhood,cuisine];
      }

      //console.log("fetchRestaurantByParms> id="+id+" cuisine="+cuisine+" neighborhood="+neighborhood+" index="+index+" key="+key+" typeof(key)="+typeof(key));

      index.getAll(key).then(function(data) {
        //console.log("fetchRestaurantByParms> data.length="+data.length);

        if (data.length > 0) {
          /*
          data.forEach(function(item) {
            console.log("id: "+item[iRstKey]+" hood "+item[iRstHood]+" type "+item[iRstType]);
          });
          */
          if (id && (data.length == 1)) {
            callback(null,data[0]);
          } else {
            callback(null,data);
          }
        } else {
          DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
              callback(error, null);
            } else {
              let results = restaurants;
              
              if (id) {
                results  = restaurants.find(r => r.id == id);
              } else {
                if (cuisine != 'all') { // filter by cuisine
                  results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                  results = results.filter(r => r.neighborhood == neighborhood);
                }
              }
              callback(null, results);
            }
          });
        }
      });
    });
  }

  static fetchRestaurantById(id, callback) {
    DBHelper.fetchRestaurantByParms(id,null,null,callback);
  }

  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    DBHelper.fetchRestaurantByParms(null,cuisine,neighborhood,callback);
  }

  //Fetch all neighborhoods with proper error handling. 
  //TODO  Pull these out of the database index with a fallback to existing code below
  static fetchNeighborhoods(callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  //Fetch all cuisines with proper error handling.
  //TODO  Pull these out of the database index with a fallback to existing code below
  static fetchCuisines(callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  static fetchReviewsById(id, callback) {
    dbPromise.then(function(sRev) {
      var tx    = sRev.transaction(sRevName,'readwrite');
      var store = tx.objectStore(sRevName);

      store.getAll(id).then(function(data) {
        //console.log("fetchReviewsById> data.length="+data.length);
        if (data.length > 0) {
          //debugger;
        } else {
          //console.log("fetchReviewsById> Fetching event.request");
  
          fetch(DBHelper.REVIEWS_URL + '?restaurant_id='+id, {method: "GET"}).then(function(response) {
            dbPromise.then(function(sRev) {
              response.json().then(function(jsonArray) {
                var tx    = sRev.transaction(sRevName,'readwrite');
                var store = tx.objectStore(sRevName);

                //console.log("fetchReviewsById> Saving " + jsonArray.length + " items");

                jsonArray.forEach(function(item) {
                  //console.log("fetchReviewsById> id: "+item[iRstKey]);
                  store.put(item);
                });
                callback(null,jsonArray);
              });
            });
          }).catch(function(error) {
            callback("Error fetching data " + error,null);
          });
        }
      });
    });
  }

  static saveRestaurantFavorite(restaurant) {
    //console.log("restaurant_id="+restaurant.id+" is_favorite="+restaurant.is_favorite);

    const url = DBHelper.RESTAURANT_URL + "/" + restaurant.id + "/?is_favorite=" + Boolean(restaurant.is_favorite);

    console.log("url="+url);

    fetch(url,{method: "PUT"}).then(function(response) {
      dbPromise.then(function(sRst) {
        response.json().then(function(item) {
          var tx    = sRst.transaction(sRstName,'readwrite');
          var store = tx.objectStore(sRstName);

          console.log("saveRestaurant> Fetched " + JSON.stringify(item));
          console.log("saveRestaurant> id: "+item[iRstKey]+" typeof(is_favorite)="+typeof(item.is_favorite));

          //Updating isFavorite via the URL saves the value
          //as a string, which is simply returned on the fetch.
          //Need to update it back to a boolean for the DB

          if (typeof(item.is_favorite) === 'string') {
            item.is_favorite = (item.is_favorite === 'true'); 
          }

          console.log("saveRestaurant> Fixed " + JSON.stringify(item));

          store.put(item);
        });
      });
    }).catch(function(error) {
      callback("Error fetching data " + error,null);
    });
  }

  static saveReview(r) {
    console.log("restaurant_id="+r.restaurant_id+" name="+r.name+" rating="+r.rating+" comments="+r.comments);

    const opts      = {  
      method:   "POST"            ,
      body:     JSON.stringify(r) ,
      headers:  {
        "Content-Type": "application/json; charset=utf-8"
      }
    };

    fetch(DBHelper.REVIEWS_URL,opts).then(function(response) {
      dbPromise.then(function(sRev) {
        response.json().then(function(item) {
          var tx    = sRev.transaction(sRevName,'readwrite');
          var store = tx.objectStore(sRevName);

          console.log("saveReview> Fetched " + JSON.stringify(item));
          console.log("saveReview> id: "+item[iRevKey]);

          store.put(item);
        });
      });
    }).catch(function(error) {
      //Assume we had some sort of network error.  
      //
      //If we save the record in the db as is right now, it will end up
      //with an undefined id, createdAt, and updatedAt.
      //
      //If I set id to a negative number, I can quickly find records
      //with negative ids to save the next time I'm online.
      //
      //I can easily find the next negative unique id to use since it will 
      //be one less than the first returned record on an indexed retrieval
      //of the reviews

      dbPromise.then(function(sRev) {
        var tx    = sRev.transaction(sRevName,'readwrite');
        var store = tx.objectStore(sRevName);

        store.getAll(null,1).then(function(records) {
          if (records.length > 0) {
            console.log("saveReview> retrieved " + JSON.stringify(event));

            r.id =  records[0].id - 1;

            if (r.id >= 0) r.id = -1;

          } else {
            console.log("saveReview> no reviews to retrieve");
            r.id  = -1;
          }
          console.log("saveReview> Saving for later update" + JSON.stringify(r));

          store.add(r);
        });
      });
    });
  }

  static flushDeferred() {
    console.log("flushDeferred running at "+new Date());

    dbPromise.then(function(sRev) {
      var tx    = sRev.transaction(sRevName,'readwrite');
      var store = tx.objectStore(sRevName);
      var range = IDBKeyRange.upperBound(0);

      store.iterateCursor(cursor => {
        if (! cursor              ) return;
        if (cursor.value.id >= 0  ) return;

        if (! navigator.onLine) {
          console.log("flushDeferred> stopping - navigator.onLine is "+navigator.onLine);
          return;
        }

        const r = cursor.value;

        console.log("flushDeferred> retrieved "+r.id);

        store.delete(r.id).then(function() {
          delete(r.id);

          DBHelper.saveReview(r);
          cursor.continue();
        });
      });
    });
  }

  // Restaurant image URL.
  static imageUrlForRestaurant(restaurant) {
    //debugger; restaurant.photograph = null; restaurant.id = null;
    return ('/img/' + (restaurant.photograph || restaurant.id || "image_missing"));
    //TODO could use a better "image_missing" image...
  }

  // Restaurant page URL.
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  // Map marker for a restaurant.
  static mapMarkerForRestaurant(restaurant, map) {
    if (! L) return(null);

    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker(
      [restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      }
    );

    marker.addTo(newMap);

    return marker;
  } 
}
