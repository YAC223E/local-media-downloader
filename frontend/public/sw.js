/* Local Media Downloader service worker: offline app shell, network-only API.
 *
 * Strategy: /api/* always hits the network (live progress must never be
 * stale). Same-origin GETs are network-first with cache fallback, so the UI
 * shell still opens when the laptop is briefly unreachable; the cached "/"
 * doubles as the navigation fallback. Bump CACHE when the shell changes
 * incompatibly.
 */
const CACHE = "lmd-shell-v2";
const CORE = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // live data: network only

  event.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return res;
    }).catch(async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      if (request.mode === "navigate") {
        const shell = await caches.match("/");
        if (shell) return shell;
      }
      throw new Error("offline");
    }),
  );
});
