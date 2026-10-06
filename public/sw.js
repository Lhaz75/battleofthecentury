// Battle of the Century : cache hors ligne des images, sons et polices (la page et l'API restent toujours à jour)
const VERSION = "0.77.0";
const CACHE = "boc2-" + VERSION;   // boc2 : on repart de zéro (anciennes images restées dans le cache du navigateur)
const PRECACHE = ["./", "assets/icon-192.png", "assets/bg-city.webp", "assets/bg-ruins.webp"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" }))).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("boc") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/music/") || req.headers.has("range")) return;
  // la page : réseau d'abord (nouvelle version tout de suite), cache si hors ligne
  if (req.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html")) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put("./", c)); } return r; })
      .catch(() => caches.match("./").then(r => r || caches.match(req))));
    return;
  }
  // images, sons, polices : cache immédiat + mise à jour en arrière-plan
  if (/^\/(assets|sfx|fonts)\//.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok && r.status === 200) c.put(req, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }));
  }
});
