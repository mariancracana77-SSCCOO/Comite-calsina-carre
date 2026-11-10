// Prueba del panel (v23): lo que se arregló en la revisión del panel. Doble toque, sesión caducada,
// mensajes sin conexión en español, salir sin guardar, quitar el EXIF de las fotos, tapar datos en el
// asistente, «Avisar a Lorena» sin quitar los botones de la pregunta y el pie del editor con 320 px.
// Uso: NODE_PATH=$(npm root -g) node pruebas/panel.cjs [carpeta-capturas]   (puerto: variable PUERTO, 8794)
// Usa el simulador de siempre (mock-supabase.js) con un añadido propio (PARCHE) para poder simular
// la sesión caducada, la falta de conexión y guardar lo que se sube.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const RAIZ = path.join(__dirname, ".."), MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8");
const OUT = process.argv[2] || path.join(RAIZ, "pruebas", "capturas-panel");
const PUERTO = Number(process.env.PUERTO) || 8794, BASE = `http://localhost:${PUERTO}/`;
fs.mkdirSync(OUT, { recursive: true });

// Añadido al simulador: window.__P controla los fallos que se quieren probar
const PARCHE = `;(function () {
  const c = window.supabase.createClient();
  window.supabase.createClient = () => c;
  const P = window.__P = { caducada: false, sinRed: false, falloAviso: false, esperaAviso: 0, sesion: true, entra: false, blobs: [], authCb: null,
    cuelga: false, cuelgaAviso: false, sesionRed: false, tope: 0, borrados: [] };
  const sinRed = () => ({ data: null, count: null, error: { message: "TypeError: Failed to fetch" } });
  const from0 = c.from;
  c.from = (t) => {
    const q = from0(t); let modo = "";
    const up = q.update, de = q.delete, ins = q.insert, ups = q.upsert, th = q.then;
    q.update = (v) => { modo = "escribe"; return up(v); };
    q.delete = () => { modo = "escribe"; return de(); };
    q.insert = (v) => { modo = "inserta"; return ins(v); };
    q.upsert = (v) => { modo = "inserta"; return ups(v); };
    q.then = (ok, ko) => {
      if (P.sinRed) return Promise.resolve(sinRed()).then(ok, ko);
      if (P.cuelga && modo) return new Promise(() => {}); // conexión colgada: nunca contesta
      if (P.caducada && modo === "escribe") return Promise.resolve({ data: [], error: null }).then(ok, ko);
      if (P.caducada && modo === "inserta") return Promise.resolve({ data: null, error: { code: "42501", message: "new row violates row-level security policy for table" } }).then(ok, ko);
      if (P.caducada) return Promise.resolve({ data: [], count: 0, error: null }).then(ok, ko);
      return th(ok, ko);
    };
    return q;
  };
  const rpc0 = c.rpc;
  c.rpc = async (n, a) => P.sinRed ? sinRed() : P.caducada && n === "is_admin" ? { data: false, error: null } : rpc0(n, a);
  const inv0 = c.functions.invoke;
  c.functions.invoke = async (n, o) => {
    if (P.sinRed || (P.falloAviso && n === "notificar")) return { data: null, error: { name: "FunctionsFetchError", message: "Failed to send a request to the Edge Function", context: new TypeError("Failed to fetch") } };
    if (n === "notificar" && P.cuelgaAviso) return new Promise(() => {});
    if (n === "notificar" && P.esperaAviso) await new Promise((r) => setTimeout(r, P.esperaAviso));
    return inv0(n, o);
  };
  const st0 = c.storage.from;
  c.storage.from = (b) => { const s = st0(b), up = s.upload, rm = s.remove; s.remove = async (rutas) => { P.borrados.push(...rutas); return rm(rutas); }; s.upload = async (ruta, f, op) => { if (P.sinRed) return { error: { message: "Failed to fetch" } }; P.blobs.push({ ruta, f, tipo: op && op.contentType }); return up(ruta, f, op); }; return s; };
  const gs = c.auth.getSession;
  // sesionRed: token caducado y la renovación falla por la red (supabase-js no lanza: da session null con error)
  c.auth.getSession = async () => P.sesionRed ? { data: { session: null }, error: { name: "AuthRetryableFetchError", message: "Failed to fetch" } } : P.sesion ? gs() : { data: { session: null }, error: null };
  c.auth.onAuthStateChange = (cb) => { P.authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; };
  c.auth.signInWithPassword = async () => { if (!P.entra) return { data: null, error: { message: "Invalid login credentials" } }; P.sesion = true; P.caducada = false; return { data: {}, error: null }; };
})();`;

// JPEG con EXIF: orientación 6 (girar 90°) y un texto «GPS-PRUEBA» que no debe llegar al almacén
const jpegConExif = (jpg) => {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0]);
  const cuerpo = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff, Buffer.from("GPS-PRUEBA-41.98N-2.82E")]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (cuerpo.length + 2) >> 8, (cuerpo.length + 2) & 255]), cuerpo]);
  return Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]);
};

