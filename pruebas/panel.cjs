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
  const P = window.__P = { caducada: false, sinRed: false, falloAviso: false, esperaAviso: 0, sesion: true, entra: false, blobs: [], authCb: null };
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
    if (n === "notificar" && P.esperaAviso) await new Promise((r) => setTimeout(r, P.esperaAviso));
    return inv0(n, o);
  };
  const st0 = c.storage.from;
  c.storage.from = (b) => { const s = st0(b), up = s.upload; s.upload = async (ruta, f, op) => { if (P.sinRed) return { error: { message: "Failed to fetch" } }; P.blobs.push({ ruta, f, tipo: op && op.contentType }); return up(ruta, f, op); }; return s; };
  const gs = c.auth.getSession;
  c.auth.getSession = async () => P.sesion ? gs() : { data: { session: null }, error: null };
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
    const ctx = await b.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, colorScheme: o.oscuro ? "dark" : "light", serviceWorkers: "block", locale: "es-ES", timezoneId: "Europe/Madrid", acceptDownloads: true });
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
      for (const [nombre, o] of [["320-muy-grande", { w: 320, h: 700, letra: "muy-grande" }], ["320-oscuro-muy-grande", { w: 320, h: 700, letra: "muy-grande", oscuro: true }]]) {
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
      await nuevo(p, "avisos");
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
      await nuevo(p, "avisos"); await p.click('[data-borrador="no"]').catch(() => {});
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
