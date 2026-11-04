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
  const SECCIONES = {
    avisos: {
      nombre: "Avisos", uno: "aviso", nuevo: "Nuevo aviso", ic: "megafono", tabla: "avisos", ancla: "aviso",
      orden: [["fecha", false]],
      ayuda: "Comunicados cortos. Si marcas «Urgente», sale destacado arriba en la portada durante 14 días.",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Cambio de turnos en noviembre" }],
        ["contenido", "Texto del aviso", "largo"],
        ["urgente", "Urgente: destacarlo arriba en la portada", "si", { def: false }],
        ["adjuntos", "Archivos adjuntos", "archivos"],
        ["notificar", "Avisar al móvil al publicar", "si", { def: true, soloNuevo: true, ayuda: "Llega una notificación a los móviles que tienen los avisos activados." }],
        ["_cambio", "Volver a avisar al móvil de este cambio", "si", { def: false, soloEditar: true }],
        ["publicar_en", "Programar para más tarde (opcional)", "fechahora", { ayuda: "Déjalo vacío para publicarlo ya. Si pones día y hora, no se verá hasta entonces." }],
      ],
      chips: (x) => [x.urgente && "Urgente", x.publicar_en && x.publicar_en > ahoraISO() && "Programado"],
      sub: (x) => resumen(x.contenido),
      previa: (x) => R.aviso(x),
      alGuardar: (v, orig) => { if (v.publicar_en && (!orig || orig.publicar_en !== v.publicar_en)) v.fecha = v.publicar_en; else if (!orig) v.fecha = ahoraISO(); },
    },
    actualidad: {
      nombre: "Actualidad", uno: "noticia", nuevo: "Nueva noticia", ic: "periodico", tabla: "actualidad", ancla: "noticia",
      orden: [["fecha", false], ["id", false]],
      ayuda: "Noticias e información para los trabajadores. Salen en la portada de la web.",
      campos: [
        ["titulo", "Título", "texto", { req: true, ph: "Ej.: Nuevo calendario laboral 2027" }],
        ["categoria", "Categoría", "texto", { lista: ["General", "Convenio", "Nóminas", "Salud laboral", "Vacaciones", "Formación", "Igualdad"], def: "General" }],
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
      ayuda: "Resumen y acuerdos de cada reunión. Puedes adjuntar el acta completa en PDF o fotos de las hojas.",
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

  // ================== MENÚ ==================
  const MENU = [
    [null, [["inicio", "Inicio", "inicio"], ["avisos"], ["actualidad"], ["reuniones"], ["actas"]]],
    ["La plantilla", [["buzon", "Buzón anónimo", "mensaje"], ["encuestas"], ["preguntas"]]],
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
  const PANTALLAS = ["s-entrar", "s-codigo", "s-nueva", "s-sinpermiso", "s-dos-pasos", "s-panel"];
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
    if (error) return estado(est, errTxt(error), "mal");
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
  const irA = (k) => {
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
    if (n) { cierraHoja(); abrirEditor(n.dataset.nuevo, null); }
  });
  $("fab").addEventListener("click", () => {
    // En una sección, «Nuevo» crea directamente; en las demás páginas, pregunta qué
    if (SECCIONES[actual]) abrirEditor(actual, null); else abreHojaNuevo();
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
    ["avisos", "Publicar un aviso", "Con archivos si quieres"],
    ["reuniones", "Añadir una reunión", "Comité, empresa o asamblea"],
    ["actas", "Subir un acta", "Resumen, acuerdos y PDF"],
    ["actualidad", "Escribir una noticia", "Información para la plantilla"],
    ["encuestas", "Hacer una consulta", "Votación anónima"],
    ["documentos", "Subir un documento", "Convenio, calendario, tablas…"],
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
      Promise.all(["avisos", "actualidad", "reuniones", "actas", "encuestas", "documentos"].map((t) =>
        sb.from(t).select("*").order(t === "avisos" ? "fecha" : "creado", { ascending: false }).limit(4).then((r) => (r.data || []).map((x) => ({ ...x, _t: t }))))),
      sb.from("buzon").select("id", { count: "exact", head: true }).eq("leido", false).eq("archivado", false),
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
  const NOMBRE_SECCION = { actualidad: "Actualidad", avisos: "Avisos", reuniones: "Reuniones", actas: "Actas", documentos: "Documentos", buzon: "Sugerencias y preguntas", nosotros: "Nosotros", buscar: "Buscador" };
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
    return `<div class="tarjeta fila${k === "avisos" && x.urgente ? " urgente" : ""}">
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
    let q = sb.from(S.tabla).select("*");
    S.orden.forEach(([c, asc]) => { q = q.order(c, { ascending: asc }); });
    const [r, v] = await Promise.all([q, k === "encuestas" ? sb.from("encuesta_votos").select("*") : Promise.resolve({ data: null })]);
    if (actual !== k) return;
    if (r.error) { $("filas").innerHTML = `<p class="vacio">${esc(errTxt(r.error))}</p>`; return; }
    if (v.data) { VOTOS = {}; v.data.forEach((x) => { (VOTOS[x.encuesta_id] ||= {})[x.opcion] = x.n; }); }
    FILAS = r.data;
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
      const grupo = actual === "documentos" ? FILAS.filter((x) => x.categoria === FILAS.find((y) => y.id === id).categoria) : FILAS;
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
      case "opcion": return `<label class="campo" data-campo="${col}"><span>${esc(etq)}</span><select id="${id}">${[...new Set([...(o.lista || []), val].filter(Boolean))].map((x) => `<option${x === val ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
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
        return `<label class="campo" data-campo="${col}"><span>${esc(etq)}${marca}</span><input type="${t}" id="${id}" value="${esc(v)}"${req}${ph}${o.lista ? ` list="dl-${col}"` : ""}>${dl}${ay}</label>`;
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
  $("ed-form").addEventListener("input", () => { ED.sucio = true; previa(); });
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

  // ================== AVISOS AL MÓVIL ==================
  const AVISABLE = ["avisos", "actualidad", "reuniones", "actas", "encuestas", "documentos"];
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
    ["bienvenida", "Bienvenida de la portada", "Una o dos frases que salen arriba en «Actualidad»."],
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
      <p class="sub-vista">Solo estos correos pueden crear su cuenta y publicar. La persona añadida entra con «¿Problemas para entrar?» → «Primera vez: crear la cuenta».</p>
      <div class="lista">${error ? `<p class="vacio">${esc(errTxt(error))}</p>` : data.map((a) => `
        <div class="tarjeta fila"><div class="fila-abre"><b>${esc(a.email)}</b>${a.email.toLowerCase() === yo ? '<span class="fila-sub">Tú</span>' : ""}</div>
        ${a.email.toLowerCase() === yo ? "" : `<button type="button" class="btn-linea peligro" data-quitar-admin="${esc(a.email)}">${icono("borrar")}Quitar</button>`}</div>`).join("")}</div>
      <form id="f-admin" class="tarjeta form-panel" novalidate>
        <label class="campo"><span>Dar acceso a otro email</span><input type="email" id="a-email" autocomplete="off" placeholder="nombre@ejemplo.com"></label>
        <button type="submit" class="btn">${icono("mas")}Dar acceso</button>
      </form>
      <h2 class="titulo-bloque">Seguridad de tu cuenta</h2>
      <div class="tarjeta seguridad" id="dos-pasos"><div class="esq"></div></div>
      <div class="tarjeta seguridad">
        <b>Cerrar la sesión en todos los dispositivos</b>
        <p class="sub-vista">Por si has entrado en un móvil u ordenador que no es tuyo. Tendrás que volver a entrar con tu contraseña.</p>
        <button type="button" class="btn-linea peligro" id="b-salir-todo">${icono("salir")}Cerrar en todos</button>
      </div>`;
    pintaDosPasos();
    $("b-salir-todo").addEventListener("click", async () => {
      if (!confirm("¿Cerrar la sesión del panel en todos los móviles y ordenadores?")) return;
      await sb.auth.signOut({ scope: "global" }); history.replaceState(null, "", "admin.html"); location.reload();
    });
    $("f-admin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("a-email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return avisa("Ese email no parece correcto", true);
      const { error: er } = await sb.from("admins").insert({ email });
      if (er) return avisa(/duplicate/i.test(er.message) ? "Ese email ya tiene acceso" : errTxt(er), true);
      avisa("Acceso dado"); pintaAccesos();
    });
    $("zona").querySelectorAll("[data-quitar-admin]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(`¿Quitar el acceso a ${b.dataset.quitarAdmin}?`)) return;
      const { error: er } = await sb.from("admins").delete().eq("email", b.dataset.quitarAdmin);
      if (er) return avisa(errTxt(er), true);
      avisa("Acceso quitado"); pintaAccesos();
    }));
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