(async () => {
  const srv = spawn("python3", ["-m", "http.server", String(PUERTO)], { cwd: RAIZ, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  // El puerto tiene que servir ESTA carpeta (otra prueba podría estar usando el mismo puerto con otra copia)
  const servido = await fetch(BASE + "pruebas/panel.cjs").then((r) => r.text()).catch(() => "");
  if (servido !== fs.readFileSync(__filename, "utf8")) { console.error(`El puerto ${PUERTO} no sirve esta carpeta (${RAIZ}): usa otro con PUERTO=…`); srv.kill(); process.exit(2); }
  const b = await chromium.launch({ args: ["--lang=es-ES"], env: { ...process.env, LANG: "es_ES.UTF-8", LANGUAGE: "es_ES" } });
  const errores = [], fallos = [], bien = [];
  const ok = (cond, txt) => { (cond ? bien : fallos).push(txt); };
  const nuevoCtx = async (o = {}) => {
    const ctx = await (o.nav || b).newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, colorScheme: o.oscuro ? "dark" : "light", serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true });
    await ctx.route("**/lib/supabase.js*", (r) => r.fulfill({ contentType: "application/javascript", body: MOCK + PARCHE }));
    await ctx.route("https://ytxpubqyhnohhugpukdm.supabase.co/**", (r) => r.fulfill({ path: path.join(RAIZ, "img/icon-192.png") }));
    await ctx.addInitScript((l) => { localStorage.setItem("prueba-sesion", "1"); if (l) localStorage.setItem("comite-letra", l); }, o.letra || "");
    return ctx;
  };
  // Cada página lleva la cuenta de las ventanas de «confirmar» y cómo se contestan
  const pagina = async (ctx, nombre) => {
    const p = await ctx.newPage();
    p.dialogos = []; p.respuesta = true;
    p.on("dialog", (d) => { p.dialogos.push({ tipo: d.type(), txt: d.message() }); (p.respuesta ? d.accept() : d.dismiss()).catch(() => {}); });
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(`${nombre}: ${m.text()}`); });
    p.on("pageerror", (e) => errores.push(`${nombre}: ${e.message}`));
    p.setDefaultTimeout(4000);
    return p;
  };
  const ve = async (p, hash, espera = 550) => { await p.goto(BASE + "admin.html#" + hash); await p.waitForTimeout(espera); };
  const foto = (p, n) => p.screenshot({ path: path.join(OUT, n + ".png") });
  const nuevo = async (p, k) => { await ve(p, k); await p.evaluate(() => document.getElementById("fab").click()); await p.waitForTimeout(350); };
  const sinIngles = (t) => !/Failed|Edge Function|request|central directory|zip file|fetch|NetworkError/i.test(t || "");

  try {
    const ctx = await nuevoCtx();
    let p;
    // ---- 1. Doble toque en «Publicar» (C1) ----
    await (async () => {
      p = await pagina(ctx, "doble");
      await nuevo(p, "reuniones");
      await p.fill("#f-titulo", "Reunión doble toque"); await p.fill("#f-fecha", "2026-12-01");
      await p.evaluate(() => { const g = document.getElementById("ed-guardar"); g.click(); g.click(); g.click(); });
      await p.waitForTimeout(700);
      ok(await p.evaluate(() => __DB.reuniones.filter((r) => r.titulo === "Reunión doble toque").length) === 1, "C1: un triple toque en «Publicar» guarda una sola reunión");
      await p.evaluate(() => { __P.esperaAviso = 1500; });
      await nuevo(p, "avisos");
      await p.fill("#f-titulo", "Aviso doble toque");
      await p.click("#ed-guardar"); await p.waitForTimeout(400);
      const bloqueado = await p.evaluate(() => document.getElementById("ed-guardar").disabled);
      await foto(p, "c1-avisando-moviles");
      await p.evaluate(() => document.getElementById("ed-guardar").click());
      await p.waitForTimeout(2200);
      ok(bloqueado, "C1: mientras avisa a los móviles, «Publicar» sigue bloqueado");
      ok(await p.evaluate(() => __DB.avisos.filter((r) => r.titulo === "Aviso doble toque").length) === 1, "C1: tocar otra vez mientras avisa no publica dos veces");
      await p.evaluate(() => { __P.esperaAviso = 0; });
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:2"]'); await p.waitForTimeout(300);
      p.dialogos = [];
      await p.evaluate(() => { const g = document.getElementById("ed-borrar"); g.click(); g.click(); });
      await p.waitForTimeout(600);
      ok(p.dialogos.filter((d) => /Borrar/.test(d.txt)).length === 1, "C1: un doble toque en «Borrar» pregunta una sola vez");
      await p.close();
    })().catch((e) => fallos.push("Bloque 1 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 2. Sesión caducada (N5 / I3) ----
    await (async () => {
      p = await pagina(ctx, "sesion");
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:1"]'); await p.waitForTimeout(300);
      await p.fill("#f-titulo", "Título cambiado sin sesión");
      await p.evaluate(() => { __P.caducada = true; });
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      const msgCad = await p.textContent("#ed-msg"), toastCad = (await p.isVisible("#toast")) ? await p.textContent("#toast") : "";
      await foto(p, "n5-guardar-sin-sesion");
      ok(/sesión ha caducado/i.test(msgCad) && !/guardado/i.test(toastCad), `N5: sin sesión, «Guardar» no dice «guardado» (${msgCad} | ${toastCad})`);
      ok(!(await p.evaluate(() => document.getElementById("editor").hidden)) && (await p.inputValue("#f-titulo")) === "Título cambiado sin sesión", "N5: sin sesión, el editor sigue abierto con lo escrito");
      await p.evaluate(() => { document.getElementById("ed-borrar").click(); });
      await p.waitForTimeout(500);
      const toastBorrar = (await p.isVisible("#toast")) ? await p.textContent("#toast") : "";
      ok(!/^Borrado/.test(toastBorrar) && /sesión/i.test(await p.textContent("#ed-msg")), `N5: sin sesión, «Borrar» no dice «Borrado» (${toastBorrar})`);
      // Aviso de Supabase: la sesión se ha cerrado (SIGNED_OUT) con el editor abierto
      await p.evaluate(() => { __P.sesion = false; __P.authCb && __P.authCb("SIGNED_OUT", null); });
      await p.waitForTimeout(400);
      await foto(p, "n5-sesion-cerrada");
      const enEntrar = await p.evaluate(() => !document.getElementById("s-entrar").hidden && document.getElementById("editor").hidden);
      ok(enEntrar && /caducado|Vuelve a entrar/i.test(await p.textContent("#e-estado")), "N5: al cerrarse la sesión sale la pantalla de entrar con «Tu sesión ha caducado»");
      await p.evaluate(() => { __P.entra = true; });
      await p.fill("#e-email", "prueba@example.com"); await p.fill("#e-clave", "Camion2026x");
      await p.click('#f-entrar button[type="submit"]'); await p.waitForTimeout(800);
      ok(await p.evaluate(() => !document.getElementById("editor").hidden && document.getElementById("f-titulo")?.value === "Título cambiado sin sesión"), "N5: al volver a entrar, el editor sale otra vez con lo escrito");
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      ok(await p.evaluate(() => __DB.avisos.find((a) => a.id === 1).titulo === "Título cambiado sin sesión"), "N5: después de volver a entrar, se guarda bien");
      await p.close();
    })().catch((e) => fallos.push("Bloque 2 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 3. Sin conexión: mensajes en español (I4, I8) ----
    await (async () => {
      p = await pagina(ctx, "sinred");
      await ve(p, "accesos");
      await p.evaluate(() => { __P.sinRed = true; });
      await p.click('[data-poner-clave="otro@example.com"]');
      await p.fill('[data-form-clave="otro@example.com"] [data-clave1]', "Camion2026x");
      await p.fill('[data-form-clave="otro@example.com"] [data-clave2]', "Camion2026x");
      await p.click('[data-form-clave="otro@example.com"] button[type=submit]'); await p.waitForTimeout(500);
      const mClave = await p.textContent('[data-form-clave="otro@example.com"] .estado');
      await foto(p, "i4-contrasena-sin-red");
      ok(sinIngles(mClave) && /conexión/i.test(mClave), `I4: «Poner contraseña» sin conexión, en español (${mClave})`);
      await p.click("#b-codigos"); await p.waitForTimeout(400);
      const tCod = await p.textContent("#toast");
      ok(sinIngles(tCod), `I4: «Crear códigos nuevos» sin conexión, en español (${tCod})`);
      await p.evaluate(() => { __P.sinRed = false; });
      await nuevo(p, "avisos");
      await p.fill("#f-titulo", "Aviso sin red");
      await p.evaluate(() => { __P.sinRed = true; });
      await p.click("#ed-guardar"); await p.waitForTimeout(500);
      const mPub = await p.textContent("#ed-msg");
      ok(/No hay conexión/.test(mPub) && !(await p.evaluate(() => document.getElementById("ed-guardar").disabled)), `I4: publicar sin conexión lo dice y deja volver a intentarlo (${mPub})`);
      await p.evaluate(() => { __P.sinRed = false; }); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      // Word roto en el asistente
      await nuevo(p, "actas");
      await p.setInputFiles("#f-ia", { name: "roto.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("esto no es un zip") });
      await p.waitForTimeout(800);
      const mWord = await p.textContent("#m-ia");
      ok(sinIngles(mWord) && /roto\.docx/.test(mWord), `I4: un Word roto se explica en español (${mWord})`);
      await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      // Inicio sin conexión
      await p.evaluate(() => { __P.sinRed = true; });
      await p.evaluate(() => { location.hash = "avisos"; }); await p.waitForTimeout(300);
      await p.evaluate(() => { location.hash = "inicio"; }); await p.waitForTimeout(600);
      const zonaIni = await p.textContent("#zona");
      await foto(p, "i8-inicio-sin-red");
      ok(/No hay conexión/.test(zonaIni) && !/Todavía no has publicado nada|Todavía no has hecho ninguna copia|No hay mensajes nuevos/.test(zonaIni), "I8: Inicio sin conexión lo dice y no da datos falsos");
      // El aviso a los móviles falla: el padre se entera (I1 / N6)
      await p.evaluate(() => { __P.sinRed = false; __P.falloAviso = true; });
      await nuevo(p, "avisos");
      await p.fill("#f-titulo", "Aviso con móviles caídos");
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      const tMov = await p.textContent("#toast");
      await foto(p, "i1-fallo-moviles");
      ok(/no se ha podido avisar a los móviles/i.test(tMov) && (await p.evaluate(() => document.getElementById("toast").classList.contains("mal"))), `I1: si falla el aviso a los móviles, se ve en rojo (${tMov})`);
      await p.close();
    })().catch((e) => fallos.push("Bloque 3 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 4. Salir sin guardar (I5) ----
    await (async () => {
      p = await pagina(ctx, "salir");
      await ve(p, "textos");
      await p.fill("#t-bienvenida", "Texto a medias que no quiero perder");
      p.respuesta = false; p.dialogos = [];
      await p.click('.barra-movil [data-ir="inicio"]'); await p.waitForTimeout(500);
      ok(p.dialogos.length === 1 && (await p.evaluate(() => location.hash)) === "#textos" && (await p.inputValue("#t-bienvenida")) === "Texto a medias que no quiero perder", "I5: en «Textos de la web», salir con cambios pregunta y «Cancelar» lo deja todo");
      await foto(p, "i5-textos-pregunta");
      p.respuesta = true;
      await ve(p, "peticiones");
      await p.fill("#pet-texto", "Una petición a medias");
      p.respuesta = false; p.dialogos = [];
      await p.click('.barra-movil [data-ir="avisos"]'); await p.waitForTimeout(500);
      ok(p.dialogos.length === 1 && (await p.inputValue("#pet-texto")) === "Una petición a medias", "I5: en «Pedir un cambio», salir con algo escrito pregunta");
      p.respuesta = true;
      // Botón Atrás del móvil con el editor abierto
      await ve(p, "inicio"); await ve(p, "avisos");
      await p.evaluate(() => document.getElementById("fab").click()); await p.waitForTimeout(350);
      await p.fill("#f-titulo", "Aviso a medias");
      p.respuesta = false; p.dialogos = [];
      await p.goBack().catch(() => {}); await p.waitForTimeout(500);
      ok(p.dialogos.length === 1 && !(await p.evaluate(() => document.getElementById("editor").hidden)) && (await p.inputValue("#f-titulo")) === "Aviso a medias", "I5: «Atrás» con el editor a medias pregunta y «Cancelar» lo deja abierto");
      await foto(p, "i5-atras-editor");
      p.respuesta = true; p.dialogos = [];
      await p.goBack().catch(() => {}); await p.waitForTimeout(500);
      ok(await p.evaluate(() => document.getElementById("editor").hidden && /admin\.html#avisos$/.test(location.href)), "I5: «Atrás» y «Aceptar» cierran el editor sin salir del panel");
      await p.evaluate(() => document.getElementById("fab").click()); await p.waitForTimeout(350);
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      await p.goBack().catch(() => {}); await p.waitForTimeout(500);
      ok(await p.evaluate(() => /admin\.html#inicio$/.test(location.href)), "I5: después de cerrar el editor, «Atrás» vuelve a la página de antes");
      // Recargar con el editor a medias
      await ve(p, "avisos");
      await p.evaluate(() => document.getElementById("fab").click()); await p.waitForTimeout(350);
      await p.click("#f-titulo"); await p.keyboard.type("Aviso a medias");
      p.respuesta = false; p.dialogos = [];
      await p.reload({ timeout: 2500 }).catch(() => {}); await p.waitForTimeout(400);
      ok(p.dialogos.some((d) => d.tipo === "beforeunload"), "I5: recargar o cerrar con el editor a medias pregunta (beforeunload)");
      p.respuesta = true;
      await p.close();
    })().catch((e) => fallos.push("Bloque 4 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 5. Fotos sin EXIF y tipo según la extensión (F-1, F-2) ----
    await (async () => {
      p = await pagina(ctx, "exif");
      await ve(p, "avisos");
      const base64 = await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 200; const x = c.getContext("2d"); x.fillStyle = "#0E5FAE"; x.fillRect(0, 0, 400, 200); x.fillStyle = "#fff"; x.fillRect(0, 0, 100, 50); return c.toDataURL("image/jpeg", 0.9).split(",")[1]; });
      const conExif = jpegConExif(Buffer.from(base64, "base64"));
      await p.evaluate(() => document.getElementById("fab").click()); await p.waitForTimeout(350);
      await p.setInputFiles("#f-subir", [{ name: "tablon.jpg", mimeType: "image/jpeg", buffer: conExif }, { name: "acta.docx", mimeType: "application/octet-stream", buffer: Buffer.from("PK\x03\x04 docx de prueba") }]);
      await p.waitForTimeout(1200);
      const sub = await p.evaluate(async () => {
        const r = [];
        for (const x of __P.blobs) {
          const buf = new Uint8Array(await x.f.arrayBuffer()), txt = Array.from(buf.subarray(0, 4000), (c) => String.fromCharCode(c)).join("");
          let w = 0, h = 0; if (/^image\//.test(x.tipo)) { const bm = await createImageBitmap(x.f, { imageOrientation: "none" }); w = bm.width; h = bm.height; }
          r.push({ ruta: x.ruta, tipo: x.tipo, exif: /Exif|GPS-PRUEBA/.test(txt), w, h, tam: buf.length });
        }
        return { r, adj: __DB.avisos.length, tipos: [...document.querySelectorAll("#lista-adj small")].map((s) => s.textContent) };
      });
      const fJpg = sub.r.find((x) => /tablon/.test(x.ruta)), fDoc = sub.r.find((x) => /acta\.docx/.test(x.ruta));
      ok(fJpg && !fJpg.exif, `F-1: la foto se sube sin EXIF ni GPS (${JSON.stringify(fJpg)})`);
      ok(fJpg && !fJpg.exif && fJpg.h > fJpg.w, "F-1: la foto respeta la orientación del móvil (girada, como se ve)");
      ok(fJpg && fJpg.tipo === "image/jpeg" && fJpg.w <= 2000 && fJpg.h <= 2000 && Math.max(fJpg.w, fJpg.h) === 400, "F-1: no se agranda y se sube como JPEG");
      ok(fDoc && fDoc.tipo === "application/vnd.openxmlformats-officedocument.wordprocessingml.document", `F-2: un .docx sin tipo se sube con el tipo de Word (${fDoc?.tipo})`);
      await foto(p, "f1-foto-sin-exif");
      // Varios archivos que no se pueden subir: un solo mensaje con todos
      await p.setInputFiles("#f-subir", [{ name: "a.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }, { name: "b.html", mimeType: "text/html", buffer: Buffer.from("<p>") }, { name: "IMG_1.heic", mimeType: "image/heic", buffer: Buffer.from("x") }]);
      await p.waitForTimeout(400);
      const tRech = await p.textContent("#toast");
      ok(/a\.svg/.test(tRech) && /b\.html/.test(tRech) && /HEIC/i.test(tRech), `Mejora 1-2: los rechazados salen juntos y se explica el HEIC (${tRech})`);
      await p.close();
    })().catch((e) => fallos.push("Bloque 5 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 6. Asistente de actas: tapar datos (I7) y aviso de temas delicados ----
    await (async () => {
      p = await pagina(ctx, "tapar");
      await nuevo(p, "actas");
      ok(/salud/i.test(await p.textContent(".asistente")) && /sindicato/i.test(await p.textContent(".asistente")), "Legal: el asistente avisa de no enviar salud, sanciones ni sindicato");
      await p.evaluate(() => document.querySelectorAll(".nota-ia").forEach((d) => { d.open = true; }));
      await p.fill("#notas-ia", "Acta de la reunión. DNI 12.345.678-Z y 87654321-x. Matrícula 1234-bcd y 5678 KLM. Lo dijo López en la reunión. Según Calsina Carré, la flota hace 1500 kms y se pagarán 1.500.000 y 2.000 euros.");
      await p.click("#b-ia"); await p.waitForTimeout(500);
      await foto(p, "i7-revision");
      await p.click("[data-ia-enviar]"); await p.waitForTimeout(700);
      const env = await p.evaluate(() => window.__IA?.notas || "");
      ok(!/12\.345\.678|87654321|1234-bcd|5678 KLM|López/.test(env), `I7: se tapan el DNI con puntos, la matrícula en minúscula y el apellido suelto (${env.slice(-260)})`);
      ok(/1500 kms/.test(env) && /1\.500\.000 y 2\.000/.test(env) && /Calsina Carré/.test(env), "I7: no se tapan de más palabras ni cifras normales");
      await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      await p.close();
    })().catch((e) => fallos.push("Bloque 6 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 7. Más arreglos: programado (I2), borrar sección (I6), Avisar a Lorena (mejora 6), fechas y email ----
    await (async () => {
      p = await pagina(ctx, "varios");
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:3"]'); await p.waitForTimeout(300);
      await p.fill("#f-publicar_en", ""); await p.waitForTimeout(100);
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      ok(await p.evaluate(() => { const a = __DB.avisos.find((x) => x.id === 3); return !a.publicar_en && Math.abs(Date.parse(a.fecha) - Date.now()) < 60000; }), "I2: al quitar la programación, el aviso sale ya con la fecha de ahora");
      await ve(p, "apartados"); await p.click('[data-editar-en="apartados:1"]'); await p.waitForTimeout(300);
      p.respuesta = false; p.dialogos = [];
      await p.click("#ed-borrar"); await p.waitForTimeout(300);
      ok(p.dialogos.length && /1 subsección/.test(p.dialogos[0].txt) && /2 publicaciones/.test(p.dialogos[0].txt), `I6: borrar una sección avisa de lo que lleva dentro (${p.dialogos[0]?.txt.replace(/\n/g, " ")})`);
      p.respuesta = true; await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      await nuevo(p, "reuniones");
      await p.fill("#f-titulo", "Reunión rara"); await p.fill("#f-fecha", "2026-12-01"); await p.fill("#f-hora", "12:00"); await p.fill("#f-hora_fin", "10:00");
      await p.click("#ed-guardar"); await p.waitForTimeout(300);
      ok(/fin/i.test(await p.textContent("#ed-msg")) && !(await p.evaluate(() => __DB.reuniones.some((r) => r.titulo === "Reunión rara"))), "Mejora 3: no guarda una reunión que acaba antes de empezar");
      await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      await nuevo(p, "miembros");
      await p.fill("#f-nombre", "Prueba Email"); await p.fill("#f-email", "esto no es un email");
      await p.click("#ed-guardar"); await p.waitForTimeout(300);
      ok(/email/i.test(await p.textContent("#ed-msg")) && !(await p.evaluate(() => __DB.miembros.some((r) => r.nombre === "Prueba Email"))), "Mejora 4: no guarda un email mal escrito");
      ok(/permiso/i.test(await p.textContent("#ed-form")) && /retir/i.test(await p.textContent("#ed-form")), "Legal: las ayudas de miembros hablan del permiso escrito y de retirarlo");
      await p.keyboard.press("Escape"); await p.waitForTimeout(200);
      await ve(p, "peticiones", 700);
      await p.click('[data-avisa-lorena="6"]'); await p.waitForTimeout(200); await p.click(".pet-modal [data-si]"); await p.waitForTimeout(600);
      ok(!!(await p.$('[data-opcion="6"]')), "Mejora 6: después de «Avisar a Lorena» siguen los botones de la pregunta de Claude");
      await foto(p, "m6-avisar-lorena");
      await p.close();
    })().catch((e) => fallos.push("Bloque 7 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 8. 320 px con letra muy grande: el pie del editor cabe (I9) ----
    await (async () => {
      for (const [nombre, o] of [["320-muy-grande", { w: 320, h: 700, letra: "muy-grande" }], ["320-oscuro-muy-grande", { w: 320, h: 700, letra: "muy-grande", oscuro: true }], ["320-oscuro-pequena", { w: 320, h: 700, letra: "pequena", oscuro: true }]]) {
        const c2 = await nuevoCtx(o), q = await pagina(c2, nombre);
        for (const k of ["avisos", "actas", "miembros", "encuestas"]) {
          await ve(q, k); await q.click("[data-editar-en]"); await q.waitForTimeout(300);
          const m = await q.evaluate(() => { const pie = document.querySelector(".ed-pie"); return { pie: pie.scrollWidth - pie.clientWidth, botones: [...pie.querySelectorAll("button:not([hidden])")].map((x) => x.scrollWidth - x.clientWidth).filter((d) => d > 1).length, pag: document.documentElement.scrollWidth - innerWidth }; });
          ok(m.pie <= 1 && !m.botones && m.pag <= 1, `I9 ${nombre}: el pie del editor de ${k} cabe (${JSON.stringify(m)})`);
          if (k === "avisos") await foto(q, "i9-" + nombre + "-editor");
          await q.keyboard.press("Escape"); await q.waitForTimeout(150);
        }
        await ve(q, "inicio");
        const ini = await q.evaluate(() => [...document.querySelectorAll(".hola-dato span")].filter((s) => s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1).length);
        ok(!ini, `Mejora 11 ${nombre}: el resumen de Inicio no corta el texto`);
        await foto(q, "m11-" + nombre + "-inicio");
        await c2.close();
      }
    })().catch((e) => fallos.push("Bloque 8 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 9. Lo que pidió Lorena el 10/11: borrador guardado solo, Deshacer, plantillas, vista previa y listas vacías ----
    await (async () => {
      p = await pagina(ctx, "comodo");
      // Borrador: se escribe, se recarga la página sin guardar y al volver a abrir se ofrece
      // (si quedó uno de antes de otras pruebas, se descarta: escribir sin contestar ya no lo machaca)
      await nuevo(p, "avisos"); await p.$('[data-borrador="no"]').then((x) => x && x.click()); await p.waitForTimeout(150);
      await p.fill("#f-titulo", "Aviso que se queda a medias");
      await p.fill("#f-contenido", "Texto que no quiero perder");
      await p.waitForTimeout(800);
      const clave = await p.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("comite-adm-borrador-avisos-nuevo")));
      ok(clave === "comite-adm-borrador-avisos-nuevo", `Borrador: se guarda solo mientras se escribe (${clave})`);
      p.respuesta = true;
      await p.reload(); await p.waitForTimeout(600);
      await nuevo(p, "avisos");
      ok(await p.isVisible("#borrador-aviso"), "Borrador: al volver a abrir, sale «Tienes un borrador sin guardar»");
      await foto(p, "b1-borrador-ofrece");
      await p.click('[data-borrador="si"]'); await p.waitForTimeout(250);
      ok((await p.inputValue("#f-titulo")) === "Aviso que se queda a medias" && (await p.inputValue("#f-contenido")) === "Texto que no quiero perder" && !(await p.isVisible("#borrador-aviso")), "Borrador: «Recuperarlo» pone lo escrito");
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      ok(await p.evaluate(() => !Object.keys(localStorage).some((k) => k.startsWith("comite-adm-borrador-"))), "Borrador: al publicar bien se borra");
      // «Descartarlo»
      await nuevo(p, "reuniones"); await p.fill("#f-titulo", "Reunión a medias"); await p.waitForTimeout(700);
      await p.reload(); await p.waitForTimeout(600); await nuevo(p, "reuniones");
      await p.click('[data-borrador="no"]'); await p.waitForTimeout(200);
      ok((await p.inputValue("#f-titulo")) === "" && await p.evaluate(() => !localStorage.getItem("comite-adm-borrador-reuniones-nuevo")), "Borrador: «Descartarlo» lo quita");
      // Plantilla: rellena y no deja publicar con los corchetes sin cambiar
      await p.click("[data-plantilla]"); await p.waitForTimeout(200);
      ok(/Convocatoria/.test(await p.inputValue("#f-titulo")) && /Orden del día/.test(await p.inputValue("#f-descripcion")), "Plantilla: «Empezar con una plantilla» rellena la convocatoria");
      await p.fill("#f-fecha", "2026-12-03");
      await p.click("#ed-guardar"); await p.waitForTimeout(300);
      ok(/corchetes/.test(await p.textContent("#ed-msg")) && !(await p.evaluate(() => document.getElementById("editor").hidden)), "Plantilla: no se publica con texto de ejemplo [ ] sin cambiar");
      await foto(p, "p1-plantilla");
      await p.fill("#f-lugar", "Sala de reuniones");
      await p.fill("#f-descripcion", "Orden del día:\n- Turnos de Navidad");
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      ok(await p.evaluate(() => __DB.reuniones.some((r) => r.titulo === "Convocatoria: reunión del comité")), "Plantilla: cambiado lo de los corchetes, se publica");
      // Vista previa en el móvil: botón grande al final
      await nuevo(p, "avisos"); await p.$('[data-borrador="no"]').then((x) => x && x.click());
      await p.fill("#f-titulo", "Prueba de vista previa");
      await p.click("[data-ver-previa]"); await p.waitForTimeout(250);
      ok(await p.evaluate(() => document.querySelector(".ed-cuerpo").dataset.ver === "previa" && /Prueba de vista previa/.test(document.getElementById("ed-previa").textContent)), "Vista previa: «Ver cómo quedará en la web» la enseña");
      await foto(p, "v1-vista-previa");
      await p.click("#ed-volver-form"); await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.querySelector(".ed-cuerpo").dataset.ver === "form"), "Vista previa: «Volver a escribir» vuelve al formulario");
      p.respuesta = true; await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      // Deshacer un cambio
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:2"]'); await p.waitForTimeout(300);
      await p.fill("#f-titulo", "Título cambiado por error");
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      ok(await p.isVisible("#toast .toast-btn"), "Deshacer: al guardar un cambio sale «Deshacer»");
      await foto(p, "d1-deshacer-cambio");
      await p.click("#toast .toast-btn"); await p.waitForTimeout(600);
      ok(await p.evaluate(() => __DB.avisos.find((a) => a.id === 2).titulo === "Recordatorio: ropa de trabajo"), "Deshacer: el cambio vuelve a como estaba");
      // Deshacer un borrado (el servidor lo guarda en la papelera; aquí se simula)
      await p.evaluate(() => { const a = __DB.avisos.find((x) => x.id === 2); __DB.papelera.push({ id: 77, tabla: "avisos", datos: JSON.parse(JSON.stringify(a)), borrado: new Date().toISOString(), por: "prueba@example.com" }); });
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:2"]'); await p.waitForTimeout(300);
      p.respuesta = true; await p.click("#ed-borrar"); await p.waitForTimeout(700);
      ok(await p.evaluate(() => !__DB.avisos.some((a) => a.id === 2)) && await p.isVisible("#toast .toast-btn"), "Deshacer: al borrar sale «Deshacer»");
      await foto(p, "d2-deshacer-borrado");
      await p.click("#toast .toast-btn"); await p.waitForTimeout(700);
      ok(await p.evaluate(() => __DB.avisos.some((a) => a.id === 2) && !__DB.papelera.some((x) => x.id === 77)), "Deshacer: lo borrado vuelve a su sitio");
      // Lista vacía con ayuda y botón
      await p.evaluate(() => { __DB.preguntas = []; }); await p.evaluate(() => { location.hash = "#inicio"; }); await p.waitForTimeout(300);
      await p.evaluate(() => { location.hash = "#preguntas"; }); await p.waitForTimeout(500);
      ok(await p.isVisible('#filas .vacio-caja [data-nuevo="preguntas"]'), "Lista vacía: explica y tiene el botón para añadir");
      await foto(p, "e1-lista-vacia");
      // Buzón: los enlaces que escriben los trabajadores no se pueden pulsar
      await p.evaluate(() => { __DB.buzon[0].texto = "Mirad esto https://ejemplo.invalid/premio y decidme"; }); await ve(p, "buzon");
      ok(await p.evaluate(() => /ejemplo\.invalid/.test(document.getElementById("zona").textContent) && !document.querySelector('#zona a[href*="ejemplo.invalid"]')), "Buzón: los enlaces de los mensajes salen como texto, sin poder pulsarlos");
      // Auditoría visual: «Nuevo» solo donde se crea algo, pie en una fila, Borrar/Duplicar al final y correos sin partir
      const fabOculto = [];
      for (const h of ["accesos", "textos", "papelera", "cartel", "peticiones"]) { await ve(p, h); if (await p.evaluate(() => document.getElementById("fab").hidden)) fabOculto.push(h); }
      await ve(p, "avisos"); const fabAvisos = await p.evaluate(() => !document.getElementById("fab").hidden);
      ok(fabOculto.length === 5 && fabAvisos, `Visual A6: «Nuevo» oculto en Ajustes, Textos, Papelera, Cartel y Peticiones, y visible en Avisos (${fabOculto})`);
      await p.click('[data-editar-en="avisos:1"]'); await p.waitForTimeout(300);
      const pie = await p.evaluate(() => {
        const c = document.getElementById("ed-cancelar").getBoundingClientRect(), g = document.getElementById("ed-guardar").getBoundingClientRect();
        return { unaFila: Math.abs((c.top + c.bottom) - (g.top + g.bottom)) < 4, enForm: !!document.querySelector("#ed-acciones-form #ed-borrar") && !!document.querySelector("#ed-acciones-form #ed-duplicar"), alto: Math.round(document.querySelector(".ed-pie").getBoundingClientRect().height) };
      });
      ok(pie.unaFila && pie.enForm && pie.alto < 100, `Visual A8: en el móvil, «Cancelar» y «Guardar» en una fila y «Borrar»/«Duplicar» al final del formulario (${JSON.stringify(pie)})`);
      p.respuesta = true; await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      await ve(p, "accesos", 900);
      const lineas = await p.evaluate(() => [...document.querySelectorAll("#lista-admins .correo")].map((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20))));
      ok(lineas.length && lineas.every((n) => n <= 2), `Visual A11: los correos de Ajustes no se parten letra a letra (líneas: ${lineas})`);
      await p.close();
    })().catch((e) => fallos.push("Bloque 9 no ha podido acabar: " + e.message.split("\n")[0]));

    const b2Cerrar = [];
    // ---- 10. Lo que encontró el revisor (10/11): B1, I1–I4 y menores. Cada paso va aparte: si uno falla, los demás siguen ----
    const paso = async (nombre, fn) => {
      p = await pagina(ctx, "revisor-" + nombre);
      p.respuesta = true;
      try { await fn(); } catch (e) { fallos.push(`Revisor ${nombre}: no ha podido acabar (${e.message.split("\n")[0]})`); }
      await p.close().catch(() => {});
    };
    const borrador = (k) => p.evaluate((k) => localStorage.getItem(k), k);
    await (async () => {
      await paso("B1", async () => {
      // B1: plantilla recuperada del borrador sin cambiar los corchetes
      await nuevo(p, "avisos"); await p.click("[data-plantilla]"); await p.waitForTimeout(900);
      p.respuesta = true; await p.reload(); await p.waitForTimeout(600);
      await nuevo(p, "avisos"); await p.click('[data-borrador="si"]'); await p.waitForTimeout(200);
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      ok(/corchetes/.test(await p.textContent("#ed-msg")) && await p.evaluate(() => !__DB.avisos.some((a) => /\[qué pasa\]/.test(a.titulo))), "Revisor B1: una plantilla recuperada del borrador no se publica con [ ] sin cambiar");
      await foto(p, "r-b1-plantilla-borrador");
      await p.fill("#f-titulo", "Turnos [provisional]"); await p.fill("#f-contenido", "Horario del turno [de tarde] cambiado");
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      ok(await p.evaluate(() => __DB.avisos.some((a) => a.titulo === "Turnos [provisional]")), "Revisor B1: corchetes escritos por el padre (no de la plantilla) sí se publican");
      });
      await paso("I1", async () => {
      // I1: sin cobertura con el token caducado no se dice «sesión caducada»
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:2"]'); await p.waitForTimeout(300);
      await p.fill("#f-titulo", "Cambio sin cobertura");
      await p.evaluate(() => { __P.sesionRed = true; });
      await p.click("#ed-guardar"); await p.waitForTimeout(600);
      const mRed = await p.textContent("#ed-msg");
      ok(/No hay conexión/.test(mRed) && !/caducado/.test(mRed) && await p.evaluate(() => !document.getElementById("editor").hidden && document.getElementById("s-entrar").hidden) && (await p.inputValue("#f-titulo")) === "Cambio sin cobertura", `Revisor I1: sin red, «No hay conexión» y el editor sigue con lo escrito (${mRed})`);
      await foto(p, "r-i1-sin-red");
      await p.evaluate(() => { __P.sesionRed = false; });
      });
      await paso("I2-guardar", async () => {
      // I2: conexión colgada al guardar: a los pocos segundos (en la prueba) se desbloquea y se explica
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:2"]'); await p.waitForTimeout(300);
      await p.fill("#f-titulo", "Cambio con la red colgada");
      await p.evaluate(() => { __P.tope = 1200; __P.cuelga = true; });
      await p.click("#ed-guardar"); await p.waitForTimeout(2200);
      const mCol = await p.textContent("#ed-msg");
      ok(await p.evaluate(() => !document.getElementById("ed-guardar").disabled && !document.getElementById("ed-cancelar").disabled) && /no responde/.test(mCol), `Revisor I2: guardado colgado: se desbloquea y lo explica (${mCol})`);
      await foto(p, "r-i2-guardar-colgado");
      await p.evaluate(() => { __P.cuelga = false; }); p.respuesta = true;
      await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      ok(await p.evaluate(() => document.getElementById("editor").hidden), "Revisor I2: después se puede cerrar el editor");
      });
      await paso("I2-aviso", async () => {
      // I2: aviso a los móviles colgado: se cierra y dice que puede haber llegado (no invita a repetir)
      await nuevo(p, "avisos"); await p.$('[data-borrador="no"]').then((x) => x && x.click());
      await p.evaluate(() => { __P.cuelgaAviso = true; __P.tope = 1200; });
      await p.fill("#f-titulo", "Aviso con la red colgada");
      await p.click("#ed-guardar"); await p.waitForTimeout(2400);
      const tCol = (await p.isVisible("#toast")) ? await p.textContent("#toast") : "";
      ok(await p.evaluate(() => document.getElementById("editor").hidden) && /puede que el aviso ya haya llegado/.test(tCol) && !/Deshacer/.test(tCol), `Revisor I2: aviso a los móviles colgado: se dice que puede haber llegado (${tCol})`);
      await foto(p, "r-i2-aviso-colgado");
      await p.evaluate(() => { __P.cuelgaAviso = false; __P.tope = 0; });
      });
      await paso("I3-duplicar", async () => {
      // I3: «Duplicar» no pisa el borrador de algo nuevo
      await nuevo(p, "reuniones"); await p.$('[data-borrador="no"]').then((x) => x && x.click());
      await p.fill("#f-titulo", "BORRADOR IMPORTANTE de una reunión nueva"); await p.waitForTimeout(800);
      await p.reload(); await p.waitForTimeout(600);
      await ve(p, "reuniones"); await p.click('[data-editar-en="reuniones:1"]'); await p.waitForTimeout(300);
      p.dialogos = []; await p.click("#ed-duplicar"); await p.waitForTimeout(400);
      // M3: una copia sin tocar se cierra sin preguntar
      await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      ok(p.dialogos.length === 0 && await p.evaluate(() => document.getElementById("editor").hidden), `Revisor M3: «Duplicar» y «Cancelar» sin cambios no pregunta (${p.dialogos.length})`);
      await ve(p, "reuniones"); await p.click('[data-editar-en="reuniones:1"]'); await p.waitForTimeout(300);
      await p.click("#ed-duplicar"); await p.waitForTimeout(400);
      await p.fill("#f-titulo", "Copia de la reunión"); await p.waitForTimeout(800);
      ok(/BORRADOR IMPORTANTE/.test(await borrador("comite-adm-borrador-reuniones-nuevo") || ""), "Revisor I3: «Duplicar» no machaca el borrador de una reunión nueva");
      p.respuesta = true; await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      });
      await paso("I3-sin-contestar", async () => {
      // I3: escribir sin contestar «Recuperarlo / Descartarlo» no machaca el borrador anterior
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:1"]'); await p.waitForTimeout(300);
      await p.fill("#f-titulo", "Primer borrador del aviso 1"); await p.waitForTimeout(800);
      await p.reload(); await p.waitForTimeout(600);
      await ve(p, "avisos"); await p.click('[data-editar-en="avisos:1"]'); await p.waitForTimeout(300);
      await p.fill("#f-contenido", "Escribo sin contestar"); await p.waitForTimeout(800);
      ok(/Primer borrador del aviso 1/.test(await borrador("comite-adm-borrador-avisos-1") || ""), "Revisor I3: escribir sin contestar al borrador no lo machaca");
      p.respuesta = true; await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      ok(/Primer borrador del aviso 1/.test(await borrador("comite-adm-borrador-avisos-1") || ""), "Revisor I3: cancelar sin contestar tampoco lo borra");
      });
      await paso("I4", async () => {
      // I4: un anuncio oculto que se pone a la vista marca «Volver a avisar»
      await ve(p, "inicio"); await p.evaluate(() => { __DB.actualidad[1].publicado = false; }); await ve(p, "actualidad");
      await p.click('[data-editar-en="actualidad:2"]'); await p.waitForTimeout(300);
      await p.check("#f-publicado"); await p.waitForTimeout(200);
      ok(await p.isChecked("#f-_cambio"), "Revisor I4: anuncio oculto que pasa a verse: se marca «Volver a avisar»");
      await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      });
      await paso("M1-M2", async () => {
      // M1 y M2: «x.constructor» se rechaza y no rompe la tanda; descartar un borrador borra lo que subió
      await nuevo(p, "avisos"); await p.$('[data-borrador="no"]').then((x) => x && x.click());
      await p.setInputFiles("#f-subir", [{ name: "x.constructor", mimeType: "", buffer: Buffer.from("x") }, { name: "bueno.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") }]);
      await p.waitForTimeout(900);
      const adjs = await p.evaluate(() => [...document.querySelectorAll("#ed-form .adj, #ed-form [data-quitar-adj]")].length);
      const tM1 = (await p.isVisible("#toast")) ? await p.textContent("#toast") : "";
      ok(/x\.constructor/.test(tM1) && adjs > 0, `Revisor M1: «x.constructor» se rechaza y el PDF de la misma tanda se sube (${tM1} | ${adjs})`);
      await p.fill("#f-titulo", "Borrador con un PDF"); await p.waitForTimeout(800);
      const ruta = await p.evaluate(() => { const b = JSON.parse(localStorage.getItem("comite-adm-borrador-avisos-nuevo") || "{}"); return (b.adj || [])[0]?.ruta || ""; });
      await p.reload(); await p.waitForTimeout(600);
      await nuevo(p, "avisos"); await p.click('[data-borrador="no"]'); await p.waitForTimeout(400);
      ok(ruta && await p.evaluate((r) => __P.borrados.includes(r), ruta), `Revisor M2: al descartar el borrador se borra del almacén lo que subió (${ruta})`);
      p.respuesta = true; await p.click("#ed-cancelar"); await p.waitForTimeout(300);
      });
      await paso("M7", async () => {
      // M7: el editor con 320 px y letra muy grande tiene margen a los lados
      // Con un navegador en inglés (como el móvil de alguien con el teléfono en otro idioma) la fecha y hora es más ancha
      const b2 = await chromium.launch(); b2Cerrar.push(b2);
      const c3 = await nuevoCtx({ w: 320, h: 640, letra: "muy-grande", nav: b2 }), q = await pagina(c3, "revisor-320");
      await q.goto(BASE + "admin.html#avisos"); await q.waitForTimeout(600);
      await q.click('[data-editar-en="avisos:1"]'); await q.waitForTimeout(400);
      const m = await q.evaluate(() => { const f = document.getElementById("ed-form"), r = document.getElementById("f-titulo").getBoundingClientRect(); return { izq: Math.round(r.left), der: Math.round(innerWidth - r.right), ancho: f.scrollWidth - f.clientWidth }; });
      ok(m.izq >= 10 && m.der >= 10 && m.ancho <= 0, `Revisor M7: a 320 px con letra muy grande, el editor tiene margen a los lados (${JSON.stringify(m)})`);
      await foto(q, "r-m7-editor-320");
      await c3.close();
      });
      await paso("v24", async () => {
      // v24 (lo eligió Lorena, 10/11/2026): lista de avisos con señal pequeña, título como en la web y explicación plegada
      await ve(p, "avisos", 700);
      const l = await p.evaluate(() => ({
        senales: [...document.querySelectorAll("#filas .fila")].map((f) => ({ t: f.querySelector(".fila-abre b").textContent, roja: !!f.querySelector(".mini-senal .senal.roja"), hay: !!f.querySelector(".mini-senal .senal") })),
        mayus: getComputedStyle(document.querySelector("#zona .titulo-vista")).textTransform,
        plegada: document.getElementById("ayuda-lista").classList.contains("plegada"), boton: !document.querySelector("[data-mas-info]").hidden,
      }));
      ok(l.senales.length >= 3 && l.senales.every((x) => x.hay), `v24: cada aviso de la lista lleva su señal (${l.senales.length})`);
      ok(l.senales.find((x) => /Asamblea/.test(x.t))?.roja && !l.senales.find((x) => /programado/.test(x.t))?.roja, "v24: la señal es la de peligro solo en el urgente");
      ok(l.mayus === "none", `v24: el título de la lista no va en mayúsculas (${l.mayus})`);
      ok(l.plegada && l.boton, "v24: la explicación sale plegada, con «Cómo funciona»");
      await p.click("[data-mas-info]");
      ok(await p.evaluate(() => !document.getElementById("ayuda-lista").classList.contains("plegada") && document.querySelector("[data-mas-info]").getAttribute("aria-expanded") === "true"), "v24: «Cómo funciona» abre la explicación");
      // Recuadro «¿Cómo de importante es?» con urgente y destacar_dia dentro, que se guardan igual que antes
      await nuevo(p, "avisos"); await p.$('[data-borrador="no"]').then((x) => x && x.click());
      const g = await p.evaluate(() => { const fs = document.querySelector("#ed-form fieldset.importancia"); return fs ? { leyenda: fs.querySelector("legend").textContent, urg: !!fs.querySelector("#f-urgente"), dia: !!fs.querySelector("#f-destacar_dia"), quitar: !!fs.querySelector('[data-vaciar="destacar_dia"]'), expl: !!fs.querySelector(".casilla-expl") } : null; });
      ok(g && /Cómo de importante es/.test(g.leyenda) && g.urg && g.dia && g.quitar && g.expl, `v24: el editor junta «Urgente» y «Destacar el día» en «¿Cómo de importante es?» (${JSON.stringify(g)})`);
      const dia = await p.evaluate(() => { const d = new Date(Date.now() + 3 * 864e5); return d.toISOString().slice(0, 10); });
      await p.fill("#f-titulo", "Aviso del recuadro v24"); await p.fill("#f-contenido", "Prueba");
      await p.check("#f-urgente"); await p.fill("#f-destacar_dia", dia);
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      const a = await p.evaluate(() => __DB.avisos.find((x) => x.titulo === "Aviso del recuadro v24"));
      ok(a && a.urgente === true && a.destacar_dia === dia, `v24: desde el recuadro se guardan bien urgente y destacar_dia (${JSON.stringify(a && { u: a.urgente, d: a.destacar_dia })})`);
      await p.click(`[data-editar-en="avisos:${a?.id}"]`); await p.waitForTimeout(400);
      await p.uncheck("#f-urgente"); await p.click('[data-vaciar="destacar_dia"]');
      await p.click("#ed-guardar"); await p.waitForTimeout(700);
      const a2 = await p.evaluate((id) => __DB.avisos.find((x) => x.id === id), a?.id);
      ok(a2 && a2.urgente === false && !a2.destacar_dia, `v24: y se quitan bien (${JSON.stringify(a2 && { u: a2.urgente, d: a2.destacar_dia })})`);
      });
    })().catch((e) => fallos.push("Bloque 10 no ha podido acabar: " + e.message.split("\n")[0]));

    // ---- 11. v25 (lo pidió Lorena, 10/11/2026): «Lo pendiente» arriba del Inicio, sin cambiar lo demás ----
    await (async () => {
      const c11 = await nuevoCtx({ w: 1280, h: 900 });
      // Un aviso que se publica solo hoy (dentro de 2 minutos) y una reunión mañana
      await c11.addInitScript(() => { window.__PRE = [(DB) => {
        const en = (min) => new Date(Date.now() + min * 60000).toISOString();
        const d = new Date(Date.now() + 86400000), man = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
        DB.avisos.push({ id: 50, titulo: "Aviso que sale hoy", contenido: "", urgente: false, fecha: en(2), publicar_en: en(2), adjuntos: [], actualizado: en(0) });
        DB.reuniones.push({ id: 50, titulo: "Reunión de mañana", descripcion: "", tipo: "Reunión del comité", fecha: man, hora: "10:00", hora_fin: null, lugar: "Sala", creado: en(0), actualizado: en(0) });
        // Pasadas: una del comité sin acta (sale), otra con su acta redactada 3 días después (no sale)
        // y la «Asamblea de octubre» de los datos de prueba (las asambleas no llevan acta: no sale)
        const dd = (n) => { const x = new Date(Date.now() + n * 86400000); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
        DB.reuniones.push({ id: 51, titulo: "Comité sin acta", descripcion: "", tipo: "Reunión del comité", fecha: dd(-8), hora: "10:00", hora_fin: null, lugar: "Sala", creado: en(0), actualizado: en(0) });
        DB.reuniones.push({ id: 52, titulo: "Comité con acta", descripcion: "", tipo: "Reunión del comité", fecha: dd(-12), hora: "10:00", hora_fin: null, lugar: "Sala", creado: en(0), actualizado: en(0) });
        DB.actas.push({ id: 52, titulo: "Acta del comité", tipo: "Reunión del comité", fecha: dd(-9), resumen: "", acuerdos: "", adjuntos: [], creado: en(0), actualizado: en(0) });
      }]; });
      const q = await pagina(c11, "pendiente");
      await ve(q, "inicio", 800);
      const lp = await q.evaluate(() => { const e = document.getElementById("lo-pendiente"); return e ? { txt: e.textContent, primero: document.getElementById("zona").firstElementChild === e, buzon: !!e.querySelector('a[href="#buzon"]'), acta: !!e.querySelector('[data-nuevo="actas"]'), aviso: !!e.querySelector('[data-editar-en="avisos:50"]'), reu: !!e.querySelector('[data-editar-en="reuniones:50"]'), hola: !!document.querySelector("#zona .hola-bloque"), acciones: document.querySelectorAll("#zona .accion-tarjeta").length } : null; });
      ok(lp && lp.primero, "v25: «Lo pendiente» sale arriba del todo en el Inicio");
      ok(lp && lp.buzon && /1 mensaje del buzón sin leer/.test(lp.txt), `v25: «Lo pendiente» cuenta el buzón sin leer (${lp && lp.txt})`);
      ok(lp && lp.acta && /Falta el acta de «Comité sin acta»/.test(lp.txt), `v25: «Lo pendiente» avisa de la reunión pasada sin acta (${lp && lp.txt})`);
      ok(lp && !/Comité con acta|Asamblea de octubre/.test(lp.txt), "v25: «Lo pendiente» no pide acta de una reunión que ya la tiene (unos días después) ni de una asamblea");
      ok(lp && lp.aviso && /Aviso que sale hoy/.test(lp.txt), "v25: «Lo pendiente» avisa del aviso programado para hoy");
      ok(lp && lp.reu, "v25: «Lo pendiente» avisa de la reunión de mañana");
      ok(lp && lp.hola && lp.acciones >= 5, "v25: el resto del Inicio sigue igual (bloque azul y botones)");
      await foto(q, "v25-lo-pendiente");
      await q.click('#lo-pendiente [data-nuevo="actas"]'); await q.waitForTimeout(400);
      ok(await q.evaluate(() => !document.getElementById("editor").hidden && /acta/i.test(document.getElementById("editor").textContent)), "v25: tocar «Falta el acta» abre «Nueva acta»");
      await q.keyboard.press("Escape"); await q.waitForTimeout(200);
      // Todo al día: sin buzón pendiente, sin reuniones pasadas sin acta
      await q.evaluate(() => { __DB.buzon.forEach((m) => { m.leido = true; }); __DB.reuniones = __DB.reuniones.filter((r) => r.fecha >= new Date().toISOString().slice(0, 10)); __DB.avisos = __DB.avisos.filter((a) => a.id !== 50); __DB.reuniones = __DB.reuniones.filter((r) => r.id !== 50); location.hash = "#avisos"; });
      await q.waitForTimeout(300); await ve(q, "inicio", 700);
      ok(/nada\. Está todo al día/.test(await q.textContent("#lo-pendiente")), "v25: sin nada pendiente, dice que está todo al día");
      await c11.close();
    })().catch((e) => fallos.push("Bloque 11 no ha podido acabar: " + e.message.split("\n")[0]));

    for (const x of b2Cerrar) await x.close().catch(() => {});
    await ctx.close();
  } finally {
    await b.close(); srv.kill();
  }
  const err = [...new Set(errores)];
  console.log("BIEN (" + bien.length + "):\n  " + bien.join("\n  "));
  console.log(err.length ? "ERRORES:\n" + err.join("\n") : "Sin errores de consola.");
  console.log(fallos.length ? "FALLOS (" + fallos.length + "):\n  " + fallos.join("\n  ") : "Sin fallos.");
  process.exit(err.length || fallos.length ? 1 : 0);
})();
