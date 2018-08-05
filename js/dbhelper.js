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

      db.createIndex(i_hood       ,'neighborhood');                   //  Not sure this is needed
      db.createIndex(i_type       ,'cuisine_type');                   //  Not sure this is needed
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

  // Fetch all restaurants.
  static fetchRestaurants(callback) {
    //console.log("fetchRestaurants: pre-fetch "+DBHelper.DATABASE_URL);
    fetch(DBHelper.DATABASE_URL, {method: "GET"}).then(response => {
      //console.log("fetchRestaurants: post-fetch "+DBHelper.DATABASE_URL);
      response.json().then(restaurants => {     // restaurants is an array
        //console.log("restaurants="+restaurants);
        //console.log("restaurants="+JSON.stringify(restaurants));
        callback(null, restaurants);
      });
    }).catch(error => {
      callback("fetchRestaurants: " + error,null);
    });
  }

  // Fetch a restaurant by its ID.
  static fetchRestaurantById(id, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          callback(null, restaurant);
        } else {
          callback('Restaurant does not exist', null);
        }
      }
    });
  }
  /*  Not used
  static fetchRestaurantByCuisine(cuisine, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }
  */
  /*  Not used
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }
  */
  // Fetch restaurants by a cuisine and a neighborhood with proper error handling.
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    dbPromise.then(function(db) {
      var tx    = db.transaction(db_store,'readwrite');
      var store = tx.objectStore(db_store);
      var index;
      var key;

      if (cuisine === 'all' && neighborhood === 'all') {
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

      console.log("fetchRestaurantByCuisineAndNeighborhood> index="+index+" key="+key);

      index.getAll(key).then(function(data) {
        if (data) {
          console.log("fetchRestaurantByCuisineAndNeighborhood> data="+data);

          data.forEach(function(item) {
            console.log("id: "+item[db_key]+" hood "+item[i_hood]+" type "+item[i_type]);
          });

          callback(null,data);
        } else {
          // TODO I'm 90% sure this will never happen, but I haven't rigously verified that.
          DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
              callback(error, null);
            } else {
              let results = restaurants;
              if (cuisine != 'all') { // filter by cuisine
                results = results.filter(r => r.cuisine_type == cuisine);
              }
              if (neighborhood != 'all') { // filter by neighborhood
                results = results.filter(r => r.neighborhood == neighborhood);
              }
              callback(null, results);
            }
          });
        }
      });
    });
  }
  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
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

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
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
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}
