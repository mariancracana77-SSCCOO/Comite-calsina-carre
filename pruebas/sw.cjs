// Prueba del service worker (v23). No puede ir en humo.cjs, porque allí el service worker está bloqueado.
// Trabaja sobre una COPIA de la carpeta (en /tmp), así que no cambia nada del repositorio.
// Comprueba: que se guardan todos los archivos de ARCHIVOS, que sin conexión se abren la web (también con ?utm=…) y el panel,
// que con la red muy lenta la web sale enseguida de la copia (CSS y JS incluidos) y que al subir la versión sale
// «Hay una versión nueva» y solo queda la caché nueva.
// Uso: NODE_PATH=$(npm root -g) node pruebas/sw.cjs   (puerto: PUERTO=8795 por defecto)
const { chromium } = require("playwright");
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http");
const RAIZ = path.join(__dirname, ".."), MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
const PUERTO = +(process.env.PUERTO || 8795), BASE = `http://localhost:${PUERTO}/`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Copia de la web (sin .git ni capturas)
  const COPIA = fs.mkdtempSync(path.join(os.tmpdir(), "comite-sw-"));
  fs.cpSync(RAIZ, COPIA, { recursive: true, filter: (s) => !/[\\/](\.git|capturas|node_modules)([\\/]|$)/.test(s.slice(RAIZ.length)) });
  // Servidor propio: con «lento», el CSS y el JS tardan 10 s (la red lenta de la nave). Se hace en el servidor porque
  // ni Playwright ni CDP frenan las peticiones que hace el propio service worker.
  let lento = false;
  const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain" };
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, BASE); let f = path.join(COPIA, decodeURIComponent(u.pathname));
    if (!f.startsWith(COPIA)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) { res.writeHead(404, { "Content-Type": "text/html" }); return res.end(fs.readFileSync(path.join(COPIA, "404.html"))); }
    if (lento && /\.(css|js)$/.test(f) && !/sw\.js$/.test(f)) await espera(10000);
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(fs.readFileSync(f));
  }).listen(PUERTO);
  const b = await chromium.launch();
  const fallos = [], errores = [];
  try {
    const ctx = await b.newContext({ serviceWorkers: "allow", viewport: { width: 390, height: 844 } });
    await ctx.route("**/lib/supabase.js*", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK }));
    await ctx.route("https://ytxpubqyhnohhugpukdm.supabase.co/**", (r) => r.fulfill({ path: path.join(RAIZ, "img/icon-192.png") }));
    await ctx.addInitScript(() => localStorage.setItem("comite-aviso-privacidad", "1"));
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errores.push(e.message));
    await p.goto(BASE); await p.evaluate(() => navigator.serviceWorker.ready); await espera(1500);
    await p.reload(); await espera(1200);
    if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) fallos.push("el service worker no controla la página");
    // 1) Todo lo de ARCHIVOS está guardado
    const swTxt = fs.readFileSync(path.join(COPIA, "sw.js"), "utf8"), V = swTxt.match(/const VERSION = "(\d+)"/)[1];
    const LISTA = Function("VERSION", "return " + swTxt.match(/const ARCHIVOS = (\[[\s\S]*?\]);/)[1])(V);
    const falta = await p.evaluate(async ([lista, v]) => {
      const c = await caches.open("comite-v" + v);
      const no = []; for (const u of lista) if (!(await c.match(u))) no.push(u);
      return no;
    }, [LISTA, V]);
    if (falta.length) fallos.push("faltan en la caché: " + falta.join(", "));
    // 2) Red muy lenta: la página y su CSS/JS salen de la copia (antes esperaban a la red sin límite)
    lento = true;
    const t0 = Date.now();
    await p.goto(BASE + "index.html?lenta=1#avisos", { waitUntil: "commit" });
    await p.waitForFunction(() => document.querySelector("#pestanas a.activa") && getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)", null, { timeout: 15000 }).catch(() => {});
    const tarda = Date.now() - t0;
    if (tarda > 3000) fallos.push(`con la red lenta la web tarda ${tarda} ms en salir (debería salir de la copia enseguida)`);
    lento = false;
    // 3) Sin conexión: la web (con ?utm=…) y el panel
    await ctx.setOffline(true);
    await p.goto(BASE + "?utm=1#avisos").catch(() => {}); await espera(1200);
    if (!/Avisos/.test(await p.title().catch(() => ""))) fallos.push("sin conexión no se abre ?utm=1#avisos");
    await p.goto(BASE + "admin.html").catch(() => {}); await espera(1000);
    if (!(await p.$("#s-entrar, #s-panel"))) fallos.push("sin conexión no se abre el panel");
    await ctx.setOffline(false);
    // 4) Versión nueva: banda «Hay una versión nueva» y solo la caché nueva
    await p.goto(BASE); await espera(1000);
    const f = path.join(COPIA, "sw.js");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/const VERSION = "\d+"/, 'const VERSION = "99"').replace(/"([a-z]+\.(css|js))\?v=" \+ VERSION/g, '"$1?v=23"'));
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await espera(4000);
    if (!(await p.$("#banda-version"))) fallos.push("no sale «Hay una versión nueva»");
    const cs = await p.evaluate(() => caches.keys());
    if (JSON.stringify(cs) !== '["comite-v99"]') fallos.push("cachés después de actualizar: " + JSON.stringify(cs));
    await ctx.close();
  } finally {
    await b.close(); srv.close(); srv.closeAllConnections?.(); fs.rmSync(COPIA, { recursive: true, force: true });
  }
  console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores.");
  console.log(fallos.length ? "FALLOS:\n" + fallos.join("\n") : "Sin fallos.");
  process.exit(errores.length || fallos.length ? 1 : 0);
})();
