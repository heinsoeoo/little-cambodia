/* Build replaces the placeholders with a content-versioned shell. */
const CACHE = "little-cambodia-__VERSION__";
const SHELL = "__SHELL__";
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("little-cambodia-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range") ||
    url.pathname === "/healthz" ||
    url.pathname === "/multiplayer"
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cached = await caches.match("/index.html");
        // The active shell and its hashed scripts stay together until the next
        // worker activates. This also opens instantly on a weak connection.
        if (cached) return cached;
        try {
          return await fetch(request);
        } catch {
          return await caches.match("/offline.html");
        }
      })(),
    );
    return;
  }
  if (
    !/^\/(assets\/|icons\/|art\/|audio\/|favicon\.svg|manifest\.webmanifest)/.test(
      url.pathname,
    )
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE),
        cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })(),
  );
});
