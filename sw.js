// Permite instalar la web como app y abrirla sin conexión.
// Cambiar VERSION junto con ?v= en los HTML y VERSION_WEB en comun.js.
const VERSION = "1";
const CACHE = "comite-v" + VERSION;
const ARCHIVOS = [
  "./", "index.html", "admin.html",
  "styles.css?v=" + VERSION, "admin.css?v=" + VERSION, "fuentes.css?v=" + VERSION,
  "comun.js?v=" + VERSION, "render.js?v=" + VERSION, "app.js?v=" + VERSION, "admin.js?v=" + VERSION, "lib/supabase.js",
  "manifest.json", "img/icon-192.png", "img/icon-512.png", "img/favicon-32.png", "img/cabecera-900.webp", "img/apple-touch-icon.png",
  "fuentes/inter-latin-400-normal.woff2", "fuentes/inter-latin-600-normal.woff2", "fuentes/inter-latin-700-normal.woff2",
  "fuentes/montserrat-latin-700-normal.woff2", "fuentes/montserrat-latin-800-normal.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((k) => Promise.all(k.filter((n) => n.startsWith("comite-") && n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Solo los archivos de la propia web (los datos de Supabase siempre van a la red).
// Primero la red; si no hay conexión, la copia guardada.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || (e.request.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
