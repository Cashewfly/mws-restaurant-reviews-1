//https://github.com/jakearchibald/idb
//https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

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

      db.createIndex(i_hood       ,'neighborhood');                 
      db.createIndex(i_type       ,'cuisine_type');                
      db.createIndex(i_hood_type  ,['neighborhood','cuisine_type']);

    // end case - remember to fall through on cases for versioning
  }
});

class DBHelper {
  // Database URL - Change this to restaurants.json file location on your server.
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static fetchRestaurants(callback) {
    dbPromise.then(function(db) {
      var tx    = db.transaction(db_store,'readwrite');
      var store = tx.objectStore(db_store);

      //console.log("pre-Retrieving items\n");

      store.getAll().then(function(data) {
        if (data.length) {
          //console.log("Returning " + data.length + " items");
          callback(null,data);
        } else {
          //console.log("Fetching event.request");
  
          fetch(DBHelper.DATABASE_URL, {method: "GET"}).then(function(response) {
            dbPromise.then(function(db) {
              response.json().then(function(json_array) {
                var tx    = db.transaction(db_store,'readwrite');
                var store = tx.objectStore(db_store);

                //console.log("Saving " + data.length + " items");

                json_array.forEach(function(item) {
                  //console.log("id: "+item[db_key]+" hood "+item[i_hood]+" type "+item[i_type]);
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
    dbPromise.then(function(db) {
      var tx    = db.transaction(db_store,'readwrite');
      var store = tx.objectStore(db_store);
      var index;
      var key;

      if (id) {
        index   = store;
        key     = Number(id);
      } else if (cuisine === 'all' && neighborhood === 'all') {
        index   = store;
        key     = null;
      } else if (neighborhood === 'all') {
        index   = store.index(i_type);
        key     = cuisine;
      } else if (cuisine === 'all') {
        index   = store.index(i_hood);
        key     = neighborhood;
      } else {
        index   = store.index(i_hood_type);
        key     = [neighborhood,cuisine];
      }

      //console.log("fetchRestaurantByParms> id="+id+" cuisine="+cuisine+" neighborhood="+neighborhood+" index="+index+" key="+key+" typeof(key)="+typeof(key));

      index.getAll(key).then(function(data) {
        //console.log("fetchRestaurantByParms> data.length="+data.length);

        if (data.length > 0) {
          /*
          data.forEach(function(item) {
            console.log("id: "+item[db_key]+" hood "+item[i_hood]+" type "+item[i_type]);
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

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //debugger; restaurant.photograph = null; restaurant.id = null;
    return ('/img/' + (restaurant.photograph || restaurant.id || "image_missing"));
    //TODO could use a better "image_missing" image...
  }

  // Restaurant page URL.
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
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
