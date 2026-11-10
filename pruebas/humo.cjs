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
  // v25: el puerto tiene que servir ESTA carpeta (otra prueba podría estar usando el mismo puerto con otra copia)
  const servido = await fetch(BASE + "pruebas/humo.cjs").then((r) => r.text()).catch(() => "");
  if (servido !== fs.readFileSync(__filename, "utf8")) { console.error(`El puerto ${PUERTO} no sirve esta carpeta (${RAIZ}): usa otro con PUERTO=…`); srv.kill(); process.exit(2); }
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
      // v24 (lo eligió Lorena, 10/11/2026): en el móvil, lo urgente justo debajo de «Buzón anónimo» y antes de los accesos;
      // sin nada urgente, sin hueco; en el PC, en la columna de la derecha
      for (const vacio of [false, true]) {
        await p.goto(BASE + (vacio ? "?prueba-vacio" : "") + "#actualidad"); await p.waitForTimeout(700);
        const u = await p.evaluate(() => {
          const caja = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width || r.height ? { top: r.top, bottom: r.bottom } : null; };
          return { lead: caja("#portada-lead .lead.urgente"), movil: caja("#urgente-movil .destacado.con-senal"), lateral: caja("#urgente .destacado.con-senal"), buzon: caja(".hero-btn-sec"), hero: caja(".hero"), accesos: caja(".accesos"), rayas: !!document.querySelector("#urgente-movil .rayas") };
        });
        if (vacio) {
          if (u.movil || u.lateral) fallos.push(`${c.nombre}: sin avisos sale una caja de urgente`);
          if (c.w < 760 && u.accesos.top - u.hero.bottom > 30) fallos.push(`${c.nombre}: sin nada urgente queda un hueco de ${Math.round(u.accesos.top - u.hero.bottom)}px antes de los accesos`);
        } else if (c.w < 760) {
          if (!u.movil || u.lateral) fallos.push(`${c.nombre}: el urgente no sale (solo una vez) debajo del bloque azul`);
          else if (!(u.movil.top >= u.buzon.bottom && u.movil.bottom <= u.accesos.top) || !u.rayas) fallos.push(`${c.nombre}: el urgente no está entre «Buzón anónimo» y los accesos (${JSON.stringify(u)})`);
        } else if (c.w >= 1000) { if (!u.lead || u.lateral || u.movil) fallos.push(`${c.nombre}: en el PC el urgente tiene que salir solo a lo ancho, arriba de la portada (v25)`); }
        else if (!u.lateral || u.movil) fallos.push(`${c.nombre}: en la tableta el urgente tiene que salir solo en la columna de la derecha`);
      }
      // v25 (lo pidió Lorena: «mientras se vea lo del camión y carretilla»): la imagen del camión y la carretilla se ve, sin tapar
      await p.goto(BASE + "#actualidad"); await p.waitForTimeout(500);
      const cam = await p.evaluate(() => {
        const e = document.querySelector(".hero-arte"), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        const enc = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { w: r.width, h: r.height, izq: r.left, der: r.right, img: cs.backgroundImage, vis: cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0, encima: enc === e || e.contains(enc) || (enc && enc.contains(e) && enc.classList.contains("hero-in")) };
      });
      if (!cam.vis || !/portada(-movil)?\.webp/.test(cam.img) || cam.h < 80 || cam.w < (c.w >= 1000 ? 450 : 260) || cam.izq < -40 || cam.der > c.w + 40 || !cam.encima) fallos.push(`${c.nombre}: la imagen del camión y la carretilla no se ve bien (${JSON.stringify(cam)})`);
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
      // ---- v25: lo nuevo (portada de periódico en el PC, un solo sitio para cada cosa, tablas, miga y avisos) ----
      if (c.nombre === "pc" || c.nombre === "390") {
        const pcV = c.nombre === "pc";
        for (const w of pcV ? [1280, 1440, 1920, 1000] : [390]) {
          const [cx, px] = await nuevoCtx("", { w, h: 900 });
          await px.goto(BASE + "#actualidad"); await px.waitForTimeout(700);
          const r = await px.evaluate(() => {
            const visible = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
            const v = document.getElementById("v-actualidad");
            return {
              iconos: [...v.querySelectorAll("svg.ico")].filter(visible).map((i) => (i.closest("[class]")?.className || "?")),
              accesos: visible(document.querySelector(".accesos")), botonesHero: visible(document.querySelector(".hero-btns")), barra: visible(document.querySelector(".barra-fija")),
              banda: [...document.querySelectorAll(".banda-contacto")].filter(visible).length,
              lead: (() => { const t = document.querySelector("#portada-lead .lead-titular"); return visible(t) ? parseFloat(getComputedStyle(t).fontSize) : 0; })(),
              leadLeer: visible(document.querySelector('#portada-lead a.lead-ir[href^="#aviso-"]')),
              columnas: (() => { const l = document.getElementById("lista-actualidad"); return getComputedStyle(l).gridTemplateColumns.split(" ").length; })(),
              leerMasTexto: [...v.querySelectorAll("#lista-actualidad .acciones .btn-linea, #lista-actualidad .leer-mas")].filter(visible).every((b) => getComputedStyle(b).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(b).borderTopWidth === "0px"),
              agenda: [...document.querySelectorAll("#agenda .agenda-item")].filter(visible).map((a) => ({ dia: parseFloat(getComputedStyle(a.querySelector(".agenda-dia b")).fontSize), txt: a.textContent.replace(/\s+/g, " ").trim() })),
              buscador: visible(document.getElementById("cab-buscar")), lupa: visible(document.getElementById("b-buscar")),
            };
          });
          if (pcV) {
            if (r.iconos.length) fallos.push(`${w}: hay iconos decorativos en la portada del PC (${r.iconos.join(", ")})`);
            if (r.accesos || r.botonesHero || r.barra) fallos.push(`${w}: en el PC siguen los accesos, los botones del bloque azul o la barra de abajo (${JSON.stringify({ a: r.accesos, h: r.botonesHero, b: r.barra })})`);
            if (r.banda !== 1) fallos.push(`${w}: la banda del buzón y el contacto no sale una sola vez (${r.banda})`);
            if (r.lead < 28 || !r.leadLeer) fallos.push(`${w}: el aviso importante no va a lo ancho con titular grande y «Leer el aviso completo» (${r.lead}px)`);
            if (r.columnas < 2) fallos.push(`${w}: los anuncios no van en columnas (${r.columnas})`);
            if (!r.leerMasTexto) fallos.push(`${w}: «Leer más» y «Compartir» de los anuncios no son enlaces de texto`);
            if (r.agenda.length < 2 || r.agenda.some((x) => x.dia < 28 || !/Viernes|Lunes|Martes|Miércoles|Jueves|Sábado|Domingo/i.test(x.txt) || !/\d\d:\d\d/.test(x.txt))) fallos.push(`${w}: la agenda «Próximas reuniones» no tiene el día en grande, el título y la hora (${JSON.stringify(r.agenda)})`);
            if (!r.buscador || r.lupa) fallos.push(`${w}: en el PC el buscador no se ve escrito`);
            // Un solo sitio para cada cosa: fuera del menú de arriba y de la miga, ningún enlace se repite en la misma pantalla
            for (const v of ["actualidad", "avisos", "reuniones", "actas", "documentos", "buzon", "nosotros", "seccion-1", "buscar", "privacidad", "aviso-legal", "cookies"]) {
              await px.goto(BASE + "#" + v); await px.waitForTimeout(350);
              const rep = await px.evaluate(() => {
                const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
                const zonas = [document.querySelector(".vista:not([hidden])"), document.querySelector(".banda-contacto"), document.querySelector(".pie")];
                const hs = zonas.flatMap((z) => [...z.querySelectorAll("a[href]")]).filter((a) => visible(a) && !a.closest(".miga, .acepto, .nota-buzon, .texto, .cab-apartado")).map((a) => a.getAttribute("href"));
                const cab = [...document.querySelectorAll(".pestanas a[href]")].map((a) => a.getAttribute("href"));
                const dup = (l) => [...new Set(l.filter((x, i) => l.indexOf(x) !== i))];
                return [...dup(hs), ...dup(cab)];
              });
              if (rep.length) fallos.push(`${w} #${v}: enlaces repetidos en la misma pantalla del PC: ${rep.join(", ")}`);
            }
            // Buscador de la cabecera
            await px.goto(BASE + "#actualidad"); await px.waitForTimeout(300);
            await px.fill("#cab-buscar", "turnos"); await px.press("#cab-buscar", "Enter"); await px.waitForTimeout(400);
            if (!(await px.evaluate(() => location.hash === "#buscar" && document.querySelectorAll("#lista-buscar .resultado").length > 0))) fallos.push(`${w}: el buscador de la cabecera no lleva a los resultados`);
          } else {
            // En el móvil no se mueve nada: barra de abajo, accesos y botones del bloque azul siguen; sin banda ni tabla
            if (!r.accesos || !r.botonesHero || !r.barra || r.banda) fallos.push(`390: en el móvil se ha movido algo (${JSON.stringify({ a: r.accesos, h: r.botonesHero, b: r.barra, banda: r.banda })})`);
            if (!r.lupa) fallos.push("390: en el móvil falta la lupa de la cabecera");
            await px.goto(BASE + "#reuniones"); await px.waitForTimeout(400);
            if (!(await px.evaluate(() => { const a = document.querySelector("#reunion-arriba .tarjeta.reunion"), m = document.getElementById("mes-calendario"); return a && a.getClientRects().length && a.getBoundingClientRect().bottom <= m.getBoundingClientRect().top; }))) fallos.push("390: la próxima reunión no sale arriba del calendario");
            if (!(await px.evaluate(() => { const t = [...document.querySelectorAll("#reunion-arriba h3, #lista-proximas h3")].map((h) => h.textContent.trim()); return t.length && new Set(t).size === t.length && !document.querySelector("#v-reuniones .destacado.cita"); }))) fallos.push("390: la próxima reunión sale repetida en Reuniones");
          }
          // Actas: tabla en el PC (Fecha · Título · Tipo · Ver/Descargar) con buscador; tarjetas en el móvil
          await px.goto(BASE + "#actas"); await px.waitForTimeout(400);
          const ta = await px.evaluate(() => ({ tabla: !!document.querySelector("#lista-actas table.tabla"), cab: [...document.querySelectorAll("#lista-actas th")].map((t) => t.textContent.trim()), filas: document.querySelectorAll("#lista-actas tr.fila-tabla").length, tarjetas: document.querySelectorAll("#lista-actas > .tarjeta.acta").length,
            miga: [...document.querySelectorAll("#v-actas .miga li")].map((l) => l.textContent.trim()) }));
          if (JSON.stringify(ta.miga) !== JSON.stringify(["Inicio", "Actas"])) fallos.push(`${w}: la miga de pan de Actas no es «Inicio › Actas» (${ta.miga})`);
          if (pcV) {
            if (!ta.tabla || ta.filas !== 2 || !/^Fecha/.test(ta.cab[0]) || ta.cab[1] !== "Título" || ta.cab[2] !== "Tipo") fallos.push(`${w}: las actas no salen en tabla (${JSON.stringify(ta)})`);
            await px.click('[data-ver-fila="acta-1"]'); await px.waitForTimeout(200);
            if (!(await px.evaluate(() => { const d = document.getElementById("acta-1"); return d && d.getClientRects().length > 0 && document.querySelector('[data-ver-fila="acta-1"]').getAttribute("aria-expanded") === "true"; }))) fallos.push(`${w}: «Ver» no abre el acta en la tabla`);
            await px.fill("#buscar-actas", "septiembre"); await px.waitForTimeout(200);
            if ((await px.evaluate(() => document.querySelectorAll("#lista-actas tr.fila-tabla").length)) !== 1) fallos.push(`${w}: el buscador no filtra la tabla de actas`);
            await px.goto(BASE + "#documentos"); await px.waitForTimeout(400);
            const td = await px.evaluate(() => ({ filas: document.querySelectorAll("#lista-documentos tr.fila-tabla").length, desc: !!document.querySelector('#lista-documentos .t-acc a[download]'), busca: document.getElementById("buscar-docs").getClientRects().length > 0, miga: [...document.querySelectorAll("#v-actas .miga li")].map((l) => l.textContent.trim()).join(" › ") }));
            if (td.filas !== 2 || !td.desc || !td.busca) fallos.push(`${w}: los documentos no salen en tabla con «Descargar» y buscador (${JSON.stringify(td)})`);
            if (td.miga !== "Inicio › Actas › Documentos útiles") fallos.push(`${w}: miga de Documentos mal (${td.miga})`);
            if (w === 1440) await px.screenshot({ path: path.join(OUT, "web-pc-1440-documentos.png"), fullPage: true });
          } else if (ta.tabla || ta.tarjetas !== 2) fallos.push(`390: en el móvil las actas tienen que seguir en tarjetas (${JSON.stringify(ta)})`);
          // Enlace directo a un acta: abre su fila y la miga termina en su título
          await px.goto(BASE + "#acta-1"); await px.waitForTimeout(500);
          const ea = await px.evaluate(() => ({ ve: document.getElementById("acta-1")?.getClientRects().length > 0, miga: [...document.querySelectorAll("#v-actas .miga li")].map((l) => l.textContent.trim()), actual: document.querySelector("#v-actas .miga [aria-current=page]")?.textContent }));
          if (!ea.ve || ea.miga.length !== 3 || ea.actual !== "Reunión con la empresa de octubre") fallos.push(`${w}: el enlace directo a un acta no la abre o la miga no termina en su título (${JSON.stringify(ea)})`);
          if (w === 1440 || w === 390) await px.screenshot({ path: path.join(OUT, `web-${w}-acta-directa.png`), fullPage: false });
          // Avisos: lo urgente arriba con su señal de peligro; los demás en lista compacta con la fecha
          await px.goto(BASE + "#avisos"); await px.waitForTimeout(400);
          const av = await px.evaluate(() => ({ urg: [...document.querySelectorAll(".avisos-urgentes .aviso.urgente .senal.roja")].length, norm: [...document.querySelectorAll(".avisos-normales .aviso")].length,
            orden: (() => { const u = document.querySelector(".avisos-urgentes"), n = document.querySelector(".avisos-normales"); return !!u && !!n && !!(u.compareDocumentPosition(n) & 4); })(),
            fecha: (() => { const f = document.querySelector(".avisos-normales .aviso .meta > span:not([class])"); return f ? getComputedStyle(f).order === "-1" && +getComputedStyle(f).fontWeight >= 600 : false; })(),
            miga: [...document.querySelectorAll("#v-avisos .miga li")].map((l) => l.textContent.trim()).join(" › ") }));
          if (av.urg !== 1 || av.norm !== 1 || !av.orden || !av.fecha) fallos.push(`${w}: avisos sin separar por importancia (${JSON.stringify(av)})`);
          if (av.miga !== "Inicio › Avisos") fallos.push(`${w}: miga de Avisos mal (${av.miga})`);
          // Señales de los avisos normales: el mismo tamaño que en la v24 (52 × 65)
          const sz = await px.evaluate(() => { const e = document.querySelector(".avisos-normales .aviso .senal"); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
          if (!sz || sz[0] !== 52 || sz[1] !== 65) fallos.push(`${w}: la señal de los avisos normales ha cambiado de tamaño (${sz})`);
          // En el PC, sin iconos decorativos en ninguna página (las señales de tráfico sí); en el móvil, como siempre
          if (pcV) {
            for (const h of ["#avisos", "#reuniones", "#actas", "#documentos", "#buzon", "#nosotros", "#seccion-1", "#buscar"]) {
              await px.goto(BASE + h); await px.waitForTimeout(300);
              if (h === "#buscar") { await px.fill("#buscar-todo", "reunión"); await px.waitForTimeout(400); }
              const ic = await px.evaluate(() => [...document.querySelectorAll("main section:not([hidden]) svg.ico, main section:not([hidden]) .ic")].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest(".senal, .mes-btn")).map((e) => e.parentElement.className || e.parentElement.tagName).slice(0, 6));
              if (ic.length) fallos.push(`${w}: hay iconos decorativos en ${h} en el PC (${ic.join(", ")})`);
            }
          }
          await cx.close();
        }
        // Segunda visita en el PC (con la copia guardada y luego la red): el enlace directo sigue abierto,
        // y la fila abierta con «Ver» no se cierra al llegar la red
        if (pcV) {
          for (const id of ["acta-2", "documento-1"]) {
            const [cx, p1] = await nuevoCtx("window.__TARDA = 400;", { w: 1280, h: 900 });
            await p1.goto(BASE + "#actualidad"); await p1.waitForTimeout(1200);
            const p2 = await cx.newPage(); await p2.goto(BASE + "#" + id); await p2.waitForTimeout(1600);
            const st = await p2.evaluate((id) => { const e = document.getElementById(id), tr = e && e.closest("tr"); return { copia: !!localStorage.getItem("comite-copia"), abierta: !!tr && !tr.hidden && e.getBoundingClientRect().height > 0 }; }, id);
            if (!st.copia || !st.abierta) fallos.push(`1280: en la segunda visita el enlace directo #${id} sale cerrado (${JSON.stringify(st)})`);
            if (id === "acta-2") {
              const p3 = await cx.newPage(); await p3.goto(BASE + "#actas"); await p3.waitForTimeout(150);
              await p3.click('[data-ver-fila="acta-1"]').catch(() => {}); await p3.waitForTimeout(1200);
              if (!(await p3.evaluate(() => { const tr = document.getElementById("det-acta-1"); return !!tr && !tr.hidden; }))) fallos.push("1280: la fila abierta con «Ver» se cierra al llegar la red");
            }
            await cx.close();
          }
        }
      }
      if (c.nombre === "320" || c.nombre === "390-letra") {
        // Cabecera: el nombre no se mete debajo de los botones; accesos de la portada dentro de la pantalla
        for (const letra of [null, "muy-grande"]) for (const w of [320, 360]) {
          const [cx, px] = await nuevoCtx("", { w, h: 760, letra });
          await px.goto(BASE + "#actualidad"); await px.waitForTimeout(500);
          const r = await px.evaluate(() => ({ cortado: [...document.querySelectorAll(".marca-txt b, .marca-txt small")].some((e) => e.scrollWidth > e.clientWidth + 0.5), marca: document.querySelector(".marca-txt").getBoundingClientRect().right, botones: document.querySelector(".cab-botones").getBoundingClientRect().left,
            fuera: [...document.querySelectorAll(".accesos a")].filter((a) => a.getBoundingClientRect().right > innerWidth + 0.5 || a.scrollWidth > a.clientWidth + 1).map((a) => a.textContent.trim()) }));
          if (r.marca > r.botones + 0.5) fallos.push(`${w} ${letra || "normal"}: el nombre de la cabecera se mete debajo de los botones`);
          if (r.fuera.length) fallos.push(`${w} ${letra || "normal"}: accesos de la portada cortados (${r.fuera.join(", ")})`);
          // Revisor M6: «Calsina Carré» y «Comité de empresa» se leen enteros (sin «…»)
          if (r.cortado) fallos.push(`${w} ${letra || "normal"}: «Calsina Carré» o «Comité de empresa» sale cortado en la cabecera`);
          // Revisor I5: el buzón no se sale de su tarjeta (html y body cortan lo que sobra, así que no hay scroll lateral que lo delate)
          await px.goto(BASE + "#buzon"); await px.waitForTimeout(400);
          const fb = await px.evaluate(() => { const f = document.getElementById("form-buzon"), d = f.getBoundingClientRect().right - parseFloat(getComputedStyle(f).paddingRight);
            return [...f.querySelectorAll("button, textarea, .acepto, .nota-buzon, .cuenta-letras")].filter((e) => e.offsetParent && e.getBoundingClientRect().right > d + 1).map((e) => e.id || e.className || e.tagName); });
          if (fb.length) fallos.push(`${w} ${letra || "normal"}: el buzón se sale de su tarjeta (${fb.join(", ")})`);
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
        // m) Petición n.º 10: si ya se activaron (comite-push) y hay permiso, no se piden otra vez; si el móvil perdió
        //    la dirección, se vuelve a apuntar solo. Sin comite-push (desactivados o «Borrar mis datos»), no.
        //    El service worker está bloqueado en esta prueba: se simulan «ready» y pushManager.
        const FALSO_PUSH = (activado) => `${activado ? 'localStorage.setItem("comite-push","https://push.example/viejo");' : ""}
          Object.defineProperty(Notification, "permission", { get: () => "granted" });
          const sub = { endpoint: "https://push.example/nuevo", toJSON: () => ({ endpoint: "https://push.example/nuevo", keys: { p256dh: "p", auth: "a" } }) };
          const reg = { pushManager: { getSubscription: async () => null, subscribe: async () => { window.__SUBS = (window.__SUBS || 0) + 1; return sub; } } };
          Object.defineProperty(navigator.serviceWorker, "ready", { get: () => Promise.resolve(reg) });`;
        for (const activado of [true, false]) {
          const [cp, pp] = await nuevoCtx(FALSO_PUSH(activado));
          await pp.goto(BASE + "#avisos"); await pp.waitForTimeout(700);
          const r = await pp.evaluate(() => ({ on: !document.getElementById("push-on").hidden, subs: window.__SUBS || 0, push: window.__PUSH || [], ls: localStorage.getItem("comite-push") }));
          if (activado && !(r.on && r.subs === 1 && r.push.length === 1 && r.ls === "https://push.example/nuevo")) fallos.push("petición n.º 10: con los avisos ya activados, la web vuelve a pedirlos " + JSON.stringify(r));
          if (!activado && (r.on || r.subs || r.push.length)) fallos.push("petición n.º 10: sin haberlos activado (o tras desactivarlos), se apuntan solos " + JSON.stringify(r));
          await cp.close();
        }
        // n) Auditoría visual: «Contactar» entero a 360 px; sin la segunda línea azul antes del pie (borde de foco de <main>);
        //    «Actualizado el …» en las actas; zonas táctiles de 44 px en los botones de línea y el pie
        const [cn, pn] = await nuevoCtx("", { w: 360, h: 780 });
        await pn.goto(BASE + "#actualidad"); await pn.waitForTimeout(500); await pn.goto(BASE + "#actas"); await pn.waitForTimeout(500);
        const vn = await pn.evaluate(() => { const s = document.querySelector(".barra-fija .btn > span:last-child"), m = document.querySelector("main");
          return { corta: s.scrollWidth > s.clientWidth, foco: document.activeElement === m ? getComputedStyle(m).outlineStyle : "no", act: !!document.querySelector("#lista-actas .actualizado"),
            peq: [...document.querySelectorAll(".btn-linea, .pie-col a, .pie-legal a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).length }; });
        if (vn.corta) fallos.push("360: la barra de abajo corta «Contactar»");
        if (vn.foco !== "no" && vn.foco !== "none") fallos.push("360: <main> enseña el borde de foco (segunda línea azul antes del pie)");
        if (!vn.act) fallos.push("360: las actas no dicen «Actualizado el …»");
        if (vn.peq) fallos.push(`360: ${vn.peq} botones o enlaces del pie miden menos de 44 px de alto`);
        await cn.close();
        // o) Revisor I6: una copia guardada rara no deja la web en blanco: se tira y se pinta lo de la red
        for (const rara of ['{"t":1,"D":{"avisos":null}}', '{"t":1,"D":{"avisos":[1,2],"votos":{},"paginas":{}}}', '"hola"', '{"D":7}']) {
          const [co, po] = await nuevoCtx(`localStorage.setItem("comite-copia", ${JSON.stringify(rara)});`);
          await po.goto(BASE + "#avisos"); await po.waitForTimeout(800);
          const vo = await po.evaluate(() => { let c = null; try { c = JSON.parse(localStorage.getItem("comite-copia")); } catch (_) {} return { tarjetas: document.querySelectorAll("#lista-avisos .tarjeta").length, copiaBuena: !!(c && c.D && Array.isArray(c.D.avisos) && c.D.avisos.length) }; });
          if (!vo.tarjetas || !vo.copiaBuena) fallos.push(`copia rara ${rara}: la web no pinta lo de la red ${JSON.stringify(vo)}`);
          await co.close();
        }
        // p) Revisor M4: «Borrar mis datos» gana a la petición n.º 10 aunque el móvil se esté volviendo a apuntar justo entonces
        {
          const init = `localStorage.setItem("comite-push","https://push.example/viejo");
            Object.defineProperty(Notification, "permission", { get: () => "granted" });
            let cur = null; const sub = { endpoint: "https://push.example/nuevo", unsubscribe: async () => { cur = null; return true; }, toJSON: () => ({ endpoint: "https://push.example/nuevo", keys: { p256dh: "p", auth: "a" } }) };
            const reg = { pushManager: { getSubscription: async () => cur, subscribe: () => new Promise((r) => setTimeout(() => { cur = sub; r(sub); }, 1500)) } };
            Object.defineProperty(navigator.serviceWorker, "ready", { get: () => Promise.resolve(reg) });
            navigator.serviceWorker.getRegistration = async () => reg;`;
          const [cq, pq] = await nuevoCtx(init);
          pq.on("dialog", (d) => d.accept());
          await pq.goto(BASE + "#cookies"); await pq.waitForSelector("#b-borrar-datos", { state: "visible" });
          await pq.click("#b-borrar-datos"); await pq.waitForTimeout(3500);
          const vq = await pq.evaluate(() => localStorage.getItem("comite-push"));
          if (vq) fallos.push("«Borrar mis datos» mientras se volvían a apuntar los avisos: comite-push ha vuelto (" + vq + ")");
          await cq.close();
        }
        // q) Revisor M8: con cientos de avisos se pintan de 30 en 30 («Ver más»); un enlace a uno antiguo lo enseña
        {
          const [cv, pv] = await nuevoCtx(`window.__PRE=[(DB)=>{for(let i=1;i<=200;i++)DB.avisos.push({id:1000+i,titulo:"Aviso viejo "+i,contenido:"x",urgente:false,fecha:new Date(Date.now()-(200+i)*864e5).toISOString(),publicar_en:null,adjuntos:[],actualizado:null});}];`);
          await pv.goto(BASE + "#avisos"); await pv.waitForTimeout(700);
          const n1 = await pv.$$eval("#lista-avisos .tarjeta", (x) => x.length);
          if (n1 > 30 || !(await pv.$("#lista-avisos [data-ver-mas]"))) fallos.push(`avisos: con 203 se pintan ${n1} de golpe (deberían ser 30 con «Ver más»)`);
          else {
            await pv.click("#lista-avisos [data-ver-mas]"); await pv.waitForTimeout(200);
            const n2 = await pv.$$eval("#lista-avisos .tarjeta", (x) => x.length);
            if (n2 !== 60) fallos.push(`avisos: «Ver más» deja ${n2} (deberían ser 60)`);
          }
          await pv.goto(BASE + "#aviso-1200"); await pv.waitForTimeout(500);
          if (!(await pv.$("#aviso-1200")) || (await pv.$(".aviso-falta"))) fallos.push("avisos: el enlace directo a un aviso antiguo no lo enseña");
          await cv.close();
        }
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
