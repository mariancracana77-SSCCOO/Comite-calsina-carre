// Panel de publicación del comité. Misma forma de trabajar que el panel de CCOO:
// menú a la izquierda (PC) o barra abajo + botón «Nuevo» (móvil), portada «Hola»,
// editor en ventana con vista previa, papelera para recuperar lo borrado.
(function () {
  const $ = (id) => document.getElementById(id);
  const PANEL_URL = WEB_URL + "admin.html";
  const TIPOS_REUNION = ["Reunión del comité", "Reunión con la empresa", "Asamblea", "Otra"];
  const ahoraISO = () => new Date().toISOString();

  // ================== QUÉ SE PUEDE PUBLICAR ==================
  // Campo: [columna, etiqueta, tipo, opciones]
  // Tipos: texto, largo (con Negrita/Lista), fecha, hora, fechahora, si, opcion, numero, tel, email, url, archivos, nota
  const diaCorto = (d) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
  const destacaTxt = (x) => !x.destacar_dia || x.destacar_dia < hoyISO() ? "" : x.destacar_dia === hoyISO() ? "Destacado hoy" : "Destacado el " + diaCorto(x.destacar_dia);
  const SECCIONES = {
    avisos: {
      nombre: "Avisos", uno: "aviso", nuevo: "Nuevo aviso", ic: "megafono", tabla: "avisos", ancla: "aviso",
      orden: [["fecha", false]],
      ayuda: "Lo importante que hay que destacar: huelga, festivo, elecciones, último día para entregar algo… Si marcas «Urgente», sale destacado arriba en la portada durante 14 días. Con «Destacar en la portada el día» sale arriba solo ese día y llega «DESTACADO HOY» a los móviles. Para información general sin destacar, usa «Info general» (anuncios).",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Cambio de turnos en noviembre" }],
        ["contenido", "Texto del aviso", "largo"],
        ["urgente", "Urgente: destacarlo arriba en la portada", "si", { def: false }],
        ["destacar_dia", "Destacar en la portada el día (opcional)", "fecha", { quitar: "Quitar el destacado", ayuda: "El aviso se ve como siempre y ese día (de 0:00 a 23:59) sale en rojo arriba del todo en la portada. Ese día, a partir de las 8 de la mañana, llega «DESTACADO HOY» a los móviles con avisos." }],
        ["adjuntos", "Archivos adjuntos", "archivos"],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
        ["publicar_en", "Programar para más tarde (opcional)", "fechahora", { ayuda: "Déjalo vacío para publicarlo ya. Si pones día y hora, no se verá hasta entonces." }],
      ],
      chips: (x) => [x.urgente && "Urgente", destacaTxt(x), x.publicar_en && x.publicar_en > ahoraISO() && "Programado"],
      sub: (x) => resumen(x.contenido),
      previa: (x) => R.aviso(x),
      alGuardar: (v, orig) => {
        if (v.publicar_en && (!orig || orig.publicar_en !== v.publicar_en)) v.fecha = v.publicar_en; else if (!orig) v.fecha = ahoraISO();
        // Día destacado: ese día la tarea manda «DESTACADO HOY» una vez. Si cambia el día, se vuelve a avisar.
        // Si es un aviso nuevo destacado hoy y ya avisa al publicar, no se manda dos veces.
        if (!orig || orig.destacar_dia !== v.destacar_dia)
          v.destacado_avisado = !orig && v.destacar_dia === hoyISO() && !!v.notificar && !(v.publicar_en && v.publicar_en > ahoraISO());
      },
    },
    actualidad: {
      nombre: "Info general", uno: "anuncio", nuevo: "Nuevo anuncio", ic: "periodico", tabla: "actualidad", ancla: "noticia",
      orden: [["fecha", false], ["id", false]],
      ayuda: "Anuncios: información general para toda la plantilla, sin destacar. Por ejemplo: «Desde mañana el turno 3 tiene 25 minutos de pausa en vez de 20». Salen en la portada. Si es algo importante que hay que destacar (huelga, festivo, elecciones), usa mejor «Avisos».",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: El turno 3 pasa a 25 minutos de pausa" }],
        ["categoria", "Categoría", "texto", { lista: ["General", "Acuerdos del comité", "Turnos y horarios", "Convenio", "Nóminas", "Salud laboral", "Vacaciones", "Formación", "Igualdad"], def: "General" }],
        ["fecha", "Fecha", "fecha", { def: () => hoyISO(), req: true }],
        ["contenido", "Texto", "largo"],
        ["adjuntos", "Fotos y documentos", "archivos"],
        ["publicado", "Se ve en la web", "si", { def: true }],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      chips: (x) => [x.categoria !== "General" && x.categoria, !x.publicado && "Oculta"],
      sub: (x) => resumen(x.contenido),
      previa: (x) => R.noticia(x),
    },
    reuniones: {
      nombre: "Reuniones", uno: "reunión", nuevo: "Nueva reunión", ic: "calendario", tabla: "reuniones", ancla: "reunion",
      orden: [["fecha", false]],
      ayuda: "El calendario de reuniones. La próxima sale en la portada con los días que faltan. Para una reunión que se repite, ábrela y pulsa «Duplicar».",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Reunión mensual del comité" }],
        ["tipo", "Tipo", "opcion", { lista: TIPOS_REUNION, def: TIPOS_REUNION[0] }],
        ["fecha", "Día", "fecha", { req: true }],
        ["hora", "Hora de inicio (opcional)", "hora"],
        ["hora_fin", "Hora de fin (opcional)", "hora"],
        ["lugar", "Lugar", "texto", { ph: "Ej.: Sala de reuniones de la nave 2" }],
        ["descripcion", "Orden del día o detalles", "largo"],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      chips: (x) => [x.tipo, x.fecha < hoyISO() && "Pasada"],
      sub: (x) => fechaSemana(x.fecha) + " de " + x.fecha.slice(0, 4) + (x.hora ? " · " + horario(x) : "") + (x.lugar ? " · " + x.lugar : ""),
      previa: (x) => R.reunion(x),
      alDuplicar: (v) => { v.fecha = ""; },
    },
    actas: {
      nombre: "Actas", uno: "acta", nuevo: "Nueva acta", ic: "acta", tabla: "actas", ancla: "acta",
      orden: [["fecha", false]],
      ayuda: "Resumen y acuerdos de cada reunión. Puedes adjuntar el acta completa en PDF o fotos de las hojas. Al crear una nueva, el asistente la redacta a partir de una foto de tus notas.",
      asistente: true,
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Reunión con la empresa de octubre" }],
        ["tipo", "Tipo de reunión", "opcion", { lista: TIPOS_REUNION, def: TIPOS_REUNION[0] }],
        ["fecha", "Fecha de la reunión", "fecha", { req: true, def: () => hoyISO() }],
        ["resumen", "Resumen", "largo"],
        ["acuerdos", "Acuerdos", "largo", { ayuda: "Un acuerdo por línea, empezando con «- » (o pulsa «Lista»)." }],
        ["adjuntos", "Acta en PDF, fotos u otros documentos", "archivos"],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      chips: (x) => [x.tipo, (x.adjuntos || []).length && x.adjuntos.length + " archivo" + (x.adjuntos.length > 1 ? "s" : "")],
      sub: (x) => fechaLarga(x.fecha),
      previa: (x) => R.acta(x),
    },
    encuestas: {
      nombre: "Consultas", uno: "consulta", nuevo: "Nueva consulta", ic: "grafica", tabla: "encuestas", ancla: "consulta",
      orden: [["creado", false]],
      ayuda: "Pregunta a la plantilla y que voten de forma anónima (un voto por móvil). Salen en la portada mientras estén abiertas.",
      campos: [
        ["pregunta", "Pregunta", "texto", { req: true, ph: "Ej.: ¿Preferís jornada intensiva en verano?" }],
        ["opciones", "Opciones (una por línea, de 2 a 8)", "largo", { req: true, ph: "Sí\nNo\nMe da igual", sinFormato: true }],
        ["explicacion", "Explicación (opcional)", "largo"],
        ["cierra", "Último día para votar (opcional)", "fecha"],
        ["publicada", "Se ve en la web", "si", { def: true }],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      titulo: (x) => x.pregunta,
      chips: (x) => [!R.abierta(x) ? "Cerrada" : "Abierta", !x.publicada && "Oculta", VOTOS[x.id] && totalVotos(x.id) + (totalVotos(x.id) === 1 ? " voto" : " votos")],
      sub: (x) => x.cierra ? "Se cierra el " + fechaLarga(x.cierra) : "Sin fecha de cierre",
      previa: (x, orig) => R.consulta({ id: 0, ...x }, orig ? VOTOS[orig.id] || {} : {}, 0, !!orig),
      validar: (v) => { const n = R.opciones(v).length; return n < 2 ? "Pon al menos 2 opciones, una por línea." : n > 8 ? "Máximo 8 opciones." : ""; },
      avisoEditar: "Si cambias el orden de las opciones de una consulta con votos, los votos se quedan con el número de opción (no con el texto).",
    },
    preguntas: {
      nombre: "Preguntas frecuentes", uno: "pregunta", nuevo: "Nueva pregunta", ic: "ayuda", tabla: "preguntas",
      orden: [["orden", true], ["id", true]], ordenable: true,
      ayuda: "Salen en «Sugerencias y preguntas». Desde el buzón puedes convertir una pregunta en pregunta frecuente.",
      campos: [
        ["pregunta", "Pregunta", "texto", { req: true }],
        ["respuesta", "Respuesta", "largo"],
      ],
      titulo: (x) => x.pregunta,
      chips: (x) => [!x.respuesta && "Sin respuesta"],
      sub: (x) => resumen(x.respuesta),
      previa: (x) => R.pregunta(x, true),
      verWeb: () => "buzon",
    },
    miembros: {
      nombre: "Miembros del comité", uno: "miembro", nuevo: "Nuevo miembro", ic: "personas", tabla: "miembros",
      orden: [["orden", true], ["id", true]], ordenable: true,
      ayuda: "Quién forma el comité (sale en «Nosotros»). Pon teléfono o email solo si esa persona está de acuerdo.",
      campos: [
        ["nombre", "Nombre", "texto", { req: true }],
        ["cargo", "Cargo", "texto", { lista: ["Presidente/a", "Secretario/a", "Miembro del comité", "Delegado/a de prevención"], def: "Miembro del comité" }],
        ["sindicato", "Sindicato (opcional)", "texto"],
        ["detalle", "Detalle (centro, turno, de qué se ocupa…)", "texto"],
        ["nota1", "Teléfono y email: solo si esa persona ha dado su permiso para que salgan en la web.", "nota"],
        ["telefono", "Teléfono", "tel"],
        ["email", "Email", "email"],
        ["foto", "Foto (opcional, solo si da su permiso)", "foto"],
      ],
      titulo: (x) => x.nombre,
      chips: (x) => [x.sindicato],
      sub: (x) => x.cargo,
      previa: (x) => R.miembro(x),
      verWeb: () => "nosotros",
    },
    documentos: {
      nombre: "Documentos", uno: "documento", nuevo: "Nuevo documento", ic: "documento", tabla: "documentos", ancla: "documento",
      orden: [["categoria", true], ["orden", true], ["id", true]], ordenable: true,
      ayuda: "Convenio, calendario laboral, tablas salariales, formularios… Salen en «Actas» → «Documentos útiles», agrupados por categoría.",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Convenio de transporte de mercancías" }],
        ["categoria", "Categoría", "texto", { lista: ["Convenio", "Calendario laboral", "Salarios", "Formularios", "Salud laboral", "Igualdad", "General"], def: "General" }],
        ["descripcion", "Explicación (opcional)", "largo"],
        ["adjuntos", "Archivos", "archivos"],
        ["enlace", "Enlace a una web (opcional)", "url", { ph: "https://…" }],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      chips: (x) => [x.categoria, (x.adjuntos || []).length && x.adjuntos.length + " archivo" + (x.adjuntos.length > 1 ? "s" : "")],
      sub: (x) => resumen(x.descripcion),
      previa: (x) => R.documento(x),
    },
  };

  // ================== SECCIONES PROPIAS (v11) ==================
  // El padre crea sus secciones (y subsecciones, un nivel) y publica dentro. APS: todas, para las listas desplegables.
  let APS = [];
  const cargaAps = async () => { const { data } = await sb.from("apartados").select("id, titulo, padre_id, orden, visible").order("orden").order("id"); APS = data || []; return APS; };
  const nombreAp = (id) => { const a = APS.find((x) => x.id === id); if (!a) return "Sección borrada"; const p = a.padre_id && APS.find((x) => x.id === a.padre_id); return (p ? p.titulo + " › " : "") + a.titulo; };
  // Secciones en orden: cada principal seguida de sus subsecciones
  const apsEnOrden = (lista) => { const out = []; lista.filter((a) => !a.padre_id || !lista.some((p) => p.id === a.padre_id)).forEach((a) => { out.push(a); lista.filter((h) => h.padre_id === a.id).forEach((h) => out.push(h)); }); return out; };
  const ICONOS_SECCION = [["carpeta", "Carpeta"], ["documento", "Documento"], ["periodico", "Periódico"], ["megafono", "Megáfono"], ["calendario", "Calendario"],
    ["acta", "Hoja"], ["euro", "Dinero"], ["salud", "Salud"], ["escudo", "Seguridad"], ["reloj", "Reloj"], ["personas", "Personas"], ["mensaje", "Mensaje"],
    ["lugar", "Lugar"], ["telefono", "Teléfono"], ["campana", "Campana"], ["ayuda", "Ayuda"], ["alerta", "Alerta"], ["grafica", "Gráfica"], ["archivo", "Caja"]];
  Object.assign(SECCIONES, {
    apartados: {
      nombre: "Secciones", uno: "sección", nuevo: "Nueva sección", ic: "carpeta", tabla: "apartados", ancla: "seccion",
      orden: [["orden", true], ["id", true]], ordenable: true,
      ayuda: "Crea tus propias secciones para la web (por ejemplo «Salud laboral», «Vacaciones» o «Formación»). Las principales salen como pestañas arriba y en la portada. Una subsección va dentro de otra sección. Luego publica dentro desde «Publicar en secciones».",
      campos: [
        ["titulo", "Nombre de la sección", "texto", { req: true, ph: "Ej.: Salud laboral" }],
        ["padre_id", "¿Dónde va?", "opcion", { num: true, lista: (orig) => [["", "Es una sección principal (sale como pestaña)"], ...APS.filter((a) => !a.padre_id && a.id !== orig?.id).map((a) => [a.id, "Dentro de «" + a.titulo + "» (subsección)"])], ayuda: "Una subsección sale dentro de la sección que elijas." }],
        ["descripcion", "Explicación corta (opcional)", "largo", { ayuda: "Sale debajo del nombre. Por ejemplo: «Riesgos, EPIs y revisiones médicas»." }],
        ["icono", "Dibujo", "opcion", { lista: ICONOS_SECCION, def: "carpeta" }],
        ["visible", "Se ve en la web", "si", { def: true, ayuda: "Si la quitas, la sección y lo que tiene dentro dejan de verse, pero no se borra nada." }],
      ],
      validar: (v) => v.padre_id && ED?.orig && APS.some((a) => a.padre_id === ED.orig.id) ? "Esta sección tiene subsecciones dentro: no puede ir dentro de otra." : "",
      chips: (x) => [x.padre_id ? "Dentro de «" + nombreAp(x.padre_id) + "»" : "Principal", !x.visible && "Oculta"],
      sub: (x) => resumen(x.descripcion),
      previa: (x) => R.seccion({ ...x, id: x.id || 0 }) + `<p class="nota-campo">${x.padre_id ? "Así sale dentro de su sección." : "Así sale. Además, sale como pestaña arriba y en los accesos de la portada."}</p>`,
      alGuardar: (v) => { if (!ED.orig) v.orden = (Math.max(0, ...APS.filter((a) => (a.padre_id || null) === (v.padre_id || null)).map((a) => a.orden || 0)) || 0) + 10; },
      antes: cargaAps,
    },
    publicaciones: {
      nombre: "Publicar en secciones", uno: "publicación", nuevo: "Nueva publicación", ic: "documento", tabla: "publicaciones", ancla: "publicacion",
      orden: [["fecha", false], ["id", false]],
      ayuda: "Lo que publicas dentro de tus secciones. Elige en qué sección va. Si todavía no tienes secciones, créalas primero en «Secciones».",
      campos: [
        ["apartado_id", "Sección", "opcion", { num: true, req: true, lista: () => apsEnOrden(APS).map((a) => [a.id, nombreAp(a.id) + (a.visible ? "" : " (oculta)")]) }],
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Revisión médica anual" }],
        ["fecha", "Fecha", "fecha", { def: () => hoyISO(), req: true }],
        ["contenido", "Texto", "largo"],
        ["adjuntos", "Fotos y documentos", "archivos"],
        ["publicado", "Se ve en la web", "si", { def: true }],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
      ],
      validar: (v) => !APS.length ? "Primero crea una sección en «Secciones»." : !v.apartado_id ? "Elige en qué sección va." : "",
      chips: (x) => [nombreAp(x.apartado_id), !x.publicado && "Oculta"],
      sub: (x) => resumen(x.contenido),
      previa: (x) => R.publicacion(x),
      antes: cargaAps,
    },
  });

  // ================== MENÚ ==================
  const MENU = [
    [null, [["inicio", "Inicio", "inicio"], ["avisos"], ["actualidad"], ["reuniones"], ["actas"]]],
    ["La plantilla", [["buzon", "Buzón anónimo", "mensaje"], ["encuestas"], ["preguntas"]]],
    ["Tus secciones", [["apartados"], ["publicaciones"]]],
    ["El comité", [["miembros", "Miembros", "personas"], ["documentos"], ["textos", "Textos de la web", "texto"]]],
    ["Herramientas", [["cartel", "Cartel con QR", "qr"], ["papelera", "Papelera", "borrar"], ["accesos", "Ajustes", "candado"]]],
  ];
  const BARRA = [["inicio", "Inicio", "inicio"], ["avisos"], ["reuniones"], ["actas"]];
  const nombreDe = (k, n) => n || SECCIONES[k]?.nombre || k;
  const icDe = (k, i) => i || SECCIONES[k]?.ic || "documento";

  // ================== UTILIDADES ==================
  const resumen = (t, n = 110) => { t = String(t || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  let toastT;
  const avisa = (txt, mal = false) => {
    const a = $("toast");
    a.textContent = txt; a.className = "toast" + (mal ? " mal" : ""); a.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { a.hidden = true; }, 3800);
  };
  const errTxt = (e) => {
    const m = String(e?.message || e || "");
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "No hay conexión. Prueba de nuevo.";
    if (/row-level security|permission denied|No tienes permiso/i.test(m)) return "No tienes permiso para hacer esto.";
    if (/Invalid login credentials/i.test(m)) return "Email o contraseña incorrectos. Si no la recuerdas, abre «¿Problemas para entrar?».";
    if (/Email not confirmed/i.test(m)) return "Todavía no has confirmado el email: abre el enlace que te enviamos.";
    if (/User already registered/i.test(m)) return "Esta cuenta ya existe. Entra con tu contraseña o pulsa «He olvidado la contraseña».";
    if (/no está autorizado|Database error saving new user/i.test(m)) return "Este email no está autorizado para el panel.";
    if (/Password should be at least|weak/i.test(m)) return "La contraseña es demasiado corta o fácil.";
    if (/Token has expired|invalid/i.test(m)) return "El código no es válido o ha caducado. Pide otro email.";
    if (/rate limit|security purposes/i.test(m)) return "Demasiados intentos seguidos. Espera unos minutos.";
    return m || "Ha fallado algo. Prueba de nuevo.";
  };
  const estado = (el, txt, tipo = "") => { el.textContent = txt; el.className = "estado" + (tipo ? " " + tipo : ""); };
  const ponIconos = (raiz = document) => raiz.querySelectorAll("[data-ic]").forEach((s) => { if (!s.firstChild) s.innerHTML = icono(s.dataset.ic); });
  const tituloDe = (S, x) => (S.titulo ? S.titulo(x) : x.titulo) || "Sin título";

  // ---- Cabecera ----
  const pintaTema = () => { $("b-tema").innerHTML = icono(TEMA.oscuro() ? "sol" : "luna"); };
  pintaTema();
  $("b-tema").addEventListener("click", () => { TEMA.cambiaTema(); pintaTema(); });
  $("b-letra").addEventListener("click", () => TEMA.cambiaLetra());
  $("b-ver-web").innerHTML = icono("ojo");
  $("ed-cerrar").innerHTML = icono("cerrar");
  ponIconos();

  // ================== SESIÓN ==================
  const PANTALLAS = ["s-entrar", "s-codigo", "s-rescate", "s-nueva", "s-sinpermiso", "s-dos-pasos", "s-panel"];
  const muestra = (id) => PANTALLAS.forEach((p) => { $(p).hidden = p !== id; });
  let recuperando = /type=recovery/.test(location.hash), YO = "";
  try { $("e-email").value = TEMA.lee("comite-admin-email") || ""; } catch (_) {}

  const entrar = async () => {
    if (recuperando) { muestra("s-nueva"); return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { muestra("s-entrar"); return; }
    YO = session.user.email || "";
    // Si tiene activada la verificación en dos pasos, pide el código antes de entrar
    const { data: nivel } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (nivel && nivel.nextLevel === "aal2" && nivel.currentLevel !== "aal2") { muestra("s-dos-pasos"); $("d-codigo").value = ""; $("d-codigo").focus(); return; }
    const { data: esAdmin, error } = await sb.rpc("is_admin");
    if (error || !esAdmin) { muestra("s-sinpermiso"); return; }
    muestra("s-panel");
    pintaMenu();
    irA(location.hash.slice(1) || "inicio");
  };
  sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") { recuperando = true; muestra("s-nueva"); } });

  $("f-entrar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("e-estado"), email = $("e-email").value.trim();
    estado(est, "Entrando…");
    const { error } = await sb.auth.signInWithPassword({ email, password: $("e-clave").value });
    if (error) {
      if (/Invalid login credentials/i.test(error.message)) {
        $("f-entrar").querySelector(".problemas").open = true;
        return estado(est, "Email o contraseña incorrectos. Ojo: la cuenta del comité es distinta de la de CCOO, con su propia contraseña. Si no la recuerdas, pide a otro administrador que te la ponga desde Ajustes, o usa un código de rescate.", "mal");
      }
      return estado(est, errTxt(error), "mal");
    }
    TEMA.guarda("comite-admin-email", email);
    estado(est, ""); entrar();
  });
  $("b-primera").addEventListener("click", async () => {
    const est = $("e-estado"), email = $("e-email").value.trim(), clave = $("e-clave").value;
    if (!email) return estado(est, "Escribe arriba tu email y la contraseña que quieres usar (10 o más, con letras y números) y vuelve a pulsar «Primera vez».", "mal");
    if (claveFlojaTxt(clave)) return estado(est, claveFlojaTxt(clave) + " Escríbela arriba y vuelve a pulsar «Primera vez».", "mal");
    estado(est, "Creando la cuenta…");
    const { data, error } = await sb.auth.signUp({ email, password: clave, options: { emailRedirectTo: PANEL_URL } });
    if (error) return estado(est, errTxt(error), "mal");
    TEMA.guarda("comite-admin-email", email);
    if (data.session) { estado(est, ""); entrar(); return; }
    estado(est, "Te hemos enviado un email. Ábrelo y pulsa el botón para confirmar; después ya puedes entrar.", "bien");
  });
  const pideCodigo = async (enviar) => {
    const est = $("e-estado"), email = $("e-email").value.trim();
    if (!email) return estado(est, "Escribe tu email arriba y vuelve a pulsar.", "mal");
    if (enviar) {
      estado(est, "Enviando el email…");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: PANEL_URL });
      if (error) return estado(est, errTxt(error), "mal");
    }
    estado(est, "");
    $("codigo-email").textContent = email;
    muestra("s-codigo");
    $("c-codigo").focus();
  };
  $("b-olvido").addEventListener("click", () => pideCodigo(true));
  $("b-rescate").addEventListener("click", () => { $("r-email").value = $("e-email").value.trim(); muestra("s-rescate"); $("r-codigo").focus(); });
  $("b-rescate-volver").addEventListener("click", () => muestra("s-entrar"));
  $("f-rescate").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("r-estado"), email = $("r-email").value.trim().toLowerCase(), clave = $("r-nueva").value;
    if (!email) return estado(est, "Escribe tu email.", "mal");
    if (claveFlojaTxt(clave)) return estado(est, claveFlojaTxt(clave), "mal");
    if (clave !== $("r-repite").value) return estado(est, "Las dos contraseñas no son iguales.", "mal");
    estado(est, "Comprobando el código…");
    const { data, error } = await sb.functions.invoke("cuenta", { body: { accion: "usar_codigo", email, codigo: $("r-codigo").value, clave } });
    const msg = data?.error || (error && (await error.context?.json?.().catch(() => null))?.error);
    if (error || !data?.ok) return estado(est, msg || "No se ha podido. Prueba otra vez.", "mal");
    const r = await sb.auth.signInWithPassword({ email, password: clave });
    if (r.error) return estado(est, errTxt(r.error), "mal");
    TEMA.guarda("comite-admin-email", email);
    avisa(`Contraseña cambiada. Te quedan ${data.quedan} códigos de rescate.`); entrar();
  });
  $("b-tengo-codigo").addEventListener("click", () => pideCodigo(false));
  $("b-codigo-volver").addEventListener("click", () => muestra("s-entrar"));
  $("f-codigo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("c-estado"), codigo = $("c-codigo").value.replace(/\D/g, ""), nueva = $("c-nueva").value;
    if (codigo.length < 6) return estado(est, "Escribe el código que trae el email.", "mal");
    if (claveFlojaTxt(nueva)) return estado(est, claveFlojaTxt(nueva), "mal");
    if (nueva !== $("c-repite").value) return estado(est, "Las dos contraseñas no son iguales.", "mal");
    estado(est, "Comprobando el código…");
    const { error } = await sb.auth.verifyOtp({ email: $("codigo-email").textContent, token: codigo, type: "recovery" });
    if (error) return estado(est, errTxt(error), "mal");
    const r = await sb.auth.updateUser({ password: nueva });
    if (r.error) return estado(est, errTxt(r.error), "mal");
    avisa("Contraseña guardada"); entrar();
  });
  $("f-nueva").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("n-estado"), clave = $("n-clave").value;
    if (claveFlojaTxt(clave)) return estado(est, claveFlojaTxt(clave), "mal");
    const { error } = await sb.auth.updateUser({ password: clave });
    if (error) return estado(est, errTxt(error), "mal");
    recuperando = false; history.replaceState(null, "", "admin.html"); avisa("Contraseña guardada"); entrar();
  });
  // Contraseña segura: 10 o más caracteres, con letras y números
  const claveFlojaTxt = (c) => c.length < 10 ? "La contraseña necesita 10 caracteres o más." : !/[a-zñ]/i.test(c) || !/\d/.test(c) ? "La contraseña tiene que llevar letras y números." : "";
  const salir = async () => { await sb.auth.signOut(); history.replaceState(null, "", "admin.html"); location.reload(); };
  $("b-salir-sp").addEventListener("click", salir);
  $("b-dos-salir").addEventListener("click", salir);
  $("f-dos-pasos").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("d-estado"), code = $("d-codigo").value.replace(/\D/g, "");
    if (code.length !== 6) return estado(est, "Escribe las 6 cifras que salen en la app de códigos.", "mal");
    estado(est, "Comprobando…");
    const { data: f } = await sb.auth.mfa.listFactors();
    const totp = (f?.totp || [])[0];
    if (!totp) return estado(est, "No hay ninguna verificación en dos pasos activada en esta cuenta.", "mal");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    if (error) return estado(est, /invalid|expired/i.test(error.message) ? "Código incorrecto o caducado. Espera al siguiente y prueba otra vez." : errTxt(error), "mal");
    estado(est, ""); entrar();
  });

  // ================== MENÚ Y NAVEGACIÓN ==================
  let actual = "inicio", PEND_BUZON = 0;
  const enlaceMenu = ([k, n, i]) =>
    `<a href="#${k}" data-ir="${k}">${icono(icDe(k, i))}<span>${esc(nombreDe(k, n))}</span>${k === "buzon" ? '<b class="cuenta" data-cuenta-buzon hidden></b>' : ""}</a>`;
  const pintaMenu = () => {
    $("menu").innerHTML = MENU.map(([grupo, items]) =>
      `<div class="menu-grupo">${grupo ? `<p class="menu-titulo">${esc(grupo)}</p>` : ""}${items.map(enlaceMenu).join("")}</div>`).join("")
      + `<div class="menu-pie"><p>${esc(YO)}<br>Versión ${esc(VERSION_WEB)}</p>
          <button type="button" class="menu-btn" data-instalar hidden>${icono("instalar")}<span>Instalar la app</span></button>
          <a class="menu-btn" href="guia.html" target="_blank" rel="noopener">${icono("ayuda")}<span>Guía del panel</span></a>
          <button type="button" class="menu-btn" data-salir>${icono("salir")}<span>Salir</span></button></div>`;
    $("barra-movil").innerHTML = BARRA.map(enlaceMenu).join("")
      + `<button type="button" data-mas>${icono("puntos")}<span>Más</span><b class="cuenta" data-cuenta-buzon hidden></b></button>`;
    $("fab").innerHTML = icono("mas") + "<span>Nuevo</span>";
    cuentaBuzon();
    if (pideInstalar) document.querySelectorAll("[data-instalar]").forEach((b) => { b.hidden = false; });
  };
  const marcaMenu = (k) => document.querySelectorAll("[data-ir]").forEach((a) => {
    const s = a.dataset.ir === k; a.classList.toggle("activa", s);
    if (s) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const PAGINAS = {
    inicio: () => pintaInicio(), buzon: () => pintaBuzon(), textos: () => pintaTextos(),
    accesos: () => pintaAccesos(), papelera: () => pintaPapelera(), cartel: () => pintaCartel(),
  };
  let IR_COPIA = false; // «#accesos-copia»: Ajustes, bajando hasta la copia de seguridad
  const irA = (k) => {
    IR_COPIA = k === "accesos-copia"; if (IR_COPIA) k = "accesos";
    cargaAps().then(() => {}, () => {});
    if (!PAGINAS[k] && !SECCIONES[k]) k = "inicio";
    actual = k;
    if (location.hash.slice(1) !== k) history.replaceState(null, "", "#" + k);
    marcaMenu(k);
    cierraHoja();
    window.scrollTo(0, 0);
    $("zona").innerHTML = '<div class="esq"></div><div class="esq"></div>';
    (PAGINAS[k] || (() => pintaLista(k)))();
  };
  window.addEventListener("hashchange", () => { if (!$("s-panel").hidden) irA(location.hash.slice(1)); });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-salir]")) { salir(); return; }
    if (e.target.closest("[data-mas]")) { abreHojaMas(); return; }
    if (e.target.closest("[data-instalar]")) { instalar(); return; }
    const n = e.target.closest("[data-nuevo]");
    if (n) { cierraHoja(); nuevoEn(n.dataset.nuevo); }
  });
  // Antes de crear, carga lo que haga falta (las secciones). Sin secciones, no se puede publicar en ellas: lleva a crear una.
  const nuevoEn = async (k) => {
    await SECCIONES[k].antes?.().catch?.(() => {});
    if (k === "publicaciones" && !APS.length) { avisa("Primero crea una sección. Luego podrás publicar dentro."); location.hash = "apartados"; setTimeout(() => abrirEditor("apartados", null), 300); return; }
    abrirEditor(k, null);
  };
  $("fab").addEventListener("click", () => {
    // En una sección, «Nuevo» crea directamente; en las demás páginas, pregunta qué
    if (SECCIONES[actual]) nuevoEn(actual); else abreHojaNuevo();
  });

  // ---- Hoja de abajo (móvil) ----
  const abreHoja = (titulo, html) => {
    $("hoja").innerHTML = `<div class="hoja-cab"><h2 id="hoja-titulo">${esc(titulo)}</h2><button type="button" class="btn-ic" data-cerrar-hoja aria-label="Cerrar">${icono("cerrar")}</button></div>${html}`;
    $("hoja").hidden = false; $("velo-hoja").hidden = false;
    $("hoja").querySelector("a, button:not([data-cerrar-hoja])")?.focus();
  };
  const cierraHoja = () => { $("hoja").hidden = true; $("velo-hoja").hidden = true; };
  $("velo-hoja").addEventListener("click", cierraHoja);
  $("hoja").addEventListener("click", (e) => { if (e.target.closest("[data-cerrar-hoja], [data-ir]")) cierraHoja(); });
  const abreHojaMas = () => abreHoja("Más secciones", `<div class="hoja-lista">${MENU.map(([g, items]) =>
    `${g ? `<p class="menu-titulo">${esc(g)}</p>` : ""}${items.filter(([k]) => !BARRA.some((b) => b[0] === k)).map(enlaceMenu).join("")}`).join("")}
    <a class="menu-btn" href="guia.html" target="_blank" rel="noopener">${icono("ayuda")}<span>Guía del panel</span></a>
    <button type="button" class="menu-btn" data-salir>${icono("salir")}<span>Salir</span></button></div>`) || cuentaBuzon();
  const ACCIONES = [
    ["avisos", "Publicar un aviso", "Algo importante que destacar"],
    ["reuniones", "Añadir una reunión", "Comité, empresa o asamblea"],
    ["actas", "Subir un acta", "Resumen, acuerdos y PDF"],
    ["actualidad", "Escribir un anuncio", "Información general, sin destacar"],
    ["encuestas", "Hacer una consulta", "Votación anónima"],
    ["documentos", "Subir un documento", "Convenio, calendario, tablas…"],
    ["publicaciones", "Publicar en tus secciones", "Dentro de las secciones que has creado"],
    ["apartados", "Crear una sección", "Una pestaña nueva en la web"],
  ];
  const abreHojaNuevo = () => abreHoja("¿Qué quieres publicar?", `<div class="hoja-lista">${ACCIONES.map(([k, t, s]) =>
    `<button type="button" class="accion-fila" data-nuevo="${k}">${icono(SECCIONES[k].ic)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`).join("")}</div>`);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("editor").hidden) { cerrarEditor(); return; }
    if (!$("hoja").hidden) cierraHoja();
  });

  // ================== INICIO ==================
  const pintaInicio = async () => {
    const hoy = hoyISO(), en14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const [reu, prog, ult, buz] = await Promise.all([
      sb.from("reuniones").select("*").gte("fecha", hoy).lte("fecha", en14).order("fecha"),
      sb.from("avisos").select("*").gt("publicar_en", ahoraISO()).order("publicar_en"),
      Promise.all(["avisos", "actualidad", "reuniones", "actas", "encuestas", "documentos", "publicaciones"].map((t) =>
        sb.from(t).select("*").order(t === "avisos" ? "fecha" : "creado", { ascending: false }).limit(4).then((r) => (r.data || []).map((x) => ({ ...x, _t: t }))))),
      sb.from("buzon").select("id", { count: "exact", head: true }).eq("leido", false).eq("archivado", false),
      cargaAps().catch(() => {}),
    ]);
    if (actual !== "inicio") return;
    PEND_BUZON = buz.count || 0; marcaCuentaBuzon();
    const fechaDe = (x) => x._t === "avisos" ? x.fecha : x.creado;
    const ultimos = ult.flat().sort((a, b) => String(fechaDe(b)).localeCompare(String(fechaDe(a)))).slice(0, 8);
    const hora = new Date().getHours();
    $("zona").innerHTML = `
      <section class="hola-bloque">
        <div class="hola-txt">
          <p class="hola-fecha">${esc((() => { const t = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); })())}</p>
          <h1 class="hola">${hora < 14 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches"}</h1>
          <p>¿Qué quieres publicar hoy?</p>
        </div>
        <div class="hola-resumen">
          <a href="#buzon" class="hola-dato${PEND_BUZON ? " aviso" : ""}">${icono("mensaje")}<b>${PEND_BUZON}</b><span>${PEND_BUZON === 1 ? "mensaje sin leer" : "mensajes sin leer"}</span></a>
          ${(() => { const r = (reu.data || [])[0]; if (!r) return `<a href="#reuniones" class="hola-dato">${icono("calendario")}<b>–</b><span>sin reuniones en 14 días</span></a>`;
            const dias = Math.round((fechaDia(r.fecha) - fechaDia(hoyISO())) / 86400000);
            return `<button type="button" class="hola-dato" data-editar-en="reuniones:${r.id}">${icono("calendario")}<b>${dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : dias + " días"}</b><span>${esc(r.titulo)}</span></button>`; })()}
          <span class="hola-dato">${icono("campana")}<b id="hola-moviles">…</b><span>móviles con avisos</span></span>
        </div>
      </section>
      <div id="recordatorio-copia"></div>
      <div class="acciones-inicio">
        ${ACCIONES.map(([k, t, s]) => `<button type="button" class="accion-tarjeta" data-nuevo="${k}">${icono(SECCIONES[k].ic)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`).join("")}
        <a class="accion-tarjeta${PEND_BUZON ? " destaca" : ""}" href="#buzon">${icono("mensaje")}<span><b>Leer el buzón</b><small>${PEND_BUZON ? PEND_BUZON + (PEND_BUZON === 1 ? " mensaje sin leer" : " mensajes sin leer") : "No hay mensajes nuevos"}</small></span></a>
        <a class="accion-tarjeta" href="#cartel">${icono("qr")}<span><b>Cartel con QR</b><small>Para el tablón de anuncios</small></span></a>
        <a class="accion-tarjeta" href="guia.html" target="_blank" rel="noopener">${icono("ayuda")}<span><b>Guía del panel</b><small>Cómo se hace cada cosa, con fotos</small></span></a>
      </div>
      <div class="tarjeta instalar-panel" data-instalar-tarjeta hidden>
        ${icono("instalar")}<span><b>Instala la app en tu móvil</b><small>Tendrás la web y el panel a un toque, con el logo en la pantalla de inicio.</small></span>
        <button type="button" class="btn" data-instalar>${icono("instalar")}Instalar</button>
      </div>
      <div class="inicio-dos">
        <section>
          <div class="bloque-cab"><h2 class="titulo-bloque">Próximos 14 días</h2><a href="#reuniones">Ver reuniones</a></div>
          ${(reu.data || []).length ? `<div class="tarjeta lista-corta">${reu.data.map((r) => {
            const d = fechaDia(r.fecha);
            return `<button type="button" class="fila-corta" data-editar-en="reuniones:${r.id}"><span class="dia mini"><b>${d.getDate()}</b><span>${d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span></span>
              <span><b>${esc(r.titulo)}</b><small>${esc(fechaSemana(r.fecha))}${r.hora ? " · " + esc(horario(r)) : ""}${r.lugar ? " · " + esc(r.lugar) : ""}</small></span>${icono("flecha")}</button>`;
          }).join("")}</div>` : `<p class="vacio">No hay reuniones en los próximos 14 días. <button type="button" class="btn-texto" data-nuevo="reuniones">Añadir una</button></p>`}
        </section>
        <section>
          <div class="bloque-cab"><h2 class="titulo-bloque">Avisos programados</h2></div>
          ${(prog.data || []).length ? `<div class="tarjeta lista-corta">${prog.data.map((a) =>
            `<button type="button" class="fila-corta" data-editar-en="avisos:${a.id}">${icono("reloj")}<span><b>${esc(a.titulo)}</b><small>Se publica el ${esc(new Date(a.publicar_en).toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}</small></span>${icono("flecha")}</button>`).join("")}</div>`
            : '<p class="vacio">No hay avisos programados. Al crear un aviso puedes elegir día y hora para que se publique solo.</p>'}
        </section>
      </div>
      <div class="tarjeta push-panel">
        ${icono("campana")}<span><b>Avisos al móvil</b><small id="push-cuenta">Contando móviles apuntados…</small></span>
        <button type="button" class="btn-linea" id="b-push-prueba">${icono("campana")}Mandar un aviso de prueba</button>
      </div>
      <h2 class="titulo-bloque">Lo último que has publicado</h2>
      <div class="lista">${ultimos.map((x) => filaHTML(x._t, x, true)).join("") || '<p class="vacio">Todavía no has publicado nada. Empieza con uno de los botones de arriba.</p>'}</div>
      <details class="estadisticas" id="det-est">
        <summary>${icono("grafica")}Visitas y estadísticas <small>Toca para ver</small></summary>
        <div id="est-cuerpo"><div class="esq"></div></div>
      </details>`;
    // Recordatorio de la copia de seguridad (si nunca se ha hecho o hace más de un mes)
    sb.from("paginas").select("contenido").eq("slug", "ultima_copia").maybeSingle().then(({ data }) => {
      const f = data?.contenido, r = $("recordatorio-copia");
      if (!r || (f && Date.now() - new Date(f) < 31 * 86400000)) return;
      r.innerHTML = `<a class="tarjeta instalar-panel aviso-copia" href="#accesos-copia">${icono("archivo")}<span><b>${f ? "Hace más de un mes de la última copia de seguridad" : "Todavía no has hecho ninguna copia de seguridad"}</b><small>Toca aquí y pulsa «Descargar copia con archivos». Tarda un momento.</small></span>${icono("flecha")}</a>`;
    }, () => {});
    if (pideInstalar) document.querySelectorAll("[data-instalar-tarjeta]").forEach((b) => { b.hidden = false; });
    sb.rpc("contar_suscritos").then(({ data, error }) => {
      if ($("hola-moviles")) $("hola-moviles").textContent = error ? "–" : (data || 0);
      if (!$("push-cuenta")) return;
      $("push-cuenta").textContent = error ? "No se ha podido contar." : data === 1 ? "1 móvil tiene los avisos activados." : `${data || 0} móviles tienen los avisos activados.`;
    });
    $("b-push-prueba").addEventListener("click", async () => {
      if (!confirm("Se mandará «Prueba de avisos» a TODOS los móviles apuntados. ¿Seguro?")) return;
      try {
        const { data, error } = await sb.functions.invoke("notificar", { body: { modo: "prueba" } });
        if (error) throw error;
        avisa(`Prueba enviada a ${data.push.ok} de ${data.push.total} móviles`);
      } catch (_) { avisa("No se ha podido mandar la prueba.", true); }
    });
    $("det-est").addEventListener("toggle", (e) => { if (e.target.open) pintaEstadisticas(); TEMA.guarda("comite-adm-est", e.target.open ? "1" : ""); });
    if (TEMA.lee("comite-adm-est") === "1") $("det-est").open = true;
  };

  // ---- Estadísticas: visitas de los últimos 30 días ----
  const NOMBRE_SECCION = { actualidad: "Info general", secciones: "Tus secciones", avisos: "Avisos", reuniones: "Reuniones", actas: "Actas", documentos: "Documentos", buzon: "Sugerencias y preguntas", nosotros: "Nosotros", buscar: "Buscador" };
  const pintaEstadisticas = async () => {
    const desde = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const [{ data, error }, sus] = await Promise.all([sb.from("visitas").select("*").gte("dia", desde), sb.rpc("contar_suscritos")]);
    if (!$("est-cuerpo")) return;
    if (error) { $("est-cuerpo").innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    const suma = (f) => data.filter(f).reduce((a, x) => a + x.n, 0);
    const total = suma((x) => x.seccion === "total"), app = suma((x) => x.seccion === "app");
    const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const dias = [...Array(14)].map((_, i) => { const d = new Date(Date.now() - (13 - i) * 86400000); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); });
    const porDia = dias.map((d) => suma((x) => x.seccion === "total" && x.dia === d)), max = Math.max(1, ...porDia);
    const secciones = Object.keys(NOMBRE_SECCION).map((k) => [NOMBRE_SECCION[k], suma((x) => x.seccion === k)]).sort((a, b) => b[1] - a[1]);
    const maxS = Math.max(1, ...secciones.map((x) => x[1]));
    $("est-cuerpo").innerHTML = `
      <div class="cifras">
        <div><b>${suma((x) => x.seccion === "total" && x.dia >= hace7)}</b><span>visitas en 7 días</span></div>
        <div><b>${total}</b><span>visitas en 30 días</span></div>
        <div><b>${app}</b><span>desde la app instalada (30 días)</span></div>
        <div><b>${sus.data ?? "–"}</b><span>móviles con avisos</span></div>
      </div>
      <h3 class="est-titulo">Visitas por día (últimas 2 semanas)</h3>
      <div class="barras" role="img" aria-label="Visitas por día: ${porDia.join(", ")}">${dias.map((d, i) => `<div class="barra" title="${esc(fechaSemana(d))}: ${porDia[i]}"><i style="height:${Math.round(porDia[i] * 100 / max)}%"></i><span>${fechaDia(d).getDate()}</span></div>`).join("")}</div>
      <h3 class="est-titulo">Lo más visto (30 días)</h3>
      <div class="ranking">${secciones.map(([n, v]) => `<div class="rk-fila"><span>${esc(n)}</span><div class="cons-barra"><i style="width:${Math.round(v * 100 / maxS)}%"></i></div><b>${v}</b></div>`).join("")}</div>
      <p class="ayuda">Cada móvil cuenta una visita al día, y una por apartado cada vez que abre la web. No se guarda quién entra. Las visitas de quien usa el panel no cuentan.</p>`;
  };

  // ================== LISTAS ==================
  let FILAS = [], VOTOS = {};
  const totalVotos = (id) => Object.values(VOTOS[id] || {}).reduce((a, b) => a + b, 0);
  const filaHTML = (k, x, conSeccion = false) => {
    const S = SECCIONES[k];
    const chips = [conSeccion && S.nombre, ...(S.chips ? S.chips(x) : [])].filter(Boolean);
    const sub = S.sub ? S.sub(x) : "";
    return `<div class="tarjeta fila${k === "avisos" && (x.urgente || x.destacar_dia === hoyISO()) ? " urgente" : ""}${k === "apartados" && x.padre_id && !conSeccion ? " fila-hija" : ""}">
      <button type="button" class="fila-abre" data-editar-en="${k}:${x.id}">
        <b>${esc(tituloDe(S, x))}</b>
        ${sub ? `<span class="fila-sub">${esc(sub)}</span>` : ""}
        ${chips.length ? `<span class="chips-fila">${chips.map((c) => `<span class="chip-p">${esc(c)}</span>`).join("")}</span>` : ""}
      </button>
      ${!conSeccion && S.ordenable ? `<span class="orden-btns">
        <button type="button" class="btn-ic peq" data-mover="${x.id}:-1" aria-label="Subir «${esc(tituloDe(S, x))}»">${icono("subirOrden")}</button>
        <button type="button" class="btn-ic peq" data-mover="${x.id}:1" aria-label="Bajar «${esc(tituloDe(S, x))}»">${icono("bajarOrden")}</button></span>` : `<span class="fila-flecha">${icono("flecha")}</span>`}
    </div>`;
  };
  const pintaLista = async (k) => {
    const S = SECCIONES[k];
    $("zona").innerHTML = `<div class="cab-seccion"><h1 class="titulo-vista">${esc(S.nombre)}</h1>
      <button type="button" class="btn solo-pc" data-nuevo="${k}">${icono("mas")}${esc(S.nuevo)}</button></div>
      <p class="sub-vista">${esc(S.ayuda)}</p>
      <label class="buscador"><span class="sr-only">Buscar en ${esc(S.nombre)}</span><input type="search" id="filtro" placeholder="Buscar en ${esc(S.nombre.toLowerCase())}" autocomplete="off"></label>
      <div class="lista" id="filas"><div class="esq"></div></div>`;
    await S.antes?.();
    let q = sb.from(S.tabla).select("*");
    S.orden.forEach(([c, asc]) => { q = q.order(c, { ascending: asc }); });
    const [r, v] = await Promise.all([q, k === "encuestas" ? sb.from("encuesta_votos").select("*") : Promise.resolve({ data: null })]);
    if (actual !== k) return;
    if (r.error) { $("filas").innerHTML = `<p class="vacio">${esc(errTxt(r.error))}</p>`; return; }
    if (v.data) { VOTOS = {}; v.data.forEach((x) => { (VOTOS[x.encuesta_id] ||= {})[x.opcion] = x.n; }); }
    FILAS = k === "apartados" ? apsEnOrden(r.data) : r.data;
    const pinta = () => {
      const t = $("filtro").value.trim().toLowerCase();
      const lista = t ? FILAS.filter((x) => JSON.stringify(x).toLowerCase().includes(t)) : FILAS;
      $("filas").innerHTML = lista.map((x) => filaHTML(k, x)).join("")
        || (t ? '<p class="vacio">No hay nada con esas palabras.</p>' : `<p class="vacio">Todavía no hay nada. Pulsa «${esc(S.nuevo)}».</p>`);
    };
    $("filtro").addEventListener("input", pinta);
    pinta();
  };
  $("zona").addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-editar-en]");
    if (ed) {
      const [k, id] = ed.dataset.editarEn.split(":");
      let x = FILAS.find((y) => String(y.id) === id && actual === k);
      if (!x) { const r = await sb.from(SECCIONES[k].tabla).select("*").eq("id", id).maybeSingle(); x = r.data; }
      if (k === "encuestas" && x) { const v = await sb.from("encuesta_votos").select("*").eq("encuesta_id", x.id); VOTOS[x.id] = {}; (v.data || []).forEach((r) => { VOTOS[x.id][r.opcion] = r.n; }); }
      if (x) abrirEditor(k, x); else avisa("Ya no existe: puede que lo hayan borrado.", true);
      return;
    }
    const mv = e.target.closest("[data-mover]");
    if (mv) {
      const [id, dir] = mv.dataset.mover.split(":").map(Number), S = SECCIONES[actual];
      // Solo se mueve dentro de su grupo (en documentos, la misma categoría)
      const yo = FILAS.find((y) => y.id === id);
      const grupo = actual === "documentos" ? FILAS.filter((x) => x.categoria === yo.categoria) : actual === "apartados" ? FILAS.filter((x) => (x.padre_id || null) === (yo.padre_id || null)) : FILAS;
      const i = grupo.findIndex((x) => x.id === id), j = i + dir;
      if (j < 0 || j >= grupo.length) return;
      [grupo[i], grupo[j]] = [grupo[j], grupo[i]];
      const res = await Promise.all(grupo.map((x, n) => sb.from(S.tabla).update({ orden: (n + 1) * 10 }).eq("id", x.id)));
      const err = res.find((r) => r.error);
      if (err) return avisa(errTxt(err.error), true);
      avisa("Orden cambiado"); pintaLista(actual);
    }
  });

  // ================== EDITOR ==================
  let ED = null; // { k, orig, adj: [], subidos: [], quitados: [], sucio }
  const aLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  const campoHTML = ([col, etq, tipo, o = {}], val) => {
    const id = "f-" + col, req = o.req ? " required" : "", ph = o.ph ? ` placeholder="${esc(o.ph)}"` : "";
    const ay = o.ayuda ? `<small class="ayuda">${esc(o.ayuda)}</small>` : "";
    const dl = o.lista && tipo !== "opcion" ? `<datalist id="dl-${col}">${o.lista.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>` : "";
    const marca = o.req ? ' <small class="oblig">(obligatorio)</small>' : "";
    switch (tipo) {
      case "nota": return `<p class="nota-campo">${icono("candado")}${esc(etq)}</p>`;
      case "largo": return `<div class="campo" data-campo="${col}"><label for="${id}">${esc(etq)}${marca}</label>
        ${o.sinFormato ? "" : `<div class="formato"><button type="button" class="btn-linea peq" data-formato="negrita:${col}"><b>N</b> Negrita</button><button type="button" class="btn-linea peq" data-formato="lista:${col}">• Lista</button></div>`}
        <textarea id="${id}" rows="${o.sinFormato ? 4 : 7}"${ph}>${esc(val ?? "")}</textarea>${ay}</div>`;
      case "si": return `<label class="casilla" data-campo="${col}"><input type="checkbox" id="${id}"${val ? " checked" : ""}><span>${esc(etq)}</span></label>`;
      case "opcion": {
        // La lista puede ser de textos o de pares [valor, lo que se lee]; y puede salir de una función (v11: secciones)
        const ops = (typeof o.lista === "function" ? o.lista(ED?.orig) : (o.lista || [])).map((x) => Array.isArray(x) ? x : [x, x]);
        const v = val == null ? "" : String(val);
        if (v && !ops.some(([a]) => String(a) === v)) ops.push([v, v]);
        return `<label class="campo" data-campo="${col}"><span>${esc(etq)}</span><select id="${id}">${ops.map(([a, b]) => `<option value="${esc(a)}"${String(a) === v ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>${ay}</label>`;
      }
      case "foto": return `<div class="campo" data-campo="${col}"><span>${esc(etq)}</span>
        <div class="foto-campo"><div class="foto-previa" id="foto-previa"></div>
          <div class="foto-btns"><label class="btn-linea subir">${icono("subir")}<span id="foto-txt">Elegir foto</span><input type="file" id="f-foto" accept="image/*"></label>
          <button type="button" class="btn-linea peligro" id="foto-quitar" hidden>${icono("borrar")}Quitar foto</button></div></div>
        <small class="ayuda">Se recorta en cuadrado y se reduce en el propio móvil antes de subirla (también se le quitan los datos ocultos, como el lugar donde se hizo).</small></div>`;
      case "archivos": return `<div class="campo" data-campo="${col}"><span>${esc(etq)} <small>(opcional)</small></span>
        <div id="lista-adj" class="lista-adj"></div>
        <label class="soltar" id="soltar">${icono("subir")}<b>Toca para elegir archivos</b><small>O arrástralos aquí. PDF, fotos, Word o Excel · máx. 20 MB cada uno</small>
          <input type="file" id="f-subir" multiple accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.odt,.ods,.ppt,.pptx"></label></div>`;
      default: {
        const t = { texto: "text", fecha: "date", hora: "time", fechahora: "datetime-local", numero: "number", tel: "tel", email: "email", url: "url" }[tipo];
        const v = tipo === "fechahora" ? aLocal(val) : (val ?? "");
        return `<label class="campo" data-campo="${col}"><span>${esc(etq)}${marca}</span><input type="${t}" id="${id}" value="${esc(v)}"${req}${ph}${o.lista ? ` list="dl-${col}"` : ""}>${dl}${ay}</label>`
          + (o.quitar ? `<button type="button" class="btn-linea quitar-campo" data-vaciar="${col}"${v ? "" : " hidden"}>${icono("borrar")}${esc(o.quitar)}</button>` : "");
      }
    }
  };
  const pintaAdj = () => {
    const l = $("lista-adj"); if (!l) return;
    l.innerHTML = ED.adj.map((a, i) => `<div class="adj-fila">${esImagen(a) ? `<img src="${esc(a.url)}" alt="">` : icono("documento")}
      <span>${esc(a.nombre)}<small>${tipoTxt(a)}${a.tamano ? " · " + tamanoTxt(a.tamano) : ""}</small></span>
      <button type="button" class="btn-ic peq" data-quitar-adj="${i}" aria-label="Quitar ${esc(a.nombre)}">${icono("cerrar")}</button></div>`).join("");
  };
  const limpiaNombre = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
  const subir = async (files) => {
    const S = SECCIONES[ED.k];
    for (const f of files) {
      if (f.size > 20 * 1048576) { avisa(`«${f.name}» pesa más de 20 MB`, true); continue; }
      estado($("ed-msg"), `Subiendo «${f.name}»…`);
      const ruta = `${S.tabla}/${Date.now()}-${limpiaNombre(f.name)}`;
      const { error } = await sb.storage.from("documentos").upload(ruta, f, { contentType: f.type || undefined });
      if (error) { avisa(errTxt(error), true); continue; }
      const { data } = sb.storage.from("documentos").getPublicUrl(ruta);
      const a = { url: data.publicUrl, nombre: f.name, tipo: f.type, tamano: f.size, ruta };
      ED.adj.push(a); ED.subidos.push(a); ED.sucio = true;
      pintaAdj(); previa();
    }
    estado($("ed-msg"), "");
  };
  const borraArchivos = (lista) => {
    const rutas = (lista || []).map((a) => a.ruta).filter(Boolean);
    if (rutas.length) sb.storage.from("documentos").remove(rutas).then(() => {}, () => {});
  };
  // Lee el formulario. Devuelve [valores, error]
  const leeForm = (comprobar) => {
    const S = SECCIONES[ED.k], v = {};
    document.querySelectorAll("#ed-form .falta").forEach((x) => x.classList.remove("falta"));
    for (const [col, etq, tipo, o = {}] of camposDe(S)) {
      if (tipo === "nota") continue;
      const el = $("f-" + col);
      if (tipo === "archivos") { v[col] = ED.adj; continue; }
      if (tipo === "foto") { v[col] = ED.foto || null; continue; }
      if (tipo === "si") { v[col] = el.checked; continue; }
      let val = el.value.trim();
      if (comprobar && o.req && !val) { el.closest("[data-campo]").classList.add("falta"); el.focus(); return [v, `Falta rellenar «${etq}».`]; }
      if (tipo === "numero") val = Number(val) || 0;
      else if (tipo === "opcion" && o.num) val = val ? Number(val) : null;
      else if (tipo === "fechahora") val = val ? new Date(val).toISOString() : null;
      else if (tipo === "url" && val && !/^https?:\/\//i.test(val)) val = "https://" + val;
      else if (!val && ["hora", "fecha", "tel", "email", "url"].includes(tipo)) val = null;
      v[col] = val;
    }
    if (comprobar && S.validar) { const m = S.validar(v); if (m) return [v, m]; }
    return [v, ""];
  };
  const previa = () => {
    if (!ED) return;
    const S = SECCIONES[ED.k], [v] = leeForm(false);
    const x = { ...(ED.orig || {}), ...v, id: ED.orig?.id || 0, creado: ED.orig?.creado || ahoraISO() };
    if (ED.k === "avisos") x.fecha = v.publicar_en || ED.orig?.fecha || ahoraISO();
    $("ed-previa").innerHTML = S.previa(x, ED.orig);
    $("ed-titulo").textContent = tituloDe(S, v) === "Sin título" ? "Sin título todavía" : tituloDe(S, v);
    // El botón dice lo que va a pasar
    const programado = ED.k === "avisos" && v.publicar_en && v.publicar_en > ahoraISO();
    const oculto = v.publicado === false || v.publicada === false;
    $("ed-guardar").innerHTML = icono(programado ? "reloj" : "check") + (programado ? "Programar" : ED.orig ? "Guardar cambios" : oculto ? "Guardar sin publicar" : "Publicar");
  };
  // Campos que se enseñan: unos solo al crear (avisar al publicar) y otros solo al editar (avisar del cambio)
  const camposDe = (S) => S.campos.filter(([, , , o = {}]) => ED.orig ? !o.soloNuevo : !o.soloEditar);
  const abrirEditor = (k, x, { duplicando = false } = {}) => {
    const S = SECCIONES[k];
    ED = { k, orig: duplicando ? null : x, adj: x?.adjuntos ? [...x.adjuntos] : [], foto: duplicando ? null : (x?.foto || null), subidos: [], quitados: [], sucio: duplicando };
    $("ed-modo").textContent = duplicando ? "Copia de " + S.uno : x ? "Editar " + S.uno : S.nuevo;
    $("ed-form").innerHTML = (x && S.avisoEditar ? `<p class="nota-campo">${icono("alerta")}${esc(S.avisoEditar)}</p>` : "")
      + camposDe(S).map((c) => campoHTML(c, x && !c[0].startsWith("_") && c[0] in x ? x[c[0]] : (typeof c[3]?.def === "function" ? c[3].def() : c[3]?.def))).join("");
    if (S.asistente && !ED.orig) { $("ed-form").insertAdjacentHTML("afterbegin", asistenteHTML()); prepararAsistente(); }
    pintaAdj();
    $("ed-borrar").hidden = !ED.orig; $("ed-borrar").innerHTML = icono("borrar") + "Borrar";
    $("ed-duplicar").hidden = !ED.orig; $("ed-duplicar").innerHTML = icono("duplicar") + "Duplicar";
    const ancla = ED.orig ? (S.ancla ? S.ancla + "-" + ED.orig.id : S.verWeb?.()) : "";
    $("ed-ver-web").hidden = !ancla; if (ancla) $("ed-ver-web").href = "./#" + ancla;
    estado($("ed-msg"), "");
    verPestana("form");
    $("editor").hidden = false; $("velo-ed").hidden = false;
    document.body.classList.add("sin-scroll");
    pintaFoto();
    previa();
    setTimeout(() => $("ed-form").querySelector("input:not([type=checkbox]), textarea")?.focus(), 30);
  };
  // ---- Foto de un miembro: recorte cuadrado y reducción en el navegador antes de subirla ----
  const pintaFoto = () => {
    const p = $("foto-previa"); if (!p) return;
    p.innerHTML = ED.foto ? `<img src="${esc(urlSegura(ED.foto.url))}" alt="">` : icono("personas");
    $("foto-quitar").hidden = !ED.foto;
    $("foto-txt").textContent = ED.foto ? "Cambiar foto" : "Elegir foto";
  };
  const reduceFoto = (file) => new Promise((ok, mal) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const lado = Math.min(img.naturalWidth, img.naturalHeight), t = Math.min(480, lado);
      const c = document.createElement("canvas"); c.width = c.height = t;
      c.getContext("2d").drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, t, t);
      URL.revokeObjectURL(url);
      c.toBlob((b) => b ? ok(b) : mal(new Error("No se ha podido preparar la foto.")), "image/webp", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("Ese archivo no es una foto que se pueda abrir (prueba con JPG o PNG).")); };
    img.src = url;
  });
  const subirFoto = async (file) => {
    try {
      estado($("ed-msg"), "Preparando la foto…");
      const blob = await reduceFoto(file);
      const ruta = `miembros/${Date.now()}.webp`;
      const { error } = await sb.storage.from("documentos").upload(ruta, blob, { contentType: "image/webp" });
      if (error) throw error;
      const { data } = sb.storage.from("documentos").getPublicUrl(ruta);
      if (ED.foto) ED.quitados.push(ED.foto);
      ED.foto = { url: data.publicUrl, ruta, nombre: "foto.webp", tipo: "image/webp", tamano: blob.size };
      ED.subidos.push(ED.foto); ED.sucio = true;
      pintaFoto(); previa(); estado($("ed-msg"), "Foto lista. Recuerda pulsar «Guardar».");
    } catch (e) { estado($("ed-msg"), errTxt(e), "mal"); }
  };
  const cerrarEditor = (forzar = false) => {
    if (!ED) return;
    if (!forzar && ED.sucio && !confirm("¿Salir sin guardar? Se perderá lo que has escrito.")) return;
    if (!forzar) borraArchivos(ED.subidos); // lo subido y no guardado no se queda suelto
    ED = null;
    $("editor").hidden = true; $("velo-ed").hidden = true;
    document.body.classList.remove("sin-scroll");
  };
  const verPestana = (p) => {
    document.querySelectorAll(".ed-pestanas [data-p]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.p === p)));
    document.querySelector(".ed-cuerpo").dataset.ver = p;
  };
  document.querySelector(".ed-pestanas").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) verPestana(b.dataset.p); });
  $("ed-cerrar").addEventListener("click", () => cerrarEditor());
  $("ed-cancelar").addEventListener("click", () => cerrarEditor());
  $("velo-ed").addEventListener("click", () => cerrarEditor());
  $("ed-form").addEventListener("input", (e) => { ED.sucio = true; previa(); const q = document.querySelector(`[data-vaciar="${e.target.id.slice(2)}"]`); if (q) q.hidden = !e.target.value; });
  $("ed-form").addEventListener("change", () => { ED.sucio = true; previa(); });
  $("ed-form").addEventListener("submit", (e) => e.preventDefault());
  $("ed-form").addEventListener("click", (e) => {
    const f = e.target.closest("[data-formato]");
    if (f) {
      const [tipo, col] = f.dataset.formato.split(":"), t = $("f-" + col);
      const a = t.selectionStart, b = t.selectionEnd, sel = t.value.slice(a, b);
      if (tipo === "negrita") {
        const txt = sel || "texto en negrita";
        t.setRangeText("**" + txt + "**", a, b, "select");
        t.setSelectionRange(a + 2, a + 2 + txt.length);
      } else {
        const ini = t.value.lastIndexOf("\n", a - 1) + 1;
        const bloque = t.value.slice(ini, b) || "";
        const nuevo = (bloque || " ").split("\n").map((l) => /^\s*[-•*]\s+/.test(l) ? l : "- " + l.trimStart()).join("\n");
        t.setRangeText(nuevo, ini, Math.max(b, ini), "end");
      }
      t.focus(); ED.sucio = true; previa();
      return;
    }
    const vac = e.target.closest("[data-vaciar]");
    if (vac) { $("f-" + vac.dataset.vaciar).value = ""; vac.hidden = true; ED.sucio = true; previa(); avisa("Quitado. Pulsa «Guardar cambios» para que se aplique."); return; }
    if (e.target.closest("#foto-quitar")) { if (ED.foto) ED.quitados.push(ED.foto); ED.foto = null; ED.sucio = true; pintaFoto(); previa(); return; }
    const q = e.target.closest("[data-quitar-adj]");
    if (q) { ED.quitados.push(...ED.adj.splice(Number(q.dataset.quitarAdj), 1)); ED.sucio = true; pintaAdj(); previa(); }
  });
  $("ed-form").addEventListener("change", (e) => {
    if (e.target.id === "f-subir") { subir([...e.target.files]); e.target.value = ""; }
    if (e.target.id === "f-foto" && e.target.files[0]) { subirFoto(e.target.files[0]); e.target.value = ""; }
  });
  // Arrastrar archivos encima del editor
  ["dragenter", "dragover"].forEach((t) => $("editor").addEventListener(t, (e) => { if ($("soltar") && e.dataTransfer?.types.includes("Files")) { e.preventDefault(); $("soltar").classList.add("encima"); } }));
  ["dragleave", "drop"].forEach((t) => $("editor").addEventListener(t, () => $("soltar")?.classList.remove("encima")));
  $("editor").addEventListener("drop", (e) => { if ($("soltar") && e.dataTransfer?.files.length) { e.preventDefault(); subir([...e.dataTransfer.files]); } });

  $("ed-guardar").addEventListener("click", async () => {
    const S = SECCIONES[ED.k], [v, error] = leeForm(true), msg = $("ed-msg");
    if (error) return estado(msg, error, "mal");
    S.alGuardar?.(v, ED.orig);
    const cambio = !!v._cambio;
    Object.keys(v).forEach((c) => { if (c.startsWith("_")) delete v[c]; });
    const b = $("ed-guardar"); b.disabled = true; estado(msg, "Guardando…");
    const r = ED.orig ? await sb.from(S.tabla).update(v).eq("id", ED.orig.id) : await sb.from(S.tabla).insert(v).select("id").single();
    b.disabled = false;
    if (r.error) return estado(msg, errTxt(r.error), "mal");
    borraArchivos(ED.quitados.filter((a) => !ED.adj.some((x) => x.url === a.url) && !(ED.foto && ED.foto.url === a.url)));
    const programado = ED.k === "avisos" && v.publicar_en && v.publicar_en > ahoraISO();
    const oculto = v.publicado === false || v.publicada === false;
    let txt = programado ? "Aviso programado" : ED.orig ? "Cambios guardados" : oculto ? "Guardado (no se ve en la web)" : "Publicado";
    // Avisar al móvil: al publicar algo nuevo (si la casilla está marcada) o al pedir «volver a avisar»
    const id = ED.orig ? ED.orig.id : r.data?.id;
    if (AVISABLE.includes(ED.k) && id && !programado && !oculto && ((!ED.orig && v.notificar) || cambio)) {
      estado(msg, "Avisando a los móviles…");
      const n = await avisarMoviles(ED.k, id, cambio);
      if (n != null) txt += n ? ` y avisado a ${n} ${n === 1 ? "móvil" : "móviles"}` : " (todavía no hay móviles apuntados a los avisos)";
    }
    if (programado && v.notificar !== false) txt += ": avisará a los móviles cuando se publique";
    if (ED.k === "apartados") await cargaAps().catch(() => {});
    avisa(txt);
    cerrarEditor(true);
    irA(actual);
  });
  $("ed-borrar").addEventListener("click", async () => {
    const S = SECCIONES[ED.k];
    if (!confirm(`¿Borrar «${tituloDe(S, ED.orig)}»?\n\nSe quitará de la web. Si te equivocas, lo puedes recuperar desde «Papelera» durante 90 días.`)) return;
    const { error } = await sb.from(S.tabla).delete().eq("id", ED.orig.id);
    if (error) return estado($("ed-msg"), errTxt(error), "mal");
    avisa("Borrado. Está en la Papelera por si lo necesitas.");
    cerrarEditor(true); irA(actual);
  });
  $("ed-duplicar").addEventListener("click", () => {
    const S = SECCIONES[ED.k], [v] = leeForm(false);
    const copia = { ...v, adjuntos: [] };
    S.alDuplicar?.(copia);
    const k = ED.k; cerrarEditor(true);
    abrirEditor(k, copia, { duplicando: true });
    avisa(k === "reuniones" ? "Copia lista: elige el día nuevo y guarda" : "Copia lista: cambia lo que haga falta y guarda");
  });

  // ================== ASISTENTE DE ACTAS (v11, como en CCOO) ==================
  // Foto de las notas (aunque sean a mano), PDF o Word → función «generar-acta» (IA gratuita de Google, Gemini) → rellena
  // título, tipo, fecha, resumen y acuerdos. Nunca publica solo: el padre lo revisa y pulsa «Publicar».
  let IA = [];
  const IA_MAX = 6;
  const extDe = (n) => String(n || "").split(".").pop().toLowerCase();
  const asistenteHTML = () => `<div class="asistente">
      <h3>${icono("magia")}Hacer el acta con el asistente</h3>
      <p class="ayuda">Haz una <b>foto de tus notas</b> (aunque sean a mano) o sube el <b>PDF o Word</b> de la reunión. El asistente rellena el acta de abajo y tú la revisas antes de publicar.</p>
      <div class="ia-botones">
        <label class="ia-boton">${icono("camara")}<b>Hacer foto</b><span>con la cámara</span><input type="file" id="f-ia-cam" accept="image/*" capture="environment"></label>
        <label class="ia-boton">${icono("subir")}<b>Elegir archivos</b><span>fotos, PDF, Word</span><input type="file" id="f-ia" multiple accept="image/*,application/pdf,.pdf,.docx,.txt,text/plain"></label>
      </div>
      <div id="lista-ia" class="lista-adj"></div>
      <details class="nota-ia"><summary>Añadir una nota escrita (opcional)</summary>
        <textarea id="notas-ia" rows="4" placeholder="Algo que no esté en los archivos: quién asistió, la fecha…"></textarea></details>
      <p class="ayuda"><b>Importante:</b> los archivos se envían a la IA gratuita de Google (Gemini), que puede usarlos para mejorar sus productos. Evita fotos con datos personales de compañeros o información confidencial de la empresa.</p>
      <button type="button" class="btn" id="b-ia" disabled>${icono("magia")}Generar acta</button>
      <p class="estado" id="m-ia" role="status"></p>
    </div>
    <p class="separador-ia">Revisa el acta y publícala</p>`;
  const prepararAsistente = () => {
    IA = [];
    const pinta = () => {
      $("lista-ia").innerHTML = IA.map((f, i) => `<div class="adj-fila">${f.type.startsWith("image/") ? `<img src="${URL.createObjectURL(f)}" alt="">` : icono("documento")}
        <span>${esc(f.name)}<small>${tamanoTxt(f.size)} · listo</small></span>
        <button type="button" class="btn-ic peq" data-quitar-ia="${i}" aria-label="Quitar ${esc(f.name)}">${icono("cerrar")}</button></div>`).join("");
      $("b-ia").disabled = !IA.length && $("notas-ia").value.trim().length < 20;
    };
    const anade = (files) => {
      const malos = [];
      for (const f of files) {
        const ext = extDe(f.name), vale = (f.type || "").startsWith("image/") || f.type === "application/pdf" || ["pdf", "docx", "txt", "heic", "heif"].includes(ext);
        if (!vale) { malos.push(f.name); continue; }
        if (IA.length >= IA_MAX) { malos.push(f.name + " (como mucho " + IA_MAX + ")"); continue; }
        IA.push(f);
      }
      estado($("m-ia"), malos.length ? "No se pueden usar: " + malos.join(", ") + ". Usa fotos, PDF o Word (.docx)." : "", malos.length ? "mal" : "");
      $("f-ia").value = ""; $("f-ia-cam").value = ""; pinta();
    };
    $("f-ia").addEventListener("change", (e) => { e.stopPropagation(); anade([...e.target.files]); });
    $("f-ia-cam").addEventListener("change", (e) => { e.stopPropagation(); anade([...e.target.files]); });
    $("notas-ia").addEventListener("input", (e) => { e.stopPropagation(); pinta(); });
    $("lista-ia").addEventListener("click", (e) => { const q = e.target.closest("[data-quitar-ia]"); if (q) { e.stopPropagation(); IA.splice(+q.dataset.quitarIa, 1); pinta(); } });
    const zona = $("ed-form").querySelector(".asistente");
    zona.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); zona.classList.add("encima"); });
    zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
    zona.addEventListener("drop", (e) => { e.preventDefault(); e.stopPropagation(); zona.classList.remove("encima"); anade([...e.dataTransfer.files]); });
    $("b-ia").addEventListener("click", generarActa);
  };
  // Las fotos se reducen (la IA las lee igual de bien y la petición pesa menos)
  const aBase64 = async (f) => {
    if ((f.type || "").startsWith("image/")) {
      try {
        const img = await createImageBitmap(f), r = Math.min(1, 2000 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        return { mime: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.85).split(",")[1], nombre: f.name };
      } catch (_) { /* formato que el navegador no abre (p. ej. HEIC): va tal cual */ }
    }
    if (f.size > 12 * 1048576) throw new Error(`«${f.name}» es demasiado grande para el asistente (máximo 12 MB).`);
    const data = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = mal; r.readAsDataURL(f); });
    const ext = extDe(f.name);
    return { mime: f.type || (ext === "pdf" ? "application/pdf" : ext === "heic" ? "image/heic" : "application/octet-stream"), data, nombre: f.name };
  };
  // El texto de un Word (.docx) se saca en el propio navegador
  const textoDeWord = async (f) => {
    if (!window.JSZip) await cargarJSZip();
    const zip = await window.JSZip.loadAsync(f), xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error(`«${f.name}» no parece un Word válido. Guárdalo como PDF y súbelo otra vez.`);
    return xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
  };
  const generarActa = async () => {
    const btn = $("b-ia"), m = $("m-ia");
    let notas = $("notas-ia").value.trim();
    if (notas.length < 20 && !IA.length) return estado(m, "Añade una foto o un archivo con las notas de la reunión.", "mal");
    btn.disabled = true;
    try {
      estado(m, "Preparando los archivos…");
      const archivos = [];
      for (const f of IA) {
        const ext = extDe(f.name);
        if (ext === "docx") notas += `\n\nContenido del documento «${f.name}»:\n` + (await textoDeWord(f)).slice(0, 25000);
        else if (ext === "txt") notas += `\n\nContenido de «${f.name}»:\n` + (await f.text()).slice(0, 25000);
        else archivos.push(await aBase64(f));
      }
      estado(m, "Leyendo las notas y redactando el acta… (puede tardar unos segundos)");
      const { data, error } = await sb.functions.invoke("generar-acta", { body: { notas: notas.trim(), tipos: TIPOS_REUNION, hoy: hoyISO(), archivos } });
      if (error) { let t = "No se ha podido generar el acta."; try { t = (await error.context.json()).error || t; } catch (_) {} throw new Error(t); }
      const a = data.acta;
      $("f-titulo").value = a.titulo || "";
      if (a.tipo && TIPOS_REUNION.includes(a.tipo)) $("f-tipo").value = a.tipo;
      if (a.fecha) $("f-fecha").value = a.fecha;
      $("f-resumen").value = a.resumen || "";
      $("f-acuerdos").value = a.acuerdos || "";
      ED.sucio = true; previa();
      const falta = [!a.fecha && "pon la fecha de la reunión", a.avisos].filter(Boolean).join(". ");
      estado(m, "Hecho. Revisa el acta abajo" + (falta ? " (ojo: " + falta + ")" : "") + " y pulsa «Publicar».", "bien");
      $("f-titulo").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) { estado(m, errTxt(e), "mal"); }
    btn.disabled = false;
  };

  // ================== AVISOS AL MÓVIL ==================
  const AVISABLE = ["avisos", "actualidad", "reuniones", "actas", "encuestas", "documentos", "publicaciones"];
  // Devuelve a cuántos móviles ha llegado (o null si ha fallado)
  const avisarMoviles = async (tabla, id, cambio = false) => {
    try {
      const { data, error } = await sb.functions.invoke("notificar", { body: { modo: "publicado", tabla, id, cambio } });
      if (error) throw error;
      return data?.push ? data.push.ok : 0;
    } catch (e) { avisa("Se ha publicado, pero no se ha podido avisar a los móviles. Se intentará solo en unos minutos.", true); return null; }
  };

  // ================== BUZÓN ==================
  const marcaCuentaBuzon = () => document.querySelectorAll("[data-cuenta-buzon]").forEach((c) => { c.hidden = !PEND_BUZON; c.textContent = PEND_BUZON || ""; });
  const cuentaBuzon = async () => {
    const { count } = await sb.from("buzon").select("id", { count: "exact", head: true }).eq("leido", false).eq("archivado", false);
    PEND_BUZON = count || 0; marcaCuentaBuzon();
  };
  let verArchivados = false, MENSAJES = [];
  const pintaBuzon = async () => {
    $("zona").innerHTML = `<div class="cab-seccion"><h1 class="titulo-vista">Buzón anónimo</h1>
      <button type="button" class="btn-linea" id="b-archivados">${icono("archivo")}${verArchivados ? "Ver los pendientes" : "Ver archivados"}</button></div>
      <p class="sub-vista">Sugerencias y preguntas anónimas de la plantilla. Solo las veis los administradores. Para contestar una pregunta a todos, pulsa «Responder en la web».</p>
      <div class="lista" id="filas"><div class="esq"></div></div>`;
    $("b-archivados").addEventListener("click", () => { verArchivados = !verArchivados; pintaBuzon(); });
    const { data, error } = await sb.from("buzon").select("*").eq("archivado", verArchivados).order("id", { ascending: false });
    if (actual !== "buzon") return;
    if (error) { $("filas").innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    MENSAJES = data;
    $("filas").innerHTML = data.map((m) => `
      <div class="tarjeta mensaje${m.leido ? "" : " sin-leer"}">
        <div class="meta"><span class="etq ${m.tipo === "Pregunta" ? "azul" : ""}">${esc(m.tipo)}</span><span>${esc(fechaLarga(m.dia))}</span>${m.leido ? "" : '<span class="etq rojo">Sin leer</span>'}</div>
        <div class="texto">${textoHTML(m.texto)}</div>
        <div class="acciones">
          ${m.leido ? "" : `<button type="button" class="btn-linea" data-leido="${m.id}">${icono("check")}Marcar leído</button>`}
          ${m.tipo === "Pregunta" ? `<button type="button" class="btn-linea" data-responder="${m.id}">${icono("mensaje")}Responder en la web</button>` : ""}
          <button type="button" class="btn-linea" data-archivar="${m.id}">${icono("archivo")}${m.archivado ? "Sacar del archivo" : "Archivar"}</button>
          <button type="button" class="btn-linea peligro" data-borrar-msg="${m.id}">${icono("borrar")}Borrar</button>
        </div>
      </div>`).join("") || `<p class="vacio">${verArchivados ? "No hay mensajes archivados." : "No hay mensajes pendientes. Cuando alguien escriba en el buzón de la web, aparecerá aquí."}</p>`;
    cuentaBuzon();
  };
  $("zona").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-leido],[data-archivar],[data-borrar-msg],[data-responder]");
    if (!b || actual !== "buzon") return;
    const id = Number(b.dataset.leido || b.dataset.archivar || b.dataset.borrarMsg || b.dataset.responder);
    const m = MENSAJES.find((x) => x.id === id); if (!m) return;
    let r;
    if (b.dataset.leido) r = await sb.from("buzon").update({ leido: true }).eq("id", id);
    else if (b.dataset.archivar) r = await sb.from("buzon").update({ archivado: !m.archivado, leido: true }).eq("id", id);
    else if (b.dataset.borrarMsg) { if (!confirm("¿Borrar este mensaje? No se puede deshacer.")) return; r = await sb.from("buzon").delete().eq("id", id); }
    else {
      await sb.from("buzon").update({ leido: true }).eq("id", id);
      abrirEditor("preguntas", null);
      $("f-pregunta").value = m.texto; ED.sucio = true; previa();
      $("f-respuesta").focus();
      cuentaBuzon();
      return;
    }
    if (r.error) return avisa(errTxt(r.error), true);
    pintaBuzon();
  });

  // ================== TEXTOS ==================
  const TEXTOS = [
    ["bienvenida", "Bienvenida de la portada", "Una o dos frases que salen arriba en «Info general» (la portada)."],
    ["nosotros", "Texto de «Nosotros»", "Qué es el comité, qué hace y cómo contactar."],
    ["aviso_legal", "Aviso legal", "Quién está detrás de la web. Si el comité tiene un email de contacto, añadidlo aquí."],
    ["privacidad", "Privacidad", "Qué datos se guardan, para qué y cuánto tiempo. Si añadís algo nuevo a la web que guarde datos, hay que contarlo aquí."],
    ["cookies", "Cookies", "La web no usa cookies; aquí se explica lo que se guarda en el móvil de cada uno."],
  ];
  const pintaTextos = async () => {
    const { data, error } = await sb.from("paginas").select("*");
    if (actual !== "textos") return;
    if (error) { $("zona").innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    const P = Object.fromEntries(data.map((p) => [p.slug, p.contenido]));
    $("zona").innerHTML = `<h1 class="titulo-vista">Textos de la web</h1><p class="sub-vista">Textos fijos. Deja una línea en blanco entre párrafos; **así** sale en negrita.</p>
      <form id="f-textos" class="tarjeta form-panel" novalidate>
        ${TEXTOS.map(([s, n, a]) => `<div class="campo"><label for="t-${s}">${esc(n)}</label><textarea id="t-${s}" rows="${s === "bienvenida" ? 3 : 8}">${esc(P[s] || "")}</textarea><small class="ayuda">${esc(a)}</small></div>`).join("")}
        <button type="submit" class="btn grande">${icono("check")}Guardar textos</button>
        <p id="t-estado" class="estado" role="status"></p>
      </form>`;
    $("f-textos").addEventListener("submit", async (e) => {
      e.preventDefault();
      const filas = TEXTOS.map(([s]) => ({ slug: s, contenido: $("t-" + s).value.trim() }));
      const { error: er } = await sb.from("paginas").upsert(filas);
      if (er) return estado($("t-estado"), errTxt(er), "mal");
      avisa("Textos guardados");
    });
  };

  // ================== PAPELERA ==================
  const pintaPapelera = async () => {
    const { data, error } = await sb.from("papelera").select("*").order("borrado", { ascending: false });
    if (actual !== "papelera") return;
    const nombreTabla = (t) => SECCIONES[t]?.nombre || t;
    $("zona").innerHTML = `<h1 class="titulo-vista">Papelera</h1>
      <p class="sub-vista">Lo que se borra se guarda aquí 90 días. Pulsa «Recuperar» y vuelve a la web tal como estaba.</p>
      <div class="lista">${error ? `<p class="vacio">${esc(errTxt(error))}</p>` : data.map((p) => `
        <div class="tarjeta fila">
          <div class="fila-abre"><b>${esc((SECCIONES[p.tabla] ? tituloDe(SECCIONES[p.tabla], p.datos) : p.datos.titulo) || "Sin título")}</b>
            <span class="fila-sub">Borrado ${esc(new Date(p.borrado).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}${p.por ? " por " + esc(p.por) : ""}</span>
            <span class="chips-fila"><span class="chip-p">${esc(nombreTabla(p.tabla))}</span></span></div>
          <button type="button" class="btn-linea" data-recuperar="${p.id}">${icono("recuperar")}Recuperar</button>
        </div>`).join("") || '<p class="vacio">La papelera está vacía.</p>'}</div>`;
    $("zona").querySelectorAll("[data-recuperar]").forEach((b) => b.addEventListener("click", async () => {
      const { data: t, error: er } = await sb.rpc("recuperar_borrado", { p_id: Number(b.dataset.recuperar) });
      if (er) return avisa(errTxt(er), true);
      avisa("Recuperado en «" + (SECCIONES[t]?.nombre || t) + "»"); pintaPapelera();
    }));
  };

  // ================== CARTEL ==================
  const pintaCartel = () => {
    $("zona").innerHTML = `<h1 class="titulo-vista">Cartel con QR</h1>
      <p class="sub-vista">Un cartel en A4 para el tablón de anuncios, los vestuarios o el comedor. Los compañeros escanean el código con la cámara del móvil y abren la web.</p>
      <div class="tarjeta cartel-tarjeta">${icono("qr")}<span><b>Cartel para imprimir</b><small>Se abre en otra pestaña con el botón «Imprimir». También puedes guardarlo como PDF y mandarlo por WhatsApp.</small></span>
        <a class="btn" href="cartel.html" target="_blank" rel="noopener">${icono("qr")}Abrir el cartel</a></div>
      <div class="tarjeta cartel-tarjeta">${icono("compartir")}<span><b>Enlace de la web</b><small>${esc(WEB_URL)}</small></span>
        <button type="button" class="btn-linea" id="b-copiar">${icono("duplicar")}Copiar enlace</button></div>`;
    $("b-copiar").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(WEB_URL); avisa("Enlace copiado"); } catch (_) { prompt("Copia el enlace:", WEB_URL); }
    });
  };

  // ================== ACCESOS ==================
  const pintaAccesos = async () => {
    const yo = YO.toLowerCase();
    const { data, error } = await sb.from("admins").select("email").order("email");
    if (actual !== "accesos") return;
    $("zona").innerHTML = `<h1 class="titulo-vista">Ajustes</h1>
      <h2 class="titulo-bloque">Correos con acceso al panel</h2>
      <p class="sub-vista">Solo estos correos pueden publicar. Tú les puedes poner la contraseña aquí mismo: así no dependen de ningún email. La cuenta del comité es distinta de la de CCOO, aunque el correo sea el mismo.</p>
      <div class="lista" id="lista-admins">${error ? `<p class="vacio">${esc(errTxt(error))}</p>` : data.map((a) => `
        <div class="tarjeta admin-fila" data-admin="${esc(a.email)}">
          <div class="admin-cab">
            <div class="fila-abre"><b>${esc(a.email)}</b><span class="fila-sub" data-estado-cuenta>${a.email.toLowerCase() === yo ? "Tú · " : ""}Comprobando la cuenta…</span></div>
            <div class="admin-btns">
              <button type="button" class="btn-linea" data-poner-clave="${esc(a.email)}">${icono("candado")}Poner contraseña</button>
              ${a.email.toLowerCase() === yo ? "" : `<button type="button" class="btn-linea peligro" data-quitar-admin="${esc(a.email)}">${icono("borrar")}Quitar</button>`}
            </div>
          </div>
          <form class="clave-form" data-form-clave="${esc(a.email)}" novalidate hidden>
            <label class="campo"><span>Contraseña nueva <small>(10 o más, con letras y números)</small></span><input type="text" autocomplete="off" spellcheck="false" data-clave1></label>
            <label class="campo"><span>Repítela</span><input type="text" autocomplete="off" spellcheck="false" data-clave2></label>
            <p class="ayuda">Se ve mientras la escribes para que no haya errores. Díselo a esa persona en persona o por teléfono, no por escrito.</p>
            <div class="acciones"><button type="submit" class="btn">${icono("check")}Guardar contraseña</button><button type="button" class="btn-linea" data-cancelar-clave>Cancelar</button></div>
            <p class="estado" role="status"></p>
          </form>
        </div>`).join("")}</div>
      <form id="f-admin" class="tarjeta form-panel" novalidate>
        <label class="campo"><span>Dar acceso a otro email</span><input type="email" id="a-email" autocomplete="off" placeholder="nombre@ejemplo.com"></label>
        <label class="campo"><span>Contraseña para esa persona <small>(opcional; si la pones, ya puede entrar)</small></span><input type="text" id="a-clave" autocomplete="off" spellcheck="false" placeholder="10 o más, con letras y números"></label>
        <button type="submit" class="btn">${icono("mas")}Dar acceso</button>
        <p class="estado" id="a-estado" role="status"></p>
      </form>
      <h2 class="titulo-bloque" id="ajuste-copia">Copia de seguridad</h2>
      <div class="tarjeta seguridad">
        <p class="sub-vista">El plan gratuito no guarda copias. Descarga una al mes y guárdala en el ordenador o en el Drive: lleva todos los avisos, anuncios, reuniones, actas, documentos, consultas, preguntas, miembros, tus secciones y lo publicado en ellas, mensajes del buzón y textos de la web.</p>
        <p class="sub-vista" id="ultima-copia">Comprobando la última copia…</p>
        <div class="acciones"><button type="button" class="btn" id="b-copia-todo">${icono("instalar")}Descargar copia con archivos</button>
          <button type="button" class="btn-linea" id="b-copia-datos">${icono("texto")}Solo los textos</button></div>
        <p class="estado" id="m-copia" role="status"></p>
      </div>
      <h2 class="titulo-bloque">Códigos de rescate</h2>
      <div class="tarjeta seguridad" id="rescate"><div class="esq"></div></div>
      <h2 class="titulo-bloque">Seguridad de tu cuenta</h2>
      <div class="tarjeta seguridad" id="dos-pasos"><div class="esq"></div></div>
      <div class="tarjeta seguridad">
        <b>Cerrar la sesión en todos los dispositivos</b>
        <p class="sub-vista">Por si has entrado en un móvil u ordenador que no es tuyo. Tendrás que volver a entrar con tu contraseña.</p>
        <button type="button" class="btn-linea peligro" id="b-salir-todo">${icono("salir")}Cerrar en todos</button>
      </div>`;
    pintaDosPasos(); prepararCopia();
    if (IR_COPIA) setTimeout(() => $("ajuste-copia")?.scrollIntoView({ block: "start" }), 50);
    $("b-salir-todo").addEventListener("click", async () => {
      if (!confirm("¿Cerrar la sesión del panel en todos los móviles y ordenadores?")) return;
      await sb.auth.signOut({ scope: "global" }); history.replaceState(null, "", "admin.html"); location.reload();
    });
    $("f-admin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("a-email").value.trim().toLowerCase(), clave = $("a-clave").value, est = $("a-estado");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return estado(est, "Ese email no parece correcto.", "mal");
      if (clave && claveFlojaTxt(clave)) return estado(est, claveFlojaTxt(clave), "mal");
      const { error: er } = await sb.from("admins").insert({ email });
      if (er && !/duplicate/i.test(er.message)) return estado(est, errTxt(er), "mal");
      if (clave) {
        estado(est, "Creando la cuenta…");
        const r = await ponClave(email, clave);
        if (r) return estado(est, r, "mal");
        avisa("Acceso dado. Ya puede entrar con esa contraseña.");
      } else avisa(er ? "Ese email ya tenía acceso" : "Acceso dado");
      pintaAccesos();
    });
    // Poner contraseña a una cuenta de la lista
    $("lista-admins")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-poner-clave]");
      if (b) { const f = document.querySelector(`[data-form-clave="${CSS.escape(b.dataset.ponerClave)}"]`); f.hidden = !f.hidden; if (!f.hidden) f.querySelector("[data-clave1]").focus(); return; }
      const c = e.target.closest("[data-cancelar-clave]");
      if (c) { const f = c.closest("form"); f.reset(); f.hidden = true; }
    });
    $("lista-admins")?.addEventListener("submit", async (e) => {
      const f = e.target.closest("[data-form-clave]"); if (!f) return;
      e.preventDefault();
      const est = f.querySelector(".estado"), c1 = f.querySelector("[data-clave1]").value, c2 = f.querySelector("[data-clave2]").value;
      if (claveFlojaTxt(c1)) return estado(est, claveFlojaTxt(c1), "mal");
      if (c1 !== c2) return estado(est, "Las dos contraseñas no son iguales.", "mal");
      estado(est, "Guardando…");
      const r = await ponClave(f.dataset.formClave, c1);
      if (r) return estado(est, r, "mal");
      f.reset(); f.hidden = true;
      avisa("Contraseña guardada. Ya puede entrar con ella.");
      pintaEstadoCuentas();
    });
    pintaEstadoCuentas();
    pintaRescate();
    $("zona").querySelectorAll("[data-quitar-admin]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(`¿Quitar el acceso a ${b.dataset.quitarAdmin}?`)) return;
      const { error: er } = await sb.from("admins").delete().eq("email", b.dataset.quitarAdmin);
      if (er) return avisa(errTxt(er), true);
      avisa("Acceso quitado"); pintaAccesos();
    }));
  };

  // ---- Contraseñas sin email (función «cuenta», como en la web de CCOO) ----
  const llamaCuenta = async (body) => {
    try {
      const { data, error } = await sb.functions.invoke("cuenta", { body });
      if (error) { const j = await error.context?.json?.().catch(() => null); return { error: j?.error || errTxt(error) }; }
      return data || {};
    } catch (e) { return { error: errTxt(e) }; }
  };
  const ponClave = async (email, clave) => { const r = await llamaCuenta({ accion: "poner_clave", email, clave }); return r.error || ""; };
  const pintaEstadoCuentas = async () => {
    const r = await llamaCuenta({ accion: "estado" });
    document.querySelectorAll("[data-admin]").forEach((fila) => {
      const em = fila.dataset.admin.toLowerCase(), sp = fila.querySelector("[data-estado-cuenta]"); if (!sp) return;
      const tu = em === YO.toLowerCase() ? "Tú · " : "";
      sp.textContent = r.error ? tu.replace(" · ", "") : tu + (r.cuentas?.[em] ? "Cuenta creada" : "Sin cuenta todavía: ponle una contraseña y ya podrá entrar");
    });
    const q = $("rescate-quedan"); if (q && !r.error) q.textContent = r.quedan;
  };
  // ---- Copia de seguridad (como en CCOO) ----
  const TABLAS_COPIA = ["avisos", "actualidad", "reuniones", "actas", "documentos", "encuestas", "preguntas", "miembros", "apartados", "publicaciones", "buzon", "paginas", "admins"];
  const haceTxt = (iso) => { const d = Math.floor((Date.now() - new Date(iso)) / 86400000); return d <= 0 ? "hoy" : d === 1 ? "ayer" : "hace " + d + " días"; };
  const prepararCopia = async () => {
    const { data } = await sb.from("paginas").select("contenido").eq("slug", "ultima_copia").maybeSingle();
    if ($("ultima-copia")) $("ultima-copia").innerHTML = data?.contenido ? `Última copia: <b>${esc(haceTxt(data.contenido))}</b>.` : "<b>Todavía no se ha hecho ninguna copia.</b>";
    $("b-copia-todo")?.addEventListener("click", () => hacerCopia(true));
    $("b-copia-datos")?.addEventListener("click", () => hacerCopia(false));
  };
  const cargarJSZip = () => window.JSZip ? Promise.resolve() : new Promise((ok, mal) => {
    const sc = document.createElement("script"); sc.src = "lib/jszip.min.js";
    sc.onload = ok; sc.onerror = () => mal(new Error("No se ha podido preparar el archivo ZIP. Revisa la conexión."));
    document.head.appendChild(sc);
  });
  const hacerCopia = async (conArchivos) => {
    const b1 = $("b-copia-todo"), b2 = $("b-copia-datos"), m = $("m-copia"); b1.disabled = b2.disabled = true;
    try {
      estado(m, "Reuniendo los datos…");
      const copia = { creada: new Date().toISOString(), web: WEB_URL, tablas: {} };
      for (const t of TABLAS_COPIA) { const { data, error } = await sb.from(t).select("*"); if (error) throw error; copia.tablas[t] = data; }
      const nombre = "copia-comite-calsina-" + hoyISO();
      let blob;
      if (!conArchivos) blob = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" });
      else {
        await cargarJSZip();
        const zip = new window.JSZip();
        zip.file("datos.json", JSON.stringify(copia, null, 2));
        zip.file("LEEME.txt", "Copia de seguridad de la web del Comité de Empresa de Calsina Carré.\r\n\r\ndatos.json: todos los textos (avisos, anuncios, reuniones, actas, documentos, consultas, preguntas, miembros, secciones propias y lo publicado en ellas, buzón y textos de la web).\r\narchivos/: los PDF, fotos y documentos subidos.\r\n\r\nGuárdala en un sitio seguro: lleva los mensajes del buzón. Si algún día hace falta recuperar algo, con este archivo se puede restaurar.");
        const urls = new Map();
        ["avisos", "actualidad", "actas", "documentos", "publicaciones"].forEach((t) => (copia.tablas[t] || []).forEach((x) => (x.adjuntos || []).forEach((a) => a?.url && urls.set(a.url, a.nombre))));
        (copia.tablas.miembros || []).forEach((x) => x.foto?.url && urls.set(x.foto.url, "foto.webp"));
        let i = 0, fallos = 0;
        for (const [url, nom] of urls) {
          i++; estado(m, `Descargando archivos: ${i} de ${urls.size}…`);
          try { const r = await fetch(url); if (!r.ok) throw 0; zip.file("archivos/" + (decodeURIComponent(url.split("/").pop() || "") || nom), await r.blob()); } catch (_) { fallos++; }
        }
        estado(m, "Comprimiendo…");
        blob = await zip.generateAsync({ type: "blob" });
        if (fallos) avisa(`${fallos} archivo(s) no se han podido incluir.`, true);
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre + (conArchivos ? ".zip" : ".json");
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      await sb.from("paginas").upsert({ slug: "ultima_copia", contenido: new Date().toISOString(), actualizado: new Date().toISOString() });
      estado(m, `Copia descargada (${tamanoTxt(blob.size)}). Guárdala en un sitio seguro: lleva los mensajes del buzón.`, "bien");
      $("ultima-copia").innerHTML = "Última copia: <b>ahora mismo</b>.";
    } catch (e) { estado(m, "No se ha podido hacer la copia: " + errTxt(e), "mal"); }
    b1.disabled = b2.disabled = false;
  };
  const pintaRescate = () => {
    const caja = $("rescate"); if (!caja) return;
    caja.innerHTML = `
      <b>Para cuando no puedas entrar</b>
      <p class="sub-vista">Son 8 códigos de un solo uso. Si un día no recuerdas la contraseña y nadie te la puede poner, en la pantalla de entrar pulsa «¿Problemas para entrar?» → «Tengo un código de rescate» y pon una contraseña nueva. Guárdalos en papel, en casa. Te quedan: <b id="rescate-quedan">…</b></p>
      <button type="button" class="btn-linea" id="b-codigos">${icono("candado")}Crear códigos nuevos</button>
      <div id="codigos-lista"></div>`;
    $("b-codigos").addEventListener("click", async () => {
      if (!confirm("Se crean 8 códigos nuevos y los que tuvieras antes dejan de valer. ¿Seguir?")) return;
      const r = await llamaCuenta({ accion: "codigos" });
      if (r.error) return avisa(r.error, true);
      $("codigos-lista").innerHTML = `<p class="nota-campo">${icono("alerta")}Apúntalos o imprímelos AHORA: no se volverán a enseñar.</p>
        <ol class="codigos">${r.codigos.map((c) => `<li><code>${esc(c)}</code></li>`).join("")}</ol>
        <button type="button" class="btn" id="b-imprimir-codigos">${icono("documento")}Imprimir</button>`;
      $("rescate-quedan").textContent = r.codigos.length;
      $("b-imprimir-codigos").addEventListener("click", () => print());
    });
    pintaEstadoCuentas();
  };

  // ---- Verificación en dos pasos (app de códigos: Google Authenticator, Microsoft Authenticator…) ----
  const pintaDosPasos = async () => {
    const caja = $("dos-pasos"); if (!caja) return;
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) { caja.innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    const activa = (data?.totp || []).find((f) => f.status === "verified");
    caja.innerHTML = activa ? `
      <b class="seg-ok">${icono("check")}Verificación en dos pasos activada</b>
      <p class="sub-vista">Al entrar, además de la contraseña, te pedimos el código de 6 cifras de tu app de códigos. Aunque alguien sepa tu contraseña, no puede entrar sin tu móvil.</p>
      <button type="button" class="btn-linea peligro" id="b-dos-quitar">${icono("borrar")}Desactivarla</button>` : `
      <b>Verificación en dos pasos</b>
      <p class="sub-vista">Muy recomendable. Además de la contraseña, al entrar se pide un código de 6 cifras que da una app gratuita del móvil (Google Authenticator o Microsoft Authenticator). Así, aunque alguien averigüe tu contraseña, no puede entrar.</p>
      <button type="button" class="btn" id="b-dos-activar">${icono("candado")}Activarla</button>`;
    $("b-dos-quitar")?.addEventListener("click", async () => {
      if (!confirm("¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo con la contraseña.")) return;
      const { error: er } = await sb.auth.mfa.unenroll({ factorId: activa.id });
      if (er) return avisa(errTxt(er), true);
      avisa("Verificación en dos pasos desactivada"); pintaDosPasos();
    });
    $("b-dos-activar")?.addEventListener("click", activaDosPasos);
  };
  const activaDosPasos = async () => {
    const caja = $("dos-pasos");
    // Quita intentos anteriores sin terminar
    const { data: prev } = await sb.auth.mfa.listFactors();
    for (const f of (prev?.all || []).filter((x) => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Panel del comité " + new Date().toISOString().slice(0, 16) });
    if (error) return avisa(errTxt(error), true);
    const qr = String(data.totp.qr_code || "");
    caja.innerHTML = `
      <b>Activar la verificación en dos pasos</b>
      <ol class="pasos-dos">
        <li>Instala en tu móvil la app gratuita <b>Google Authenticator</b> (o Microsoft Authenticator).</li>
        <li>En la app, pulsa <b>+</b> y <b>Escanear un código QR</b>, y apunta a este código:</li>
      </ol>
      ${/^data:image\/svg\+xml/.test(qr) ? `<img class="qr-dos" src="${esc(qr)}" alt="Código QR para la app de códigos" width="180" height="180">` : ""}
      <p class="sub-vista">¿No puedes escanearlo? En la app elige «Introducir una clave» y escribe: <code class="clave-dos">${esc(data.totp.secret)}</code></p>
      <ol class="pasos-dos" start="3"><li>Escribe aquí las 6 cifras que te sale en la app:</li></ol>
      <form id="f-dos-activar" class="fila-dos" novalidate>
        <input id="dos-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" aria-label="Código de 6 cifras">
        <button type="submit" class="btn">${icono("check")}Confirmar</button>
        <button type="button" class="btn-linea" id="b-dos-cancelar">Cancelar</button>
      </form>
      <p class="estado" id="dos-estado" role="status"></p>`;
    $("dos-codigo").focus();
    $("b-dos-cancelar").addEventListener("click", async () => { await sb.auth.mfa.unenroll({ factorId: data.id }); pintaDosPasos(); });
    $("f-dos-activar").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("dos-codigo").value.replace(/\D/g, "");
      if (code.length !== 6) return estado($("dos-estado"), "Escribe las 6 cifras.", "mal");
      const { error: er } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code });
      if (er) return estado($("dos-estado"), "El código no es correcto. Espera a que cambie en la app y prueba otra vez.", "mal");
      avisa("Verificación en dos pasos activada"); pintaDosPasos();
    });
  };

  // ================== INSTALAR ==================
  let pideInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); pideInstalar = e;
    document.querySelectorAll("[data-instalar], [data-instalar-tarjeta]").forEach((b) => { b.hidden = false; });
  });
  const instalar = async () => {
    if (!pideInstalar) return avisa("Para instalarla: menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio».");
    pideInstalar.prompt(); await pideInstalar.userChoice; pideInstalar = null;
    document.querySelectorAll("[data-instalar], [data-instalar-tarjeta]").forEach((b) => { b.hidden = true; });
  };

  entrar();
  registraSW();
})();
