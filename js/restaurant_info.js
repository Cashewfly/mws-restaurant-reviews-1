let restaurant;
var newMap;

// Initialize map as soon as the page is loaded.

document.addEventListener('DOMContentLoaded', (event) => { 
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      buildRestaurantPage();
    }
  });
});

//DBHelper.flushDeferred(); //Testing to see if this works...

window.addEventListener('online', (event) => {
  DBHelper.flushDeferred();
});

// Get current restaurant from page URL. URL looks like localhost:8000/restaurant.html?id=1

fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }

  const id = getParameterByName('id');

  if (! id) { // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;

      if ((! restaurant) || error) {
        console.error(error);
        return;
      }

      DBHelper.fetchReviewsById(id, (error, reviews) => {
        if (error) {
          console.error(error);
          return;
        }

        restaurant.reviews  = reviews;
        callback(null, restaurant);
      });
    });
  }
};

buildRestaurantPage = (restaurant = self.restaurant) => {
  initMap();
  fillBreadcrumb();
  fillRestaurantHTML();
  fillRestaurantHoursHTML();

  fillReviewsHTML();
};

// Initialize leaflet map

initMap = (restaurant = self.restaurant) => {
  self.newMap = L.map('map', {
    center: [restaurant.latlng.lat, restaurant.latlng.lng],
    zoom: 16,
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

  DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
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

// Create restaurant HTML and add it to the webpage

fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name      = document.getElementById('restaurant-name');
  name.innerHTML  = restaurant.name;

  //name.onmouseout = reportWindowDims;

  const address     = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute("aria-label","Address is " + restaurant.address);

  // The layout will be either 1, 2, or 3 columns
  // The one column screen goes from 0-599px
  //   The image in this case will get as large as 584px
  // The two column screen goes from 600-1000px
  //   The image in this case will get as large as 576px
  // The three column screen goes from 1001px upward
  //
  // I'm going to make 400px and 600px versions to give some wiggle room on my column
  // percentages
  //
  // Note that convert_imgs.sh is used to create the images

  const image     = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';

  const image_400 = DBHelper.imageUrlForRestaurant(restaurant) + "_400.jpg";
  const image_600 = image_400.replace("_400.","_600.");

  image.alt       = "Photo of " + restaurant.name;
  image.src       = image_400;
  image.srcset    = image_400 + " 400w, " + image_600 + " 600w, " + image_400 + " 400w, " + image_600 + " 600w, " + image_400 + " 400w, " + image_600 + " 600w";
  image.sizes     = "(max-width: 450px) 400px, (max-width: 600px) 600px (max-width: 700px) 400px, (max-width: 1000px) 600px (max-width: 1400px) 400px, 600px";

  const cuisine     = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute("aria-label","Cuisine is " + restaurant.cuisine_type);
};

// Create restaurant operating hours HTML table and add it to the webpage.

fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  if (! operatingHours) {
    //TODO - might be nice to let the user know the lack of hours...
    return;
  }

  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row       = document.createElement('tr');
    const day       = document.createElement('td');
    const time      = document.createElement('td');

    day.innerHTML   = key;
    row.appendChild(day);

    time.innerHTML  = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

function favorite_char(is_favorite) {
  return(is_favorite ? '😎' : '😐');
}

function favorite_label(is_favorite) {
  return(is_favorite ? 'clear ' : 'set ');
}

// Create all reviews HTML and add them to the webpage.

fillReviewsHTML = (restaurant = self.restaurant, reviews = restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title     = document.createElement('h2');
  const fav       = document.createElement('button');

  title.innerHTML = 'Reviews';
  title.setAttribute("id","title-reviews");

  fav.setAttribute("id","favorite");
  fav.innerHTML   = favorite_char(restaurant.is_favorite);
  fav.setAttribute("aria-label",favorite_label(restaurant.is_favorite) + restaurant.name + " as favorite");

  fav.onclick = function() {
    restaurant.is_favorite  = (! restaurant.is_favorite);

    fav.innerHTML   = favorite_char(restaurant.is_favorite);
    fav.setAttribute("aria-label",favorite_label(restaurant.is_favorite) + restaurant.name + " as favorite");

    DBHelper.saveRestaurantFavorite(restaurant);
  };

  container.appendChild(title);
  container.appendChild(fav);

  if (! reviews) {
    const noReviews     = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';

    container.appendChild(noReviews);

    return;
  }
  const ul = document.getElementById('reviews-list');

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  ul.appendChild(createReviewForm(restaurant,ul));

  container.appendChild(ul);
};

// Create review HTML and add it to the webpage.

createReviewHTML = (review) => {
  const li            = document.createElement('li');
  const name          = document.createElement('p');
  name.innerHTML      = review.name;

  li.appendChild(name);

  const date          = document.createElement('p');
  date.innerHTML      = new Date(review.updatedAt).toDateString();

  li.appendChild(date);

  const rating        = document.createElement('p');
  rating.innerHTML    = `Rating: ${review.rating}`;

  li.appendChild(rating);

  const comments      = document.createElement('p');
  comments.innerHTML  = review.comments;

  li.appendChild(comments);

  return li;
};

createReviewForm  = (restaurant,ul)  => {
  const li              = document.createElement('li');
  const table           = document.createElement('table');
  const div             = document.createElement('div');
  const name            = document.createElement('input');
  const rating          = document.createElement('select'); 
  const comment         = document.createElement('textarea');
  const submit          = document.createElement('button');

  name.setAttribute("id","comment-name");
  name.setAttribute("type","text");
  name.setAttribute("aria-label","Your name for comment submission");

  rating.setAttribute("id","comment-rating");
  rating.setAttribute("aria-label","Rating for " + restaurant.name);

  for (i = 1 ; i <= 5 ; i++) {
    const option      = document.createElement('option');
    option.innerHTML  = i;

    rating.appendChild(option);
  }

  comment.setAttribute("id","comment-comments");
  comment.setAttribute("wrap","soft");
  comment.setAttribute("rows",8);
  comment.setAttribute("aria-label","Your comments on " + restaurant.name);

  submit.innerHTML  = "Submit review";
  /*
  name.value        = "Kent?";
  rating.value      = "3";
  comment.value     = "When the moon is in the seventh house, and Jupiter aligns with Mars.then({...});";
  */
  submit.onclick = function() {
    const r         = {};

    r.restaurant_id = Number(restaurant.id);
    r.name          = name.value;
    r.rating        = rating.value;
    r.comments      = comment.value;

    DBHelper.saveReview(r);

    r.updatedAt     = new Date(); // Don't need and might not have the result from the server

    ul.insertBefore(createReviewHTML(r),li);

    //name.value    = "Kent!";
    //rating.value  = "5";
    comment.value   = "";//"planets now peace guided!";
  };
  
  var   row,label,input;

  row   = document.createElement('tr');
  label = document.createElement('td');
  field = document.createElement('td');

  label.innerHTML = "Name";
  field.appendChild(name);

  row.appendChild(label);
  row.appendChild(field);
  table.appendChild(row);

  row   = document.createElement('tr');
  label = document.createElement('td');
  field = document.createElement('td');

  label.innerHTML = "Rating";
  field.appendChild(rating);

  row.appendChild(label);
  row.appendChild(field);
  table.appendChild(row);

  row   = document.createElement('tr');
  label = document.createElement('td');

  label.innerHTML = "Comments";

  row.appendChild(label);
  table.appendChild(row);

  div.appendChild(table);
  div.appendChild(document.createElement('hr'));
  div.appendChild(comment);
  div.appendChild(document.createElement('hr'));
  div.appendChild(submit);

  li.appendChild(div);

  return(li);
};

// Add restaurant name to the breadcrumb navigation menu

fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb  = document.getElementById('breadcrumb');
  const li          = document.createElement('li');

  li.innerHTML      = restaurant.name;

  breadcrumb.appendChild(li);
};

// Get a parameter by name from page URL.

getParameterByName = (name, url) => {
  if (! url) url = window.location.href;

  name = name.replace(/[[\]]/g, '\\$&');

  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);

  if (! results     ) return null;
  if (! results[2]  ) return '';

  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
