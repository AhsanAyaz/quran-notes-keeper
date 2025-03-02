const CACHE_NAME = "quran-notes-keeper-v1";
const APP_VERSION = "1.0.1"; // Change this value whenever you make updates

// Install the service worker and cache assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  event.waitUntil(
    caches.open(CACHE_NAME + "-" + APP_VERSION).then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json",
        "/favicon.ico",
        "/icon-192x192.png",
        "/icon-512x512.png",
      ]);
    })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete all caches that match our base name but have a different version
              return (
                cacheName.startsWith(CACHE_NAME) &&
                cacheName !== CACHE_NAME + "-" + APP_VERSION
              );
            })
            .map((cacheName) => {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("Service Worker activated, claiming clients");
        return self.clients.claim(); // Take control of all clients immediately
      })
  );
});

// Skip the cache for HTML and JS files to ensure fresh content
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isHTMLPage = event.request.mode === "navigate";
  const isJSAsset = url.pathname.endsWith(".js");
  const isCSSAsset = url.pathname.endsWith(".css");

  // Skip cache for main resources to ensure fresh content
  if (isHTMLPage || isJSAsset || isCSSAsset) {
    console.log("Fetching new version of resource:", url.pathname);
    event.respondWith(
      fetch(event.request).catch((error) => {
        // If fetch fails (offline), try to get from cache
        console.log("Network request failed, trying cache for:", url.pathname);
        return caches.match(event.request);
      })
    );
    return;
  }

  // For other resources, check cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache API requests
        if (
          !event.request.url.includes("/api/") &&
          !event.request.url.includes("firebaseauth")
        ) {
          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME + "-" + APP_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Listen for updates from the main page
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    console.log("Skip waiting message received");
    self.skipWaiting();
  }
});
