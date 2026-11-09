// Genera img/og.png a partir de herramientas/og.html. Uso (desde la raíz): NODE_PATH=$(npm root -g) node herramientas/og.cjs
const { chromium } = require("playwright"); const { spawn } = require("child_process"); const path = require("path");
(async () => {
  const raiz = path.join(__dirname, ".."), srv = spawn("python3", ["-m", "http.server", "8797"], { cwd: raiz, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("http://localhost:8797/herramientas/og.html"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(raiz, "img/og.png") });
  // Después, reducirla (WhatsApp no enseña vistas previas de más de unos 300 KB): con Python y Pillow,
  // Image.open("img/og.png").convert("RGB").quantize(256, dither=Image.Dither.FLOYDSTEINBERG).save("img/og.png", optimize=True)
  await b.close(); srv.kill();
})();
