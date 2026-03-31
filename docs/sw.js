const CACHE_NAME = "einkaufsliste-v16";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Firebase und Google APIs nie cachen
    if (event.request.url.includes("firebaseio.com") ||
        event.request.url.includes("googleapis.com") ||
        event.request.url.includes("gstatic.com")) {
        return;
    }

    // Network-first: Immer zuerst online laden, nur bei Fehler Cache nutzen
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
