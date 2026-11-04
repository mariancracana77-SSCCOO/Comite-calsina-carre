// Prueba rápida: abre la web y el panel con datos de prueba en varios tamaños,
// claro/oscuro y letra muy grande. Busca errores de consola/CSP y scroll lateral, y hace capturas.
// Uso: NODE_PATH=$(npm root -g) node pruebas/humo.cjs [carpeta-capturas]
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const RAIZ = path.join(__dirname, ".."), MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
const OUT = process.argv[2] || path.join(RAIZ, "pruebas", "capturas");
const PUERTO = 8790, BASE = `http://localhost:${PUERTO}/`;
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const srv = spawn("python3", ["-m", "http.server", String(PUERTO)], { cwd: RAIZ, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const b = await chromium.launch({ args: ["--lang=es-ES"], env: { ...process.env, LANG: "es_ES.UTF-8", LANGUAGE: "es_ES" } });
  const errores = [], fallos = [];
  const CASOS = [
    { nombre: "320", w: 320, h: 700 }, { nombre: "390", w: 390, h: 844 },
    { nombre: "390-oscuro", w: 390, h: 844, oscuro: true }, { nombre: "390-letra", w: 390, h: 844, letra: "muy-grande" },
    { nombre: "pc", w: 1280, h: 860 },
  ];
  try {
    for (const c of CASOS) {
      const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, colorScheme: c.oscuro ? "dark" : "light", serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid" });
      await ctx.route("**/lib/supabase.js*", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK }));
      await ctx.route("https://ytxpubqyhnohhugpukdm.supabase.co/**", (r) => r.fulfill({ path: path.join(RAIZ, "img/icon-192.png") }));
      if (c.letra) await ctx.addInitScript((l) => localStorage.setItem("comite-letra", l), c.letra);
      const p = await ctx.newPage();
      p.on("console", (m) => { if (m.type() === "error") errores.push(`${c.nombre} web: ${m.text()}`); });
      p.on("pageerror", (e) => errores.push(`${c.nombre} web: ${e.message}`));
      // Aviso de privacidad: sale la primera vez y se cierra con «Entendido»
      await p.goto(BASE + "#actualidad"); await p.waitForTimeout(600);
      if (await p.evaluate(() => document.getElementById("aviso-privacidad").hidden)) fallos.push(`${c.nombre}: no sale el aviso de privacidad la primera vez`);
      if (c.nombre === "390") await p.screenshot({ path: path.join(OUT, "web-390-aviso-privacidad.png") });
      await p.click("#b-aviso-ok");
      if (!(await p.evaluate(() => document.getElementById("aviso-privacidad").hidden))) fallos.push(`${c.nombre}: el aviso de privacidad no se cierra`);
      for (const v of ["actualidad", "avisos", "reuniones", "actas", "documentos", "buzon", "nosotros", "buscar", "privacidad", "aviso-legal", "cookies"]) {
        await p.goto(BASE + "#" + v); await p.waitForTimeout(v === "actualidad" ? 900 : 350);
        if (v === "buscar") { await p.fill("#buscar-todo", "turnos"); await p.waitForTimeout(150); }
        const ancho = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ancho > 1) fallos.push(`${c.nombre} #${v}: scroll lateral de ${ancho}px`);
        if (["390", "pc", "390-oscuro"].includes(c.nombre) || (c.nombre === "390-letra" && v === "actualidad"))
          await p.screenshot({ path: path.join(OUT, `web-${c.nombre}-${v}.png`), fullPage: v === "actualidad" || c.nombre === "320" });
      }
      // Web sin contenido: los apartados vacíos tienen que explicar qué saldrá ahí
      for (const v of ["actualidad", "avisos", "actas", "nosotros"]) {
        await p.goto(BASE + "?prueba-vacio#" + v); await p.waitForTimeout(450);
        if (!(await p.$("#v-" + v + " .vacio-caja"))) fallos.push(`${c.nombre}: #${v} vacío no enseña su explicación`);
        if (c.nombre === "390") await p.screenshot({ path: path.join(OUT, `web-390-vacio-${v}.png`), fullPage: true });
      }
      // Votar en la consulta
      await p.goto(BASE + "#actualidad"); await p.waitForTimeout(700);
      await p.click("[data-voto]"); await p.waitForTimeout(300);
      if (!(await p.$(".cons-res.mio"))) fallos.push(`${c.nombre}: el voto no se ve`);
      await ctx.close();

      // Panel: pantalla de entrar y con sesión de prueba
      const ctx2 = await b.newContext({ viewport: { width: c.w, height: c.h }, colorScheme: c.oscuro ? "dark" : "light", serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid" });
      await ctx2.route("**/lib/supabase.js*", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK }));
      await ctx2.route("https://ytxpubqyhnohhugpukdm.supabase.co/**", (r) => r.fulfill({ path: path.join(RAIZ, "img/icon-192.png") }));
      const pe = await ctx2.newPage();
      pe.on("pageerror", (e) => errores.push(`${c.nombre} entrar: ${e.message}`));
      await pe.goto(BASE + "admin.html"); await pe.waitForTimeout(500);
      if (c.nombre === "390") await pe.screenshot({ path: path.join(OUT, `panel-entrar.png`) });
      await ctx2.addInitScript(() => localStorage.setItem("prueba-sesion", "1"));
      const pa = await ctx2.newPage();
      pa.on("dialog", (d) => d.accept());
      pa.on("console", (m) => { if (m.type() === "error") errores.push(`${c.nombre} panel: ${m.text()}`); });
      pa.on("pageerror", (e) => errores.push(`${c.nombre} panel: ${e.message}`));
      // Ajustes: poner la contraseña a otro administrador
      await pa.goto(BASE + "admin.html#accesos"); await pa.waitForTimeout(600);
      await pa.click('[data-poner-clave="otro@example.com"]');
      await pa.fill('[data-form-clave="otro@example.com"] [data-clave1]', "Camion2026x");
      await pa.fill('[data-form-clave="otro@example.com"] [data-clave2]', "Camion2026x");
      await pa.click('[data-form-clave="otro@example.com"] button[type=submit]'); await pa.waitForTimeout(300);
      if (!(await pa.evaluate(() => window.__CLAVE && window.__CLAVE.email === "otro@example.com"))) fallos.push(`${c.nombre}: no se puede poner la contraseña a otro administrador`);
      await pa.click("#b-codigos").catch(() => {});
      // Ajustes: empezar a activar la verificación en dos pasos (enseña el QR y pide el código)
      await pa.goto(BASE + "admin.html#accesos"); await pa.waitForTimeout(500);
      await pa.click("#b-dos-activar"); await pa.waitForTimeout(300);
      if (!(await pa.$("#dos-codigo"))) fallos.push(`${c.nombre}: no se puede empezar a activar la verificación en dos pasos`);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-dos-pasos.png"), fullPage: true });
      for (const v of ["inicio", "avisos", "actualidad", "reuniones", "actas", "buzon", "encuestas", "preguntas", "miembros", "documentos", "textos", "cartel", "papelera", "accesos"]) {
        await pa.goto(BASE + "admin.html#" + v); await pa.waitForTimeout(450);
        if (await pa.evaluate(() => document.getElementById("s-panel").hidden)) { fallos.push(`${c.nombre}: el panel no entra`); break; }
        const ancho = await pa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ancho > 1) fallos.push(`${c.nombre} panel #${v}: scroll lateral de ${ancho}px`);
        if (["390", "pc"].includes(c.nombre) && ["inicio", "avisos", "buzon", "encuestas"].includes(v))
          await pa.screenshot({ path: path.join(OUT, `panel-${c.nombre}-${v}.png`), fullPage: v === "inicio" });
      }
      // Editor de cada sección
      for (const k of ["avisos", "actualidad", "reuniones", "actas", "encuestas", "preguntas", "miembros", "documentos"]) {
        await pa.goto(BASE + "admin.html#" + k); await pa.waitForTimeout(400);
        await pa.click("[data-editar-en]"); await pa.waitForTimeout(350);
        if (await pa.evaluate(() => document.getElementById("editor").hidden)) { fallos.push(`${c.nombre}: no abre el editor de ${k}`); continue; }
        if (["390", "pc"].includes(c.nombre) && ["avisos", "reuniones", "encuestas"].includes(k))
          await pa.screenshot({ path: path.join(OUT, `panel-${c.nombre}-editor-${k}.png`) });
        await pa.keyboard.press("Escape"); await pa.waitForTimeout(150);
      }
      // Subir la foto de un miembro (se recorta y se reduce en el navegador)
      await pa.goto(BASE + "admin.html#miembros"); await pa.waitForTimeout(400);
      await pa.click("[data-editar-en]"); await pa.waitForTimeout(300);
      await pa.setInputFiles("#f-foto", path.join(RAIZ, "img/og.png")); await pa.waitForTimeout(700);
      const foto = await pa.evaluate(() => document.querySelector("#foto-previa img")?.getAttribute("src") || "");
      if (!/miembros\/\d+\.webp/.test(foto)) fallos.push(`${c.nombre}: la foto del miembro no se sube (${foto})`);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-foto.png") });
      await pa.click("#ed-guardar"); await pa.waitForTimeout(400);
      // Crear un aviso nuevo
      await pa.goto(BASE + "admin.html#avisos"); await pa.waitForTimeout(400);
      await pa.evaluate(() => document.getElementById("fab").click()); await pa.waitForTimeout(300);
      await pa.fill("#f-titulo", "Aviso de prueba"); await pa.fill("#f-contenido", "Texto");
      await pa.click("#ed-guardar"); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.avisos.some((a) => a.titulo === "Aviso de prueba")))) fallos.push(`${c.nombre}: no guarda un aviso nuevo`);
      const toast = await pa.textContent("#toast");
      if (!/avisado a 2/.test(toast || "")) fallos.push(`${c.nombre}: al publicar no avisa a los móviles (${toast})`);
      // Destacar un aviso un día (y quitarlo con el botón)
      await pa.goto(BASE + "admin.html#avisos"); await pa.waitForTimeout(400);
      await pa.click('[data-editar-en="avisos:2"]'); await pa.waitForTimeout(300);
      const hoy = await pa.evaluate(() => hoyISO());
      await pa.fill("#f-destacar_dia", hoy); await pa.waitForTimeout(150);
      if (await pa.isHidden('[data-vaciar="destacar_dia"]')) fallos.push(`${c.nombre}: no sale «Quitar el destacado»`);
      if (!/Destacado hoy/.test(await pa.textContent("#ed-previa"))) fallos.push(`${c.nombre}: la vista previa no marca «Destacado hoy»`);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-destacar.png") });
      await pa.click("#ed-guardar"); await pa.waitForTimeout(400);
      const d2 = await pa.evaluate(() => __DB.avisos.find((a) => a.id === 2));
      if (d2.destacar_dia !== hoy || d2.destacado_avisado !== false) fallos.push(`${c.nombre}: no guarda el día destacado (${JSON.stringify(d2)})`);
      await pa.click('[data-editar-en="avisos:2"]'); await pa.waitForTimeout(300);
      await pa.click('[data-vaciar="destacar_dia"]'); await pa.click("#ed-guardar"); await pa.waitForTimeout(400);
      if (await pa.evaluate(() => __DB.avisos.find((a) => a.id === 2).destacar_dia)) fallos.push(`${c.nombre}: «Quitar el destacado» no lo quita`);
      // Copia de seguridad: recordatorio en Inicio y descarga de «Solo los textos»
      await pa.goto(BASE + "admin.html#inicio"); await pa.waitForTimeout(500);
      if (!(await pa.$(".aviso-copia"))) fallos.push(`${c.nombre}: no recuerda hacer la copia de seguridad`);
      await pa.click(".aviso-copia"); await pa.waitForTimeout(500);
      const [desc] = await Promise.all([pa.waitForEvent("download", { timeout: 4000 }).catch(() => null), pa.click("#b-copia-datos")]);
      if (!desc || !/copia-comite-calsina-.*\.json/.test(desc.suggestedFilename())) fallos.push(`${c.nombre}: no descarga la copia de seguridad`);
      await pa.waitForTimeout(300);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-copia.png") });
      if (c.nombre === "pc") {
        const [dz] = await Promise.all([pa.waitForEvent("download", { timeout: 8000 }).catch(() => null), pa.click("#b-copia-todo")]);
        if (!dz || !/\.zip$/.test(dz.suggestedFilename())) fallos.push(`pc: no descarga la copia con archivos`);
      }
      if (c.nombre === "pc") {
        await pa.goto(BASE + "admin.html#inicio"); await pa.waitForTimeout(500);
        await pa.click("#det-est summary"); await pa.waitForTimeout(400);
        await pa.screenshot({ path: path.join(OUT, `panel-pc-estadisticas.png`), fullPage: true });
      }
      if (c.nombre === "390") {
        await pa.goto(BASE + "admin.html#inicio"); await pa.waitForTimeout(400);
        await pa.click("#fab"); await pa.waitForTimeout(300);
        await pa.screenshot({ path: path.join(OUT, `panel-390-hoja-nuevo.png`) });
      }
      await ctx2.close();
    }
    // Cartel
    const ctx3 = await b.newContext({ viewport: { width: 1000, height: 1300 } });
    const pc = await ctx3.newPage();
    pc.on("pageerror", (e) => errores.push(`cartel: ${e.message}`));
    pc.on("console", (m) => { if (m.type() === "error") errores.push(`cartel: ${m.text()}`); });
    await pc.goto(BASE + "guia.html"); await pc.waitForTimeout(600);
    await pc.screenshot({ path: path.join(OUT, "guia.png") });
    await pc.goto(BASE + "cartel.html"); await pc.waitForTimeout(800);
    await pc.screenshot({ path: path.join(OUT, "cartel.png"), fullPage: true });
    await ctx3.close();
  } finally {
    await b.close(); srv.kill();
  }
  const err = [...new Set(errores)];
  console.log(err.length ? "ERRORES:\n" + err.join("\n") : "Sin errores de consola.");
  console.log(fallos.length ? "FALLOS:\n" + fallos.join("\n") : "Sin fallos.");
  process.exit(err.length || fallos.length ? 1 : 0);
})();
