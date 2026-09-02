const CACHE_NAME = "liftmetrics-shell-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/index.css",
  "/auth.js",
  "/pwa.js",
  "/offline.html",
  "/manifest.webmanifest",
  "/img/pwa-192.png",
  "/img/pwa-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

function isAppAsset(request, url) {
  return url.origin === self.location.origin
    && request.method === "GET"
    && !url.pathname.startsWith("/api/")
    && !url.pathname.startsWith("/messages")
    && !url.pathname.startsWith("/auth-")
    && !url.pathname.startsWith("/socket.io/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!isAppAsset(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html"))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  })));
});
