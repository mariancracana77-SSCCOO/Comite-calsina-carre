// Prueba rápida: abre la web y el panel con datos de prueba en varios tamaños,
// claro/oscuro y letra muy grande. Busca errores de consola/CSP y scroll lateral, y hace capturas.
// Uso: NODE_PATH=$(npm root -g) node pruebas/humo.cjs [carpeta-capturas]  (puerto: PUERTO=8793, por defecto 8790)
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const RAIZ = path.join(__dirname, ".."), MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
const OUT = process.argv[2] || path.join(RAIZ, "pruebas", "capturas");
const PUERTO = +(process.env.PUERTO || 8790), BASE = `http://localhost:${PUERTO}/`;
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
      for (const v of ["actualidad", "avisos", "reuniones", "actas", "documentos", "buzon", "nosotros", "seccion-1", "seccion-2", "buscar", "privacidad", "aviso-legal", "cookies"]) {
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
      // Secciones propias: pestaña, acceso en la portada, subsección, enlace directo a una publicación y sección oculta
      await p.goto(BASE + "#actualidad"); await p.waitForTimeout(600);
      if (!(await p.$('#pestanas a[href="#seccion-1"]'))) fallos.push(`${c.nombre}: la sección principal no sale como pestaña`);
      if (await p.$('#pestanas a[href="#seccion-2"]')) fallos.push(`${c.nombre}: la subsección no debería salir como pestaña`);
      if (await p.$('#pestanas a[href="#seccion-3"]')) fallos.push(`${c.nombre}: la sección oculta sale en la web`);
      if (!(await p.$('#accesos-secciones a[href="#seccion-1"]'))) fallos.push(`${c.nombre}: la sección no sale en los accesos de la portada`);
      await p.goto(BASE + "#seccion-1"); await p.waitForTimeout(400);
      if (!(await p.$('#seccion-hijas a[href="#seccion-2"]'))) fallos.push(`${c.nombre}: la subsección no sale dentro de su sección`);
      if (!(await p.$("#seccion-pubs #publicacion-1"))) fallos.push(`${c.nombre}: no sale lo publicado en la sección`);
      await p.goto(BASE + "#publicacion-2"); await p.waitForTimeout(400);
      if (!(await p.$("#publicacion-2")) || !/Salud laboral/.test(await p.textContent("#seccion-miga"))) fallos.push(`${c.nombre}: el enlace a una publicación de una subsección no funciona`);
      if (!(await p.evaluate(() => document.querySelector('#pestanas a[href="#seccion-1"]').classList.contains("activa")))) fallos.push(`${c.nombre}: en la subsección no se marca la pestaña de su sección`);
      if (c.nombre === "390") await p.screenshot({ path: path.join(OUT, "web-390-subseccion.png"), fullPage: true });
      // Votar en la consulta
      await p.goto(BASE + "#actualidad"); await p.waitForTimeout(700);
      await p.click("[data-voto]"); await p.waitForTimeout(300);
      if (!(await p.$(".cons-res.mio"))) fallos.push(`${c.nombre}: el voto no se ve`);
      await ctx.close();

      // ---- v23: pruebas de los fallos de la revisión (solo en 390, y algunas también en 320 y en el PC) ----
      const nuevoCtx = async (init, o = {}) => {
        const x = await b.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, colorScheme: o.oscuro ? "dark" : "light", serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid" });
        await x.route("**/lib/supabase.js*", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK }));
        await x.route("https://ytxpubqyhnohhugpukdm.supabase.co/**", (r) => r.fulfill({ path: path.join(RAIZ, "img/icon-192.png") }));
        await x.addInitScript(`localStorage.setItem("comite-aviso-privacidad","1");${o.letra ? `localStorage.setItem("comite-letra","${o.letra}");` : ""}${init || ""}`);
        const pg = await x.newPage();
        pg.on("pageerror", (e) => errores.push(`${c.nombre} extra: ${e.message}`));
        pg.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(`${c.nombre} extra: ${m.text()}`); });
        return [x, pg];
      };
      if (c.nombre === "320" || c.nombre === "390-letra") {
        // Cabecera: el nombre no se mete debajo de los botones; accesos de la portada dentro de la pantalla
        for (const letra of [null, "muy-grande"]) for (const w of [320, 360]) {
          const [cx, px] = await nuevoCtx("", { w, h: 760, letra });
          await px.goto(BASE + "#actualidad"); await px.waitForTimeout(500);
          const r = await px.evaluate(() => ({ marca: document.querySelector(".marca-txt").getBoundingClientRect().right, botones: document.querySelector(".cab-botones").getBoundingClientRect().left,
            fuera: [...document.querySelectorAll(".accesos a")].filter((a) => a.getBoundingClientRect().right > innerWidth + 0.5 || a.scrollWidth > a.clientWidth + 1).map((a) => a.textContent.trim()) }));
          if (r.marca > r.botones + 0.5) fallos.push(`${w} ${letra || "normal"}: el nombre de la cabecera se mete debajo de los botones`);
          if (r.fuera.length) fallos.push(`${w} ${letra || "normal"}: accesos de la portada cortados (${r.fuera.join(", ")})`);
          await cx.close();
        }
      }
      if (c.nombre === "pc") {
        // Pestañas: en el PC se ven todas (antes «Nosotros» quedaba escondida sin poder moverla con el ratón)
        for (const letra of [null, "muy-grande"]) for (const w of [1024, 1280]) {
          const [cx, px] = await nuevoCtx("", { w, h: 800, letra });
          await px.goto(BASE + "#actualidad"); await px.waitForTimeout(500);
          const ocultas = await px.evaluate(() => { const f = document.getElementById("pestanas").getBoundingClientRect();
            return [...document.querySelectorAll("#pestanas a")].filter((a) => { const r = a.getBoundingClientRect(); return r.right > f.right + 1 || r.left < f.left - 1; }).map((a) => a.textContent.trim()); });
          if (ocultas.length) fallos.push(`${w} ${letra || "normal"}: pestañas que no se ven: ${ocultas.join(", ")}`);
          await cx.close();
        }
      }
      if (c.nombre === "390") {
        // a) Escapes: <script>, onerror y javascript: en todos los campos, en la web y en el panel
        const X = `<img src=x onerror="window.__XSS=1"><script>window.__XSS=2<\/script>"'><svg onload="window.__XSS=3">`;
        const [cx, px] = await nuevoCtx(`window.__PRE=[(DB)=>{const X=${JSON.stringify(X)};for(const t in DB)for(const r of DB[t])if(r&&typeof r==="object")for(const k in r){
          if(typeof r[k]==="string"&&!/^(fecha|creado|actualizado|publicar_en|cierra|dia|hora|hora_fin|destacar_dia|slug|estado|quien|tipo|cuando)$/.test(k))r[k]+=X;
          if(k==="adjuntos"&&Array.isArray(r[k]))r[k].forEach((a)=>{a.nombre=X;a.url="javascript:window.__XSS=9";});
          if(k==="enlace")r[k]="javascript:window.__XSS=8"; if(k==="icono")r[k]='"><img src=x onerror="window.__XSS=7">';}}];`);
        for (const v of ["actualidad", "avisos", "reuniones", "actas", "documentos", "buzon", "nosotros", "seccion-1", "seccion-2", "publicacion-1", "cookies"]) { await px.goto(BASE + "#" + v); await px.waitForTimeout(300); }
        await px.goto(BASE + "#buscar"); await px.fill("#buscar-todo", "img"); await px.waitForTimeout(200);
        if (await px.evaluate(() => window.__XSS)) fallos.push("390: se ejecuta código metido en un texto (web)");
        if (await px.evaluate(() => [...document.querySelectorAll("a[href],img[src]")].some((e) => /^\s*javascript:/i.test(e.getAttribute("href") || e.getAttribute("src"))))) fallos.push("390: hay un enlace javascript: en la web");
        await cx.addInitScript(() => localStorage.setItem("prueba-sesion", "1")); const pp = await cx.newPage(); pp.on("dialog", (d) => d.accept());
        for (const v of ["inicio", "avisos", "actualidad", "reuniones", "actas", "buzon", "encuestas", "preguntas", "miembros", "documentos", "apartados", "publicaciones", "textos", "papelera", "peticiones"]) {
          await pp.goto(BASE + "admin.html#" + v); await pp.waitForTimeout(300);
          if (await pp.$("[data-editar-en]")) { await pp.click("[data-editar-en]").catch(() => {}); await pp.waitForTimeout(200); await pp.keyboard.press("Escape"); } }
        if (await pp.evaluate(() => window.__XSS)) fallos.push("390: se ejecuta código metido en un texto (panel)");
        await cx.close();
        // b) Enlaces #…-N que no existen (se dice) y publicación borrada (no abre la sección N)
        const [cr, pr] = await nuevoCtx(`window.__PRE=[(DB)=>{DB.publicaciones=DB.publicaciones.filter((x)=>x.id!==2);}];`);
        for (const h of ["aviso-999", "noticia-999", "reunion-999", "acta-999", "consulta-999", "documento-999", "pregunta-999", "seccion-999", "publicacion-999", "inventada", "contenido"]) {
          await pr.goto(BASE + "#" + h); await pr.waitForTimeout(300);
          if ((await pr.evaluate(() => [...document.querySelectorAll(".vista")].filter((v) => !v.hidden).length)) !== 1) fallos.push(`390: #${h} no enseña una sola vista`);
          if (/^(aviso|noticia|reunion|acta|documento)-/.test(h) && !(await pr.$(".vista:not([hidden]) .aviso-falta"))) fallos.push(`390: #${h} no dice que ya no está`);
        }
        await pr.goto(BASE + "#publicacion-2"); await pr.waitForTimeout(300);
        if (/Revisiones/.test(await pr.textContent("#seccion-titulo"))) fallos.push("390: #publicacion-N borrada abre la sección N");
        await pr.goto(BASE + "#pregunta-1"); await pr.waitForTimeout(300);
        if (!(await pr.evaluate(() => document.getElementById("pregunta-1")?.open))) fallos.push("390: #pregunta-N no abre la pregunta");
        await cr.close();
        // c) Sin conexión: con copia (banda + datos) y sin copia (explicación y «Reintentar», sin esqueleto ni «Todavía no hay…»)
        const [co, po] = await nuevoCtx("");
        await po.goto(BASE + "#avisos"); await po.waitForTimeout(600);
        await po.addInitScript(() => { window.__FALLA = true; }); await po.goto(BASE + "?r=1#avisos"); await po.waitForTimeout(600);
        if (await po.evaluate(() => document.getElementById("sin-red").hidden || !document.querySelector("#lista-avisos .aviso"))) fallos.push("390: sin red no enseña la copia guardada");
        await co.close();
        const [cs, ps] = await nuevoCtx("window.__FALLA = true;");
        await ps.goto(BASE); await ps.waitForTimeout(600);
        if (await ps.evaluate(() => document.getElementById("sin-red").hidden || document.querySelector("#lista-actualidad .esq") || /Todavía no hay/.test(document.getElementById("lista-actualidad").textContent) || !document.querySelector("#lista-actualidad [data-reintentar]"))) fallos.push("390: sin red y sin copia no lo explica");
        await ps.screenshot({ path: path.join(OUT, "web-390-sin-red-sin-copia.png") });
        await cs.close();
        // d) Red lenta: con copia guardada, a los 3 s ya se ve (antes, nada hasta que llegaba la red)
        const [cl, pl] = await nuevoCtx("");
        await pl.goto(BASE + "#avisos"); await pl.waitForTimeout(600);
        await pl.addInitScript(() => { window.__TARDA = 20000; }); await pl.goto(BASE + "?r=2#avisos"); await pl.waitForTimeout(3000);
        if (!(await pl.$("#v-avisos:not([hidden]) #lista-avisos .aviso"))) fallos.push("390: con red lenta no enseña la copia guardada");
        await cl.close();
        // e) «Leer más» con enlace directo y datos lentos
        const largo = Array(40).fill("Línea de texto largo para plegar.").join("\n");
        const [cm, pm] = await nuevoCtx(`window.__TARDA = 1500; window.__PRE=[(DB)=>{DB.avisos[1].contenido=${JSON.stringify(largo)};}];`);
        await pm.goto(BASE + "#aviso-2"); await pm.waitForTimeout(2600);
        if (!(await pm.evaluate(() => document.querySelector("#aviso-2 .texto.plegable")?.classList.contains("abierto")))) fallos.push("390: el enlace directo a un aviso largo sale plegado");
        await cm.close();
        // f) Visor: PDF que falla → «Abrirlo aparte» con Tab; Esc cierra y devuelve el foco
        const [cv, pv] = await nuevoCtx("");
        await pv.goto(BASE + "#documentos"); await pv.waitForTimeout(500);
        await pv.focus('#bloque-documentos a[data-visor="pdf"]'); await pv.keyboard.press("Enter"); await pv.waitForTimeout(2500);
        let alc = false; for (let i = 0; i < 4; i++) { await pv.keyboard.press("Tab"); if (await pv.evaluate(() => document.activeElement?.matches(".visor-msg a"))) alc = true; }
        if ((await pv.$(".visor-msg a")) && !alc) fallos.push("390: en el visor, «Abrirlo aparte» no se alcanza con el teclado");
        await pv.keyboard.press("Escape"); await pv.waitForTimeout(300);
        if ((await pv.$(".visor")) || !(await pv.evaluate(() => document.activeElement?.matches('a[data-visor="pdf"]')))) fallos.push("390: Esc no cierra el visor o no devuelve el foco");
        await cv.close();
        // g) Calendario: hoy con aria-current; en «Año entero» los días no son botones (15×14 px) y tocar el mes lo abre
        const [cc, pc2] = await nuevoCtx("");
        await pc2.goto(BASE + "#reuniones"); await pc2.waitForTimeout(500);
        if ((await pc2.evaluate(() => document.querySelector("#mes-rejilla .hoy")?.getAttribute("aria-current"))) !== "date") fallos.push("390: el día de hoy del calendario no lleva aria-current");
        await pc2.click("#ver-ano"); await pc2.waitForTimeout(200);
        if (await pc2.$("#ano-rejilla .mes-rejilla a, #ano-rejilla .mes-rejilla button")) fallos.push("390: en «Año entero» los días siguen siendo botones diminutos");
        await pc2.click("#ano-rejilla .ano-mes:nth-child(3) .mes-rejilla"); await pc2.waitForTimeout(200);
        if (!(await pc2.evaluate(() => !document.getElementById("mes-cuerpo").hidden && /^Marzo/.test(document.getElementById("mes-nombre").textContent)))) fallos.push("390: en «Año entero» tocar un mes no lo abre");
        await cc.close();
        // h) Teclado: el primer Tab va a «Ir al contenido»; tras votar, el foco va a la consulta y se anuncia
        const [ct, pt] = await nuevoCtx("");
        await pt.goto(BASE + "#avisos"); await pt.waitForTimeout(500);
        await pt.keyboard.press("Tab");
        if (!(await pt.evaluate(() => document.activeElement?.classList.contains("saltar")))) fallos.push("390: el primer Tab no va a «Ir al contenido»");
        await pt.goto(BASE + "#actualidad"); await pt.waitForTimeout(500);
        await pt.focus("[data-voto]"); await pt.keyboard.press("Enter"); await pt.waitForTimeout(400);
        if (!(await pt.evaluate(() => document.activeElement?.id === "consulta-1" && /Voto registrado/.test(document.getElementById("consultas-estado").textContent)))) fallos.push("390: después de votar se pierde el foco o no se anuncia");
        // i) Nombres para el lector de pantalla: logo, contador de avisos y botón del tema
        const nom = await pt.evaluate(() => ({ logo: document.querySelector(".marca").getAttribute("aria-label"), tema: document.getElementById("b-tema").getAttribute("aria-label") }));
        if (!/Calsina Carré/.test(nom.logo)) fallos.push("390: el nombre del logo no coincide con lo que se ve");
        if (!/^Poner modo (oscuro|claro)$/.test(nom.tema)) fallos.push("390: el botón del tema no dice qué hace");
        // j) .ics: con fin (1 h si no hay hora de fin), zona horaria y líneas de 75 bytes como mucho
        const ics = await pt.evaluate(async () => { let t = null; const o = URL.createObjectURL; URL.createObjectURL = (bl) => { bl.text().then((x) => { t = x; }); return o(bl); };
          descargaICS({ id: 9, fecha: "2026-11-12", hora: "10:00", titulo: "Reunión ".repeat(20), lugar: "Sala" }); URL.createObjectURL = o; await new Promise((r) => setTimeout(r, 100)); return t; });
        if (!/DTEND;TZID=Europe\/Madrid:20261112T110000/.test(ics || "") || !/BEGIN:VTIMEZONE/.test(ics || "") || (ics || "").split("\r\n").some((l) => new TextEncoder().encode(l).length > 75)) fallos.push("390: el archivo .ics no sigue la norma (fin, zona horaria o líneas largas)");
        await ct.close();
        // k) Contraste: contador de avisos y botones de degradado (blanco sobre la parte más clara)
        const [ck, pk] = await nuevoCtx(`localStorage.setItem("comite-avisos-vistos","2000-01-01");`);
        await pk.goto(BASE + "#actualidad"); await pk.waitForTimeout(500);
        const col = await pk.evaluate(() => ({ cuenta: getComputedStyle(document.querySelector('[data-cuenta="avisos"]')).backgroundColor, hero: getComputedStyle(document.querySelector(".hero-btn")).backgroundImage }));
        if (col.cuenta !== "rgb(198, 40, 40)") fallos.push(`390: el contador rojo de avisos tiene poco contraste (${col.cuenta})`);
        if (/rgb\(0, 198, 255\)/.test(col.hero)) fallos.push("390: «Ver los avisos» sigue con el degradado cian (blanco a 2:1)");
        await ck.close();
        // l) Pantalla muy baja (zoom al 400 %): la cabecera y la barra de abajo no van fijas
        const [cz, pz] = await nuevoCtx("", { w: 320, h: 256 });
        await pz.goto(BASE + "#avisos"); await pz.waitForTimeout(500);
        if (await pz.evaluate(() => getComputedStyle(document.querySelector(".cabecera")).position !== "static" || getComputedStyle(document.querySelector(".barra-fija")).position !== "static")) fallos.push("320×256: la cabecera o la barra de abajo siguen fijas y tapan la pantalla");
        await cz.close();
      }

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
      for (const v of ["inicio", "avisos", "actualidad", "reuniones", "actas", "buzon", "encuestas", "preguntas", "miembros", "documentos", "apartados", "publicaciones", "textos", "cartel", "papelera", "accesos", "peticiones"]) {
        await pa.goto(BASE + "admin.html#" + v); await pa.waitForTimeout(450);
        if (await pa.evaluate(() => document.getElementById("s-panel").hidden)) { fallos.push(`${c.nombre}: el panel no entra`); break; }
        const ancho = await pa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ancho > 1) fallos.push(`${c.nombre} panel #${v}: scroll lateral de ${ancho}px`);
        if (["390", "pc"].includes(c.nombre) && ["inicio", "avisos", "buzon", "encuestas"].includes(v))
          await pa.screenshot({ path: path.join(OUT, `panel-${c.nombre}-${v}.png`), fullPage: v === "inicio" });
      }
      // Editor de cada sección
      for (const k of ["avisos", "actualidad", "reuniones", "actas", "encuestas", "preguntas", "miembros", "documentos", "apartados", "publicaciones"]) {
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
      // Asistente de actas: foto de las notas → rellena el acta
      await pa.goto(BASE + "admin.html#actas"); await pa.waitForTimeout(400);
      await pa.evaluate(() => document.getElementById("fab").click()); await pa.waitForTimeout(300);
      if (!(await pa.$(".asistente"))) fallos.push(`${c.nombre}: no sale el asistente de actas`);
      else {
        await pa.setInputFiles("#f-ia", path.join(RAIZ, "img/og.png")); await pa.waitForTimeout(400);
        // Tapar con el dedo: se pinta una raya y «Listo»
        if (!(await pa.$(".tapador canvas"))) fallos.push(`${c.nombre}: no se abre «tapar» al añadir una foto`);
        else {
          const bx = await (await pa.$(".tapador canvas")).boundingBox();
          await pa.mouse.move(bx.x + bx.width * .2, bx.y + bx.height * .3); await pa.mouse.down(); await pa.mouse.move(bx.x + bx.width * .7, bx.y + bx.height * .35, { steps: 6 }); await pa.mouse.up();
          if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-tapar.png") });
          await pa.click('.tapador [data-tap="listo"]'); await pa.waitForTimeout(300);
        }
        await pa.evaluate(() => document.querySelectorAll(".nota-ia").forEach((d) => { d.open = true; }));
        await pa.fill("#notas-ia", "Reunión con Juan Pérez García. Llamar al 612 345 678 o escribir a juan@ejemplo.com. DNI 12345678Z. La compañera Marta dijo que sí.");
        await pa.fill("#tapar-ia", "Juan Pérez García");
        await pa.click("#b-ia"); await pa.waitForTimeout(500);
        if (!(await pa.$(".ia-rev"))) fallos.push(`${c.nombre}: no enseña lo que se va a enviar`);
        if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-revision.png") });
        await pa.click("[data-ia-enviar]"); await pa.waitForTimeout(700);
        const env = await pa.evaluate(() => window.__IA?.notas || "");
        if (/P[ée]rez|612|juan@|12345678|Marta/.test(env) || !/\[PERSONA 1\]/.test(env)) fallos.push(`${c.nombre}: se envían datos sin tapar: ${env.slice(0, 200)}`);
        if (!(await pa.inputValue("#f-resumen")).includes("Juan Pérez García pidió")) fallos.push(`${c.nombre}: el nombre no vuelve a su sitio en el acta`);
        if ((await pa.inputValue("#f-titulo")) !== "Reunión del comité de noviembre" || !(await pa.inputValue("#f-acuerdos")).includes("jornada intensiva")) fallos.push(`${c.nombre}: el asistente no rellena el acta`);
        if (!(await pa.evaluate(() => window.__IA && window.__IA.archivos.length === 1 && window.__IA.archivos[0].mime === "image/jpeg"))) fallos.push(`${c.nombre}: el asistente no envía la foto`);
        if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-asistente.png"), fullPage: false });
        await pa.keyboard.press("Escape"); await pa.waitForTimeout(150);
      }
      // Secciones: crear una subsección y publicar dentro
      await pa.goto(BASE + "admin.html#apartados"); await pa.waitForTimeout(500);
      if (!(await pa.$(".fila-hija"))) fallos.push(`${c.nombre}: en «Secciones» la subsección no sale metida dentro`);
      await pa.evaluate(() => document.getElementById("fab").click()); await pa.waitForTimeout(300);
      await pa.fill("#f-titulo", "Vacaciones"); await pa.selectOption("#f-padre_id", "1"); await pa.selectOption("#f-icono", "calendario");
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-seccion-nueva.png") });
      await pa.click("#ed-guardar"); await pa.waitForTimeout(500);
      const nueva = await pa.evaluate(() => __DB.apartados.find((a) => a.titulo === "Vacaciones"));
      if (!nueva || nueva.padre_id !== 1 || nueva.icono !== "calendario") fallos.push(`${c.nombre}: no guarda la sección nueva (${JSON.stringify(nueva)})`);
      await pa.goto(BASE + "admin.html#publicaciones"); await pa.waitForTimeout(500);
      await pa.evaluate(() => document.getElementById("fab").click()); await pa.waitForTimeout(300);
      await pa.selectOption("#f-apartado_id", String(nueva?.id || 1)); await pa.fill("#f-titulo", "Turnos de vacaciones de verano"); await pa.fill("#f-contenido", "Texto");
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-publicacion-nueva.png") });
      await pa.click("#ed-guardar"); await pa.waitForTimeout(500);
      const pub = await pa.evaluate(() => __DB.publicaciones.find((p) => p.titulo === "Turnos de vacaciones de verano"));
      if (!pub || pub.apartado_id !== (nueva?.id || 1)) fallos.push(`${c.nombre}: no guarda la publicación en su sección (${JSON.stringify(pub)})`);
      if (!/avisado a 2/.test((await pa.textContent("#toast")) || "")) fallos.push(`${c.nombre}: al publicar en una sección no avisa a los móviles`);
      if (c.nombre === "390") { await pa.goto(BASE + "admin.html#apartados"); await pa.waitForTimeout(500); await pa.screenshot({ path: path.join(OUT, "panel-390-secciones.png"), fullPage: true }); }
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
      // Pedir un cambio a Claude: enviar con una foto, añadir, decidir, avisar a Lorena y volver a como estaba
      await pa.goto(BASE + "admin.html#peticiones"); await pa.waitForTimeout(600);
      if (!(await pa.$('[data-grupo-caja="toca"] .pet-grupo-tit'))) fallos.push(`${c.nombre}: en las peticiones no sale «Te toca a ti»`);
      if (!(await pa.$('[data-bloque="tuyo"]')) || (await pa.evaluate(() => { const t = document.querySelector('[data-bloque="tuyo"]'), o = document.querySelector('[data-bloque="ok"]'); return !o || !(t.compareDocumentPosition(o) & 4); }))) fallos.push(`${c.nombre}: no salen «Lo tuyo» arriba y «Confirmado por Lorena» debajo`);
      if (!(await pa.$('[data-bloque="ok"] details[data-pet="7"] .pet-etq.e-confirmado')) || (await pa.$('[data-decide="7"]'))) fallos.push(`${c.nombre}: la que tiene el visto bueno de Lorena no sale en «Confirmado por Lorena» o pide decidir`);
      if (!(await pa.$('[data-grupo-caja="toca"] details[data-pet="6"][open] [data-opcion="6"]'))) fallos.push(`${c.nombre}: la pregunta de Claude no sale con botones`);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-peticiones.png"), fullPage: true });
      if (!(await pa.$('details[data-pet="4"][open] .pet-ficha img'))) fallos.push(`${c.nombre}: no se ven «Lo que ha hecho Claude» y sus capturas`);
      if (!(await pa.$('details[data-pet="5"] .pet-nuevo'))) fallos.push(`${c.nombre}: no marca los mensajes nuevos de Claude`);
      if (await pa.isVisible("#fab")) fallos.push(`${c.nombre}: en las peticiones se ve el botón «Nuevo»`);
      await pa.fill("#pet-texto", "Que el calendario salga en verde.");
      await pa.setInputFiles("#pet-archivos", path.join(RAIZ, "img/og.png")); await pa.waitForTimeout(150);
      await pa.click("#pet-enviar"); await pa.waitForTimeout(700);
      const pn = await pa.evaluate(() => ({ p: __DB.peticiones_claude.find((x) => x.texto === "Que el calendario salga en verde."), t: window.__TIMBRE || [], s: window.__SUBIDOS || [] }));
      if (!pn.p || pn.p.adjuntos.length !== 1 || !/\/peticiones\/\d+-[a-z0-9]+-og\.png$/.test(pn.p.adjuntos[0].url)) fallos.push(`${c.nombre}: no guarda la petición con su foto (${JSON.stringify(pn.p)})`);
      if (!pn.t.some((t) => t.id === pn.p?.id && Object.keys(t).length === 1)) fallos.push(`${c.nombre}: al enviar no toca el timbre`);
      if (!/Claude ya está avisado/.test(await pa.textContent("#pet-msg"))) fallos.push(`${c.nombre}: no dice que Claude está avisado`);
      await pa.click('details[data-pet="5"] > summary'); await pa.click('[data-anade-abre="5"]'); await pa.fill("#pet-anade-5", "Y también en el panel."); await pa.click('form[data-anade="5"] button[type=submit]'); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 5).mensajes.some((m) => m.texto === "Y también en el panel.") && __TIMBRE.some((t) => t.id === 5 && t.anadido)))) fallos.push(`${c.nombre}: no añade a una petición`);
      await pa.click('[data-opcion="6"][data-i="0"]'); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 6).mensajes.some((m) => m.quien === "padre" && m.texto === "Verde") && __TIMBRE.some((t) => t.id === 6 && t.anadido)))) fallos.push(`${c.nombre}: el botón de respuesta no llega a Claude`);
      await pa.click('[data-decide="4"][data-que="descartar"]'); await pa.waitForTimeout(200);
      if (!(await pa.$(".pet-modal"))) fallos.push(`${c.nombre}: «Descartar» no pide confirmación`);
      if (c.nombre === "390") await pa.screenshot({ path: path.join(OUT, "panel-390-peticiones-descartar.png") });
      await pa.click(".pet-modal [data-no]"); await pa.waitForTimeout(150);
      if (await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 4).decision)) fallos.push(`${c.nombre}: «No, volver» descarta igual`);
      await pa.click('[data-decide="4"][data-que="publicar"]'); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 4).decision === "publicar" && __TIMBRE.some((t) => t.id === 4 && t.decision)))) fallos.push(`${c.nombre}: «Publicar» no se guarda`);
      await pa.click('[data-avisa-lorena="3"]'); await pa.waitForTimeout(200); if (!(await pa.$(".pet-modal"))) fallos.push(`${c.nombre}: «Avisar a Lorena» no pregunta antes (solo emergencias)`); await pa.click(".pet-modal [data-si]"); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 3).avisar_lorena && __TIMBRE.some((t) => t.id === 3 && t.avisar)))) fallos.push(`${c.nombre}: «Avisar a Lorena» no funciona`);
      await pa.click('details[data-pet="2"] > summary'); await pa.waitForTimeout(100);
      await pa.click('[data-deshacer="2"]'); await pa.waitForTimeout(200); await pa.click(".pet-modal [data-si]"); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 2).deshacer && __TIMBRE.some((t) => t.id === 2 && t.deshacer)))) fallos.push(`${c.nombre}: «Volver a como estaba antes» no funciona`);
      // «Que lo siga Lorena» y «Quitar de mi lista» (nada se borra)
      await pa.click('details[data-pet="5"] [data-pasar="5"]'); await pa.waitForTimeout(200); await pa.click(".pet-modal [data-si]"); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 5).pasada_lorena && __TIMBRE.some((t) => t.id === 5 && t.pasar)))) fallos.push(`${c.nombre}: «Que lo siga Lorena» no funciona`);
      if (!(await pa.$('[data-bloque="tuyo"] details[data-pet="5"] .pet-lorena-caja'))) fallos.push(`${c.nombre}: la pasada a Lorena no sale en «Lo tuyo»`);
      if (await pa.$('[data-grupo-caja="cerradas"] details[data-pet="1"]') === null) fallos.push(`${c.nombre}: la descartada no sale en «Cerradas sin cambios»`); await pa.click('[data-grupo-caja="cerradas"] > summary'); await pa.click('details[data-pet="1"] > summary'); await pa.waitForTimeout(100); await pa.click('[data-quitar="1"]'); await pa.waitForTimeout(200); await pa.click(".pet-modal [data-si]"); await pa.waitForTimeout(500);
      if (!(await pa.evaluate(() => __DB.peticiones_claude.find((x) => x.id === 1).oculta_padre)) || !(await pa.$('[data-grupo-caja="quitadas"] details[data-pet="1"]'))) fallos.push(`${c.nombre}: «Quitar de mi lista» no funciona`);
      const anchoPet = await pa.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (anchoPet > 1) fallos.push(`${c.nombre} panel #peticiones abiertas: scroll lateral de ${anchoPet}px`);
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
