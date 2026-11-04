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
    admins: [{ email: "prueba@example.com" }, { email: "otro@example.com" }],
    visitas: [...Array(20)].map((_, i) => ({ dia: dia(-(i % 14)), seccion: ["total", "avisos", "actualidad", "actas", "app"][i % 5], n: 3 + (i * 7) % 11 })),
    papelera: [{ id: 1, tabla: "avisos", datos: { id: 9, titulo: "Aviso borrado de prueba" }, borrado: hace(4), por: "prueba@example.com" }],
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
      then(ok, ko) { return Promise.resolve(ejecuta()).then(ok, ko); },
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
    functions: { invoke: async (n, o) => ({ data: o?.body?.modo === "prueba" ? { push: { ok: 2, total: 2 } } : { enviado: true, push: { ok: 2, fallos: 0, total: 2 } }, error: null }) },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: (r) => ({ data: { publicUrl: "https://ytxpubqyhnohhugpukdm.supabase.co/" + r } }), remove: async () => ({ error: null }) }) },
  };
  window.supabase = { createClient: () => cliente };
  window.__DB = DB;
})();
