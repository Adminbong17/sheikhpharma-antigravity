// Self-destroying service worker - removes itself and clears all caches.
// Does NOT navigate clients (iOS Safari has bugs with client.navigate that cause
// blank pages and reload loops).
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      try {
        await self.clients.claim();
      } catch (e) {}
    })()
  );
});

// Pass-through fetch — never intercept, never cache.
self.addEventListener("fetch", () => {});
