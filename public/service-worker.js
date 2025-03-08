
const CACHE_NAME = "quran-notes-keeper-v1";
const APP_VERSION = "1.0.9"; // Incremented version number for new deployment

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

// Skip the cache for HTML, JS, CSS files and API calls to ensure fresh content
self.addEventListener("fetch", (event) => {
  // Only handle GET requests, ignore other HTTP methods like POST
  if (event.request.method !== 'GET') {
    console.log(`Ignoring non-GET method: ${event.request.method}`);
    return;
  }

  const url = new URL(event.request.url);
  const isHTMLPage = event.request.mode === "navigate";
  const isJSAsset = url.pathname.endsWith(".js");
  const isCSSAsset = url.pathname.endsWith(".css");

  // Don't cache any API calls, specifically the Quran API
  const isQuranAPI = url.hostname.includes("api.alquran.cloud");
  const isAPICall = url.pathname.includes("/api/") || isQuranAPI;

  // Skip cache for main resources and API calls to ensure fresh content
  if (isHTMLPage || isJSAsset || isCSSAsset || isAPICall) {
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
        // Don't cache API requests or firebase auth
        if (
          !event.request.url.includes("/api/") &&
          !event.request.url.includes("firebaseauth") &&
          !isQuranAPI
        ) {
          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME + "-" + APP_VERSION).then((cache) => {
            // Only cache successful responses
            if (response.ok) {
              try {
                cache.put(event.request, responseToCache);
              } catch (e) {
                console.error("Failed to cache response:", e);
              }
            }
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
