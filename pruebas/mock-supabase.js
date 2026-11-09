// Simulador de supabase-js para las pruebas (sustituye a lib/supabase.js).
// Datos de ejemplo en memoria. Con localStorage «prueba-sesion» = 1, el panel entra como administrador.
(function () {
  const hoy = new Date(), dia = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const hace = (h) => new Date(Date.now() - h * 3600000).toISOString();
  const DB = {
    actualidad: [
      { id: 1, titulo: "Nuevo calendario laboral 2027", contenido: "Ya tenemos el calendario laboral del año que viene.\n\n- 14 festivos\n- **Puente de diciembre** confirmado", categoria: "Calendario", fecha: dia(-1), adjuntos: [{ url: "https://ytxpubqyhnohhugpukdm.supabase.co/x.pdf", nombre: "calendario-2027.pdf", tipo: "application/pdf", tamano: 240000 }], publicado: true, creado: hace(20), actualizado: hace(20) },
      { id: 2, titulo: "Revisión salarial: lo que sabemos", contenido: "Seguimos negociando con la empresa la subida del IPC.", categoria: "Nóminas", fecha: dia(-9), adjuntos: [], publicado: true, creado: hace(220), actualizado: hace(220) },
    ],
    avisos: [
      { id: 1, titulo: "Asamblea de trabajadores el jueves", contenido: "Os convocamos a la asamblea en el comedor a las 14:00. Orden del día: turnos de verano y vestuarios.", urgente: true, fecha: hace(5), publicar_en: null, adjuntos: [], actualizado: hace(5) },
      { id: 2, titulo: "Recordatorio: ropa de trabajo", contenido: "Quien no haya recogido la ropa de invierno, que pase por almacén.", urgente: false, fecha: hace(100), publicar_en: null, adjuntos: [], actualizado: hace(100) },
      { id: 3, titulo: "Aviso programado de prueba", contenido: "Sale mañana.", urgente: false, fecha: new Date(Date.now() + 86400000).toISOString(), publicar_en: new Date(Date.now() + 86400000).toISOString(), adjuntos: [], actualizado: hace(1) },
    ],
    reuniones: [
      { id: 1, titulo: "Reunión mensual del comité", descripcion: "- Turnos de verano\n- Vestuarios", tipo: "Reunión del comité", fecha: dia(3), hora: "10:00", hora_fin: "12:00", lugar: "Sala de reuniones nave 2", creado: hace(30), actualizado: hace(30) },
      { id: 2, titulo: "Reunión con la empresa", descripcion: "", tipo: "Reunión con la empresa", fecha: dia(10), hora: "09:30", hora_fin: null, lugar: "Oficinas", creado: hace(2), actualizado: hace(2) },
      { id: 3, titulo: "Asamblea de octubre", descripcion: "", tipo: "Asamblea", fecha: dia(-20), hora: "14:00", hora_fin: null, lugar: "Comedor", creado: hace(600), actualizado: hace(600) },
    ],
    actas: [
      { id: 1, titulo: "Reunión con la empresa de octubre", tipo: "Reunión con la empresa", fecha: dia(-15), resumen: "Se habló de los turnos y de la ropa de trabajo.", acuerdos: "- Turnos de verano: se mantienen\n- Ropa nueva antes de diciembre", adjuntos: [], creado: hace(300), actualizado: hace(300) },
      { id: 2, titulo: "Comité de septiembre", tipo: "Reunión del comité", fecha: "2025-09-12", resumen: "Preparación de la negociación.", acuerdos: "", adjuntos: [], creado: hace(1500), actualizado: hace(1500) },
    ],
    preguntas: [{ id: 1, pregunta: "¿Cuántos días de asuntos propios tenemos?", respuesta: "Según el convenio, **2 días** al año.", orden: 10, creado: hace(500), actualizado: hace(500) }],
    miembros: [
      { id: 1, nombre: "Ana García", cargo: "Presidente/a", sindicato: "CCOO", detalle: "Turno de mañana", telefono: "600000000", email: null, orden: 10, foto: { url: "https://ytxpubqyhnohhugpukdm.supabase.co/storage/v1/object/public/documentos/miembros/prueba.webp", ruta: "miembros/prueba.webp" } },
      { id: 2, nombre: "Jordi Puig", cargo: "Secretario/a", sindicato: "UGT", detalle: "", telefono: null, email: "jordi@ejemplo.com", orden: 20 },
    ],
    encuestas: [{ id: 1, pregunta: "¿Preferís jornada intensiva en verano?", opciones: "Sí\nNo\nMe da igual", explicacion: "Lo llevaremos a la reunión con la empresa.", publicada: true, cierra: dia(7), creado: hace(10), actualizado: hace(10) }],
    encuesta_votos: [{ encuesta_id: 1, opcion: 1, n: 24 }, { encuesta_id: 1, opcion: 2, n: 9 }, { encuesta_id: 1, opcion: 3, n: 4 }],
    documentos: [
      { id: 1, titulo: "Convenio de transporte de mercancías de Girona", categoria: "Convenio", descripcion: "Texto completo publicado en el BOP.", adjuntos: [{ url: "https://ytxpubqyhnohhugpukdm.supabase.co/c.pdf", nombre: "convenio.pdf", tipo: "application/pdf", tamano: 1300000 }], enlace: null, orden: 10, creado: hace(800), actualizado: hace(800) },
      { id: 2, titulo: "Tablas salariales 2026", categoria: "Salarios", descripcion: "", adjuntos: [], enlace: "https://example.com", orden: 10, creado: hace(3), actualizado: hace(3) },
    ],
    buzon: [
      { id: 1, tipo: "Pregunta", texto: "¿Cuándo se cobra la paga de beneficios?", dia: dia(-1), leido: false, archivado: false },
      { id: 2, tipo: "Sugerencia", texto: "Estaría bien poner más taquillas en el vestuario.", dia: dia(-3), leido: true, archivado: false },
    ],
    paginas: [
      { slug: "bienvenida", contenido: "Información del comité de empresa para toda la plantilla." },
      { slug: "nosotros", contenido: "El comité de empresa representa a toda la plantilla de Calsina Carré." },
      { slug: "privacidad", contenido: "Esta web es solo informativa." },
    ],
    apartados: [
      { id: 1, titulo: "Salud laboral", descripcion: "Riesgos, EPIs y revisiones médicas.", icono: "salud", orden: 10, visible: true, padre_id: null, creado: hace(300), actualizado: hace(300) },
      { id: 2, titulo: "Revisiones médicas", descripcion: "Fechas y cómo pedir cita.", icono: "calendario", orden: 10, visible: true, padre_id: 1, creado: hace(200), actualizado: hace(200) },
      { id: 3, titulo: "Formación", descripcion: "", icono: "acta", orden: 20, visible: false, padre_id: null, creado: hace(100), actualizado: hace(100) },
    ],
    publicaciones: [
      { id: 1, apartado_id: 1, titulo: "Nuevos guantes anticorte en el almacén", contenido: "Ya se pueden pedir en almacén.\n\n- Talla M, L y XL\n- **Obligatorios** en la zona de carga", fecha: dia(-2), adjuntos: [], publicado: true, notificar: true, notificado: true, creado: hace(30), actualizado: hace(30) },
      { id: 2, apartado_id: 2, titulo: "Revisión médica anual: del 10 al 20", contenido: "Pide cita en la oficina.", fecha: dia(-5), adjuntos: [], publicado: true, notificar: true, notificado: true, creado: hace(120), actualizado: hace(120) },
    ],
    admins: [{ email: "prueba@example.com" }, { email: "otro@example.com" }],
    visitas: [...Array(20)].map((_, i) => ({ dia: dia(-(i % 14)), seccion: ["total", "avisos", "actualidad", "actas", "app"][i % 5], n: 3 + (i * 7) % 11 })),
    papelera: [{ id: 1, tabla: "avisos", datos: { id: 9, titulo: "Aviso borrado de prueba" }, borrado: hace(4), por: "prueba@example.com" }],
    // Pedir un cambio a Claude: una de cada estado que enseña algo distinto
    peticiones_claude: [
      { id: 6, creado: hace(5), texto: "Poner las reuniones en otro color.", adjuntos: [], estado: "en_curso", respuesta: null, deshacer: null, version: null, propuesta: null, decision: null, ficha: null,
        mensajes: [{ quien: "claude", cuando: hace(1), texto: "¿De qué color las quieres?", opciones: ["Verde", "Rojo"] }] },
      { id: 5, creado: hace(3), texto: "Que el botón del buzón salga más grande en el móvil.", adjuntos: [], estado: "en_curso", respuesta: null, mensajes: [{ quien: "claude", cuando: hace(2), texto: "Recibido. Lo estoy preparando: te enseño cómo queda en un rato." }], deshacer: null, version: null, propuesta: null, decision: null, ficha: null },
      { id: 4, creado: hace(26), texto: "En la portada, que los avisos urgentes salgan antes que las reuniones.\nY que se vea la fecha.", adjuntos: [{ nombre: "portada.jpg", url: "https://ytxpubqyhnohhugpukdm.supabase.co/storage/v1/object/public/peticiones/1-portada.jpg", tipo: "image/jpeg", tamano: 180000 }],
        estado: "lista", respuesta: "Hecho. Mira las capturas y dime si se publica.", deshacer: null, version: 13, propuesta: hace(1), decision: null,
        mensajes: [{ quien: "padre", cuando: hace(25), texto: "Y que la fecha salga en negrita.", adjuntos: [] }, { quien: "claude", cuando: hace(1), texto: "Ya está. Te dejo dos capturas: en el móvil y en el ordenador (versión 13).", adjuntos: [{ nombre: "captura-movil.jpg", url: "https://ytxpubqyhnohhugpukdm.supabase.co/storage/v1/object/public/peticiones/2-movil.jpg", tipo: "image/jpeg" }] }],
        ficha: { titulo: "Avisos urgentes antes que las reuniones", entendido: "Que en la portada los avisos urgentes salgan arriba de las reuniones, con la fecha en negrita.", hecho: ["Los avisos urgentes salen los primeros en la portada.", "La fecha de cada aviso sale en negrita."], capturas: [{ url: "https://ytxpubqyhnohhugpukdm.supabase.co/storage/v1/object/public/peticiones/3-pc.jpg", texto: "En el ordenador" }] } },
      { id: 3, creado: hace(80), texto: "Poner el teléfono de todos los trabajadores en la web.", adjuntos: [], estado: "no_hecha", respuesta: "No lo he hecho: la web no puede llevar datos personales de los trabajadores.", mensajes: [], deshacer: null, version: null, propuesta: null, decision: null, ficha: null },
      { id: 7, creado: hace(40), texto: "Que el pie de la web diga el horario del comité.", adjuntos: [], estado: "lista", respuesta: "Hecho.", mensajes: [], deshacer: null, version: 17, propuesta: hace(30), decision: null, ficha: { titulo: "Horario del comité en el pie", hecho: ["Horario en el pie."], capturas: [], visto_bueno_lorena: hace(10) } },
      { id: 2, creado: hace(200), texto: "Cambiar el color de los botones de la portada.", adjuntos: [], estado: "publicada", respuesta: "Publicado.", mensajes: [], deshacer: null, version: 12, propuesta: hace(190), decision: "publicar", ficha: { titulo: "Botones de la portada en azul", entendido: "Botones de la portada en el azul del comité.", hecho: ["Botones en azul."], capturas: [] } },
      { id: 1, creado: hace(400), texto: "Quitar el cartel de la portada.", adjuntos: [], estado: "descartada", respuesta: "Descartada por el panel.", mensajes: [], deshacer: null, version: null, propuesta: hace(390), decision: "descartar", ficha: null },
    ],
    peticiones_estado: [{ id: 1, pausa: false }],
    push_admin: [],
  };
  // Con «?prueba-vacio» en la dirección, la web arranca sin contenido (para ver los apartados vacíos)
  if (/prueba-vacio/.test(location.search)) ["actualidad", "avisos", "reuniones", "actas", "preguntas", "miembros", "encuestas", "encuesta_votos", "documentos"].forEach((t) => { DB[t] = []; });
  let sig = 100;
  const SES = (() => { try { return localStorage.getItem("prueba-sesion") === "1"; } catch (_) { return false; } })()
    ? { access_token: "x", user: { id: "u1", email: "prueba@example.com" } } : null;

  const consulta = (tabla) => {
    let filtros = [], orden = [], lim = null, modo = "select", datos = null, cuenta = false, solo = false, uno = false;
    const q = {
      select(_c, o) { if (o?.count) cuenta = true; if (o?.head) solo = true; return q; },
      eq(c, v) { filtros.push((r) => r[c] === v); return q; },
      gt(c, v) { filtros.push((r) => r[c] != null && r[c] > v); return q; },
      gte(c, v) { filtros.push((r) => r[c] >= v); return q; },
      lte(c, v) { filtros.push((r) => r[c] <= v); return q; },
      order(c, o = {}) { orden.push([c, o.ascending !== false]); return q; },
      limit(n) { lim = n; return q; },
      maybeSingle() { uno = true; return q; },
      single() { uno = true; return q; },
      insert(v) { modo = "insert"; datos = v; return q; },
      update(v) { modo = "update"; datos = v; return q; },
      upsert(v) { modo = "upsert"; datos = v; return q; },
      delete() { modo = "delete"; return q; },
      // Ganchos de las pruebas: window.__TARDA (ms de espera: red lenta) y window.__FALLA (sin red)
      then(ok, ko) { const t = window.__TARDA || 0; return new Promise((r) => setTimeout(r, t)).then(() => window.__FALLA ? { data: null, error: { message: "TypeError: Failed to fetch" } } : ejecuta()).then(ok, ko); },
    };
    const ejecuta = () => {
      const T = (DB[tabla] ||= []);
      if (modo === "insert") { const nuevos = [].concat(datos).map((d) => ({ id: sig++, creado: new Date().toISOString(), ...d })); T.push(...nuevos); return { data: uno ? nuevos[0] : nuevos, error: null }; }
      if (modo === "upsert") { [].concat(datos).forEach((d) => { const i = T.findIndex((r) => r.slug === d.slug); if (i >= 0) T[i] = { ...T[i], ...d }; else T.push(d); }); return { data: null, error: null }; }
      const casa = (r) => filtros.every((f) => f(r));
      if (modo === "update") { T.filter(casa).forEach((r) => Object.assign(r, datos)); return { data: null, error: null }; }
      if (modo === "delete") { DB[tabla] = T.filter((r) => !casa(r)); return { data: null, error: null }; }
      let r = T.filter(casa);
      orden.slice().reverse().forEach(([c, asc]) => { r = r.slice().sort((a, b) => (a[c] ?? "") < (b[c] ?? "") ? (asc ? -1 : 1) : (a[c] ?? "") > (b[c] ?? "") ? (asc ? 1 : -1) : 0); });
      if (lim) r = r.slice(0, lim);
      const out = JSON.parse(JSON.stringify(r));
      return { data: solo ? null : uno ? out[0] || null : out, count: cuenta ? r.length : null, error: null };
    };
    return q;
  };
  const cliente = {
    from: consulta,
    rpc: async (n, a) => {
      if (n === "is_admin") return { data: !!SES, error: null };
      if (n === "contar_suscritos") return { data: 2, error: null };
      if (n === "clave_push_publica") return { data: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U", error: null };
      if (n === "enviar_buzon") { if ((a.p_texto || "").length < 5) return { data: null, error: { message: "El mensaje es demasiado corto." } }; DB.buzon.push({ id: sig++, tipo: a.p_tipo, texto: a.p_texto, dia: new Date().toISOString().slice(0, 10), leido: false, archivado: false }); return { data: "ok", error: null }; }
      if (n === "votar_encuesta") { const v = DB.encuesta_votos.find((x) => x.encuesta_id === a.p_id && x.opcion === a.p_opcion); if (v) v.n++; else DB.encuesta_votos.push({ encuesta_id: a.p_id, opcion: a.p_opcion, n: 1 }); return { data: "ok", error: null }; }
      const pet = (id) => DB.peticiones_claude.find((x) => x.id === id);
      if (n === "anadir_a_peticion") { const x = pet(a.p_id); if (!x) return { data: "no", error: null }; (x.mensajes ||= []).push({ quien: "padre", cuando: new Date().toISOString(), texto: a.p_texto, adjuntos: a.p_adjuntos || [] }); if (x.estado !== "en_curso") x.estado = "nueva"; return { data: "ok", error: null }; }
      if (n === "pasar_a_lorena") { const x = pet(a.p_id); if (!x) return { data: "no_existe", error: null }; if (x.pasada_lorena) return { data: "ya", error: null }; x.pasada_lorena = new Date().toISOString(); x.oculta_padre = null; (x.mensajes ||= []).push({ quien: "padre", cuando: x.pasada_lorena, texto: "Se la he pasado a Lorena: que la siga ella.", aviso: true }); return { data: "ok", error: null }; }
      if (n === "quitar_de_mi_lista") { const x = pet(a.p_id); if (!x) return { data: "no_existe", error: null }; x.oculta_padre = a.p_quitar ? new Date().toISOString() : null; return { data: "ok", error: null }; }
      if (n === "pedir_lorena") { const x = pet(a.p_id); if (!x) return { data: "no", error: null }; if (x.avisar_lorena) return { data: "ya", error: null }; x.avisar_lorena = new Date().toISOString(); (x.mensajes ||= []).push({ quien: "padre", cuando: x.avisar_lorena, texto: "Has pedido que lo mire Lorena.", aviso: true }); return { data: "ok", error: null }; }
      if (n === "deshacer_peticion") { const x = pet(a.p_id); if (!x || x.estado !== "publicada") return { data: "no_publicada", error: null }; if (x.deshacer) return { data: "ya", error: null }; x.deshacer = new Date().toISOString(); return { data: "ok", error: null }; }
      if (n === "decidir_peticion") { const x = pet(a.p_id); if (!x || x.estado !== "lista" || !x.propuesta || x.decision) return { data: "no_propuesta", error: null }; x.decision = a.p_decision; x.decision_el = new Date().toISOString(); if (a.p_decision === "descartar") x.estado = "descartada"; return { data: "ok", error: null }; }
      if (n === "suscribir_push_admin") { DB.push_admin.push({ endpoint: a.p_endpoint }); return { data: "ok", error: null }; }
      if (n === "desuscribir_push_admin") { DB.push_admin = DB.push_admin.filter((x) => x.endpoint !== a.p_endpoint); return { data: "ok", error: null }; }
      if (n === "push_admin_activo") return { data: DB.push_admin.some((x) => x.endpoint === a.p_endpoint), error: null };
      if (n === "recuperar_borrado") { const p = DB.papelera.find((x) => x.id === a.p_id); DB.papelera = DB.papelera.filter((x) => x !== p); DB[p.tabla].push(p.datos); return { data: p.tabla, error: null }; }
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: SES }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: null, error: { message: "Invalid login credentials" } }),
      signOut: async () => ({ error: null }), signUp: async () => ({ data: {}, error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }),
        listFactors: async () => ({ data: { totp: [], all: [] }, error: null }),
        enroll: async () => ({ data: { id: "f1", totp: { qr_code: "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>", secret: "JBSWY3DPEHPK3PXP" } }, error: null }),
        challengeAndVerify: async () => ({ data: {}, error: null }), unenroll: async () => ({ data: {}, error: null }),
      }, verifyOtp: async () => ({ error: null }), updateUser: async () => ({ error: null }),
    },
    functions: { invoke: async (n, o) => {
      const b = o?.body || {};
      if (n === "generar-acta") { window.__IA = b; return { data: { acta: { titulo: "Reunión del comité de noviembre", tipo: "Reunión del comité", fecha: "2026-11-03", resumen: "Se habló de los turnos de verano y de la ropa de trabajo." + (/\[PERSONA 1\]/.test(b.notas) ? " [PERSONA 1] pidió la jornada intensiva." : ""), acuerdos: "- Pedir a la empresa la jornada intensiva\n- Revisar los vestuarios", avisos: "" } }, error: null }; }
      if (n === "timbre") { (window.__TIMBRE ||= []).push(b); return { data: { ok: true }, error: null }; }
      if (n === "cuenta") {
        if (b.accion === "estado") return { data: { quedan: 0, cuentas: { "prueba@example.com": true, "otro@example.com": false } }, error: null };
        if (b.accion === "codigos") return { data: { codigos: ["ABCDE-23456", "FGHJK-78923", "LMNPQ-45678", "RSTUV-92345", "WXYZA-56789", "BCDEF-34567", "GHJKL-89234", "MNPQR-67893"] }, error: null };
        if (b.accion === "poner_clave") { window.__CLAVE = b; return { data: { ok: true, creada: true }, error: null }; }
        if (b.accion === "usar_codigo") return { data: { ok: true, quedan: 7 }, error: null };
      }
      return { data: b.modo === "prueba" ? { push: { ok: 2, total: 2 } } : { enviado: true, push: { ok: 2, fallos: 0, total: 2 } }, error: null };
    } },
    storage: { from: (bucket) => ({ upload: async (ruta, f) => { (window.__SUBIDOS ||= []).push({ bucket, ruta, tipo: f?.type, tamano: f?.size }); return { error: null }; }, getPublicUrl: (r) => ({ data: { publicUrl: "https://ytxpubqyhnohhugpukdm.supabase.co/storage/v1/object/public/" + bucket + "/" + r } }), remove: async () => ({ error: null }) }) },
  };
  window.supabase = { createClient: () => cliente };
  window.__DB = DB;
  // window.__PRE = [(DB) => …]: cambia los datos antes de que la página los pida
  try { (window.__PRE || []).forEach((f) => f(DB)); } catch (e) { console.log("PRE", e); }
})();
