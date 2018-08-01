navigator.serviceWorker.register("sw.js").then(function(reg) {
  console.log("Service worker registered " + reg);
}).catch(function(error) {
  console.log("Service worker registration failed " + error);
});
