const VERSION = "ruta-n6-v6";
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(BASE.map(u => c.add(u).catch(()=>{})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "ruta-n6-mapa").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Teselas del mapa: se guardan las que ya has visto (máx. ~1500)
  if (url.hostname.endsWith("basemaps.cartocdn.com")) {
    e.respondWith(caches.open("ruta-n6-mapa").then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        c.put(req, res.clone());
        c.keys().then(ks => { if (ks.length > 1500) ks.slice(0, ks.length - 1500).forEach(k => c.delete(k)); });
        return res;
      } catch (err) { return new Response("", {status: 504}); }
    }));
    return;
  }
  // Resto: primero la copia guardada, y se actualiza en segundo plano
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, {ignoreSearch: url.origin === location.origin});
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (req.mode === "navigate" ? c.match("./index.html") : new Response("", {status: 504}));
  }));
});
