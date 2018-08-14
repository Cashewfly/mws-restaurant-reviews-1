let restaurants,
  neighborhoods,
  cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  if (L) {
    self.newMap = L.map('map', {
      center: [40.722216, -73.987501],
      zoom: 12,
      scrollWheelZoom: false
    });
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
      mapboxToken: 'pk.eyJ1IjoiY2F0Y2gyMjIiLCJhIjoiY2pqY2U4MHB4MHA1eDN3b2x4YXNhaXMxZiJ9.4ct3bFt1IdQqub76IAQIRQ',
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(newMap);
  }

  updateRestaurants();
};
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      //debugger;
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/*
function reportWindowDims() {
  // Lighthouse is knocking down my score for innerWidth not being equal to outerWidth,
  // It's happening on both the main page and this, and only when testing a desktop that is not
  // fullscreen.  I've not been able to find a good answer on the web for addressing this problem.
  //
  // This seems worth trying to figure out
  // https://bugzilla.mozilla.org/show_bug.cgi?id=189112#c7

  console.log("window.innerWidth="+window.innerWidth + " window.outerWidth="+window.outerWidth);
}
*/

createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';

  const image_400 = DBHelper.imageUrlForRestaurant(restaurant) + "_400.jpg";
  const image_600 = image_400.replace("_400.","_600.");

  image.alt       = "Photo of " + restaurant.name;
  image.src       = image_400;
  //image.srcset    = image_400 + " 400w, " + image_600 + " 600w";
  //image.sizes   = image_400 + " 400w, " + image_600 + " 600w";

  //console.log("createRestaurantHTML> srcset="+image.srcset);
  //console.log("createRestaurantHTML> sizes ="+image.sizes );
  //console.log("createRestaurantHTML> alt   ="+image.alt   );

  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  //name.onmouseout = reportWindowDims;

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('button');   
  more.innerHTML = 'View Details';
  more.setAttribute("aria-label","view details " + restaurant.name);

  more.onclick = function() {
    const url = DBHelper.urlForRestaurant(restaurant);
    window.location = url;
  };
  li.append(more);

  return li;
};

addMarkersToMap = (restaurants = self.restaurants) => {
  if (newMap) {
    restaurants.forEach(restaurant => {
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
      marker.on("click", onClick);
      function onClick() {
        window.location.href = marker.options.url;
      }
      self.markers.push(marker);
    });
  }
}; 
