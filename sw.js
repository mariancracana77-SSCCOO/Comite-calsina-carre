// Permite instalar la web como app y abrirla sin conexión.
// Cambiar VERSION junto con ?v= en los HTML y VERSION_WEB en comun.js.
const VERSION = "15";
const CACHE = "comite-v" + VERSION;
const ARCHIVOS = [
  "./", "index.html", "admin.html", "guia.html",
  "styles.css?v=" + VERSION, "admin.css?v=" + VERSION, "fuentes.css?v=" + VERSION,
  "comun.js?v=" + VERSION, "render.js?v=" + VERSION, "app.js?v=" + VERSION, "visor.js?v=" + VERSION, "admin.js?v=" + VERSION, "lib/supabase.js",
  "manifest.json", "img/icon-192.png", "img/icon-512.png", "img/favicon-32.png", "img/badge-96.png", "img/hero-arte.webp", "img/portada.webp", "img/portada-movil.webp", "img/apple-touch-icon.png",
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

// ---------- Avisos al móvil ----------
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { titulo: "Comité de empresa", cuerpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Comité de empresa", {
    body: d.cuerpo || "", icon: "img/icon-192.png", badge: "img/badge-96.png", lang: "es",
    tag: d.etiqueta || undefined, renotify: !!d.etiqueta, data: { url: d.url || "./" },
  }));
});

// Al tocar el aviso: abre la web en lo que se ha publicado (o la trae delante si ya estaba abierta).
// Si el aviso lleva al panel (admin.html#…), usa una ventana del panel abierta o abre una nueva.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  const alPanel = url.includes("admin.html"); // avisos del panel (Claude contesta): a una ventana del panel, no a la web
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
    const misma = ventanas.find((v) => v.url.startsWith(self.registration.scope) && v.url.includes("admin.html") === alPanel);
    if (misma) return misma.focus().then((v) => v.navigate ? v.navigate(url) : v).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
