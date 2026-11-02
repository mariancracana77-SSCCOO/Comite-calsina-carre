// Panel del comité: publicar sin tocar código
(function () {
  const $ = (id) => document.getElementById(id);
  const PANEL_URL = WEB_URL + "admin.html";
  const TIPOS_REUNION = ["Reunión del comité", "Reunión con la empresa", "Asamblea", "Otra"];

  // ---------- Qué se puede editar ----------
  // Cada campo: [columna, etiqueta, tipo, opciones]
  const SECCIONES = {
    actualidad: {
      nombre: "Actualidad", tabla: "actualidad", orden: [["fecha", false], ["id", false]], nuevo: "Nueva noticia",
      ayuda: "Noticias e información para los trabajadores. Salen en la portada de la web.",
      campos: [
        ["titulo", "Título", "texto", { req: true }],
        ["categoria", "Categoría", "texto", { lista: ["General", "Convenio", "Nóminas", "Salud laboral", "Vacaciones", "Formación"], def: "General" }],
        ["fecha", "Fecha", "fecha", { def: () => hoyISO(), req: true }],
        ["contenido", "Texto", "largo", { ayuda: "Deja una línea en blanco entre párrafos. Empieza una línea con «- » para hacer una lista. **así** sale en negrita." }],
        ["adjuntos", "Fotos y documentos", "archivos"],
        ["publicado", "Se ve en la web", "si", { def: true }],
      ],
      linea: (x) => [fechaLarga(x.fecha), x.categoria !== "General" ? x.categoria : "", x.publicado ? "" : "OCULTA"],
    },
    avisos: {
      nombre: "Avisos", tabla: "avisos", orden: [["fecha", false]], nuevo: "Nuevo aviso",
      ayuda: "Comunicados cortos. Si marcas «Urgente», sale destacado arriba en la portada durante 14 días.",
      campos: [
        ["titulo", "Título", "texto", { req: true }],
        ["contenido", "Texto", "largo"],
        ["urgente", "Urgente", "si", { def: false }],
        ["publicar_en", "Programar para más tarde (opcional)", "fechahora", { ayuda: "Déjalo vacío para publicarlo ya. Si pones una fecha, no se verá hasta entonces." }],
        ["adjuntos", "Fotos y documentos", "archivos"],
      ],
      linea: (x) => [fechaLarga(x.fecha), x.urgente ? "URGENTE" : "", x.publicar_en && x.publicar_en > new Date().toISOString() ? "Programado: " + new Date(x.publicar_en).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""],
      alGuardar: (v, orig) => { if (v.publicar_en && (!orig || orig.publicar_en !== v.publicar_en)) v.fecha = v.publicar_en; },
    },
    reuniones: {
      nombre: "Reuniones", tabla: "reuniones", orden: [["fecha", false]], nuevo: "Nueva reunión",
      ayuda: "El calendario de reuniones. La próxima sale en la portada.",
      campos: [
        ["titulo", "Título", "texto", { req: true }],
        ["tipo", "Tipo", "opcion", { lista: TIPOS_REUNION, def: TIPOS_REUNION[0] }],
        ["fecha", "Día", "fecha", { req: true }],
        ["hora", "Hora de inicio (opcional)", "hora"],
        ["hora_fin", "Hora de fin (opcional)", "hora"],
        ["lugar", "Lugar", "texto"],
        ["descripcion", "Orden del día o detalles", "largo"],
      ],
      linea: (x) => [fechaSemana(x.fecha) + " " + x.fecha.slice(0, 4), horario(x), x.tipo],
    },
    actas: {
      nombre: "Actas", tabla: "actas", orden: [["fecha", false]], nuevo: "Nueva acta",
      ayuda: "Resumen y acuerdos de cada reunión. Puedes adjuntar el acta completa en PDF.",
      campos: [
        ["titulo", "Título", "texto", { req: true }],
        ["tipo", "Tipo de reunión", "opcion", { lista: TIPOS_REUNION, def: TIPOS_REUNION[0] }],
        ["fecha", "Fecha de la reunión", "fecha", { req: true, def: () => hoyISO() }],
        ["resumen", "Resumen", "largo"],
        ["acuerdos", "Acuerdos", "largo", { ayuda: "Un acuerdo por línea, empezando con «- »." }],
        ["adjuntos", "Acta en PDF u otros documentos", "archivos"],
      ],
      linea: (x) => [fechaLarga(x.fecha), x.tipo, (x.adjuntos || []).length ? (x.adjuntos.length + " archivo(s)") : ""],
    },
    preguntas: {
      nombre: "Preguntas frecuentes", tabla: "preguntas", orden: [["orden", true], ["id", true]], nuevo: "Nueva pregunta",
      ayuda: "Salen en «Sugerencias y preguntas». Puedes crearlas a partir de lo que llega al buzón.",
      campos: [
        ["pregunta", "Pregunta", "texto", { req: true }],
        ["respuesta", "Respuesta", "largo"],
        ["orden", "Orden (los números bajos salen primero)", "numero", { def: 0 }],
      ],
      linea: (x) => [x.respuesta ? "" : "SIN RESPUESTA"],
      titulo: (x) => x.pregunta,
    },
    miembros: {
      nombre: "Miembros", tabla: "miembros", orden: [["orden", true], ["id", true]], nuevo: "Nuevo miembro",
      ayuda: "Quién forma el comité (sale en «Nosotros»). Pon teléfono o email solo si esa persona está de acuerdo.",
      campos: [
        ["nombre", "Nombre", "texto", { req: true }],
        ["cargo", "Cargo", "texto", { lista: ["Presidente/a", "Secretario/a", "Miembro del comité", "Delegado/a de prevención"], def: "Miembro del comité" }],
        ["sindicato", "Sindicato (opcional)", "texto"],
        ["detalle", "Detalle (centro, turno, de qué se ocupa…)", "texto"],
        ["telefono", "Teléfono (solo con su permiso)", "tel"],
        ["email", "Email (solo con su permiso)", "email"],
        ["orden", "Orden (los números bajos salen primero)", "numero", { def: 0 }],
      ],
      linea: (x) => [x.cargo, x.sindicato],
      titulo: (x) => x.nombre,
    },
  };
  const PESTANAS = [["buzon", "Buzón"], ["actualidad"], ["avisos"], ["reuniones"], ["actas"], ["preguntas"], ["miembros"], ["textos", "Textos"], ["accesos", "Accesos"]];

  // ---------- Utilidades ----------
  let avisoT;
  const avisa = (txt, mal = false) => {
    const a = $("aviso-flotante");
    a.textContent = txt; a.className = "aviso-flotante" + (mal ? " mal" : ""); a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 3500);
  };
  const errTxt = (e) => {
    const m = String(e?.message || e || "");
    if (/Failed to fetch|NetworkError/i.test(m)) return "No hay conexión. Prueba de nuevo.";
    if (/row-level security|permission denied/i.test(m)) return "No tienes permiso para hacer esto.";
    if (/Invalid login credentials/i.test(m)) return "Email o contraseña incorrectos.";
    if (/Email not confirmed/i.test(m)) return "Todavía no has confirmado el email: abre el enlace que te enviamos.";
    if (/User already registered/i.test(m)) return "Esta cuenta ya existe. Entra con tu contraseña o pulsa «He olvidado la contraseña».";
    if (/no está autorizado|Database error saving new user/i.test(m)) return "Este email no está autorizado para el panel.";
    if (/Password should be at least/i.test(m)) return "La contraseña es demasiado corta.";
    if (/rate limit|security purposes/i.test(m)) return "Demasiados intentos seguidos. Espera unos minutos.";
    return m || "Ha fallado algo. Prueba de nuevo.";
  };
  const muestra = (id) => ["p-entrar", "p-nueva", "p-sinpermiso", "p-panel"].forEach((p) => { $(p).hidden = p !== id; });
  const pintaTema = () => { $("b-tema").innerHTML = icono(TEMA.oscuro() ? "sol" : "luna"); };
  pintaTema();
  $("b-tema").addEventListener("click", () => { TEMA.cambiaTema(); pintaTema(); });
  $("b-salir").innerHTML = icono("salir");
  $("b-salir").addEventListener("click", async () => { await sb.auth.signOut(); location.hash = ""; location.reload(); });

  // ---------- Sesión ----------
  let recuperando = /type=recovery/.test(location.hash);
  const entrar = async () => {
    if (recuperando) { muestra("p-nueva"); return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { muestra("p-entrar"); $("b-salir").hidden = true; $("nav-panel").hidden = true; return; }
    $("quien").textContent = session.user.email;
    $("b-salir").hidden = false;
    const { data: esAdmin, error } = await sb.rpc("is_admin");
    if (error || !esAdmin) { muestra("p-sinpermiso"); return; }
    muestra("p-panel");
    $("nav-panel").hidden = false;
    pintaPestanas();
    irA(location.hash.slice(1) || "buzon");
  };
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "PASSWORD_RECOVERY") { recuperando = true; muestra("p-nueva"); }
  });

  $("f-entrar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("e-estado"); est.className = "estado"; est.textContent = "Entrando…";
    const { error } = await sb.auth.signInWithPassword({ email: $("e-email").value.trim(), password: $("e-clave").value });
    if (error) { est.textContent = errTxt(error); est.classList.add("mal"); return; }
    est.textContent = ""; entrar();
  });
  $("b-primera").addEventListener("click", async () => {
    const est = $("e-estado"), email = $("e-email").value.trim(), clave = $("e-clave").value;
    est.className = "estado";
    if (!email || clave.length < 8) { est.textContent = "Escribe tu email y la contraseña que quieres usar (mínimo 8 letras o números) y vuelve a pulsar."; est.classList.add("mal"); return; }
    est.textContent = "Creando la cuenta…";
    const { data, error } = await sb.auth.signUp({ email, password: clave, options: { emailRedirectTo: PANEL_URL } });
    if (error) { est.textContent = errTxt(error); est.classList.add("mal"); return; }
    if (data.session) { est.textContent = ""; entrar(); return; }
    est.textContent = "Te hemos enviado un email. Ábrelo y pulsa el enlace para confirmar; después ya puedes entrar."; est.classList.add("bien");
  });
  $("b-olvido").addEventListener("click", async () => {
    const est = $("e-estado"), email = $("e-email").value.trim();
    est.className = "estado";
    if (!email) { est.textContent = "Escribe tu email arriba y vuelve a pulsar."; est.classList.add("mal"); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: PANEL_URL });
    if (error) { est.textContent = errTxt(error); est.classList.add("mal"); return; }
    est.textContent = "Si el email está autorizado, te llegará un enlace para poner una contraseña nueva."; est.classList.add("bien");
  });
  $("f-nueva").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("n-estado"), clave = $("n-clave").value;
    est.className = "estado";
    if (clave.length < 8) { est.textContent = "Mínimo 8 letras o números."; est.classList.add("mal"); return; }
    const { error } = await sb.auth.updateUser({ password: clave });
    if (error) { est.textContent = errTxt(error); est.classList.add("mal"); return; }
    recuperando = false; history.replaceState(null, "", "admin.html"); avisa("Contraseña guardada"); entrar();
  });

  // ---------- Pestañas del panel ----------
  let actual = "buzon";
  const pintaPestanas = () => {
    $("pestanas-panel").innerHTML = PESTANAS.map(([k, n]) =>
      `<a href="#${k}" data-vista="${k}">${esc(n || SECCIONES[k].nombre)}${k === "buzon" ? '<span class="cuenta" id="cuenta-buzon" hidden></span>' : ""}</a>`).join("");
    cuentaBuzon();
  };
  const irA = (k) => {
    if (!PESTANAS.some((p) => p[0] === k)) k = "buzon";
    actual = k;
    document.querySelectorAll("#pestanas-panel a").forEach((a) => {
      const s = a.dataset.vista === k; a.classList.toggle("activa", s);
      if (s) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest", inline: "center" }); } else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    if (k === "buzon") return pintaBuzon();
    if (k === "textos") return pintaTextos();
    if (k === "accesos") return pintaAccesos();
    pintaLista(k);
  };
  window.addEventListener("hashchange", () => { if (!$("p-panel").hidden) irA(location.hash.slice(1)); });
  const V = () => $("vista-panel");

  // ---------- Listas ----------
  let FILAS = [];
  const pintaLista = async (k) => {
    const S = SECCIONES[k];
    V().innerHTML = `<div class="cab-seccion"><h1 class="titulo-vista">${esc(S.nombre)}</h1>
      <button type="button" class="btn" id="b-nuevo">${icono("mas")}${esc(S.nuevo)}</button></div>
      <p class="sub-vista">${esc(S.ayuda)}</p><div class="lista" id="filas"><div class="esq"></div></div>`;
    $("b-nuevo").addEventListener("click", () => abrirEditor(k, null));
    let q = sb.from(S.tabla).select("*");
    S.orden.forEach(([c, asc]) => { q = q.order(c, { ascending: asc }); });
    const { data, error } = await q;
    if (actual !== k) return;
    if (error) { $("filas").innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    FILAS = data;
    $("filas").innerHTML = data.map((x) => `
      <div class="tarjeta fila-panel">
        <div class="fila-txt"><b>${esc((S.titulo || ((y) => y.titulo))(x))}</b>
          <small>${S.linea(x).filter(Boolean).map(esc).join(" · ")}</small></div>
        <div class="fila-btns">
          <button type="button" class="btn-linea" data-editar="${x.id}">${icono("editar")}Editar</button>
          <button type="button" class="btn-linea peligro" data-borrar="${x.id}" aria-label="Borrar">${icono("borrar")}</button>
        </div>
      </div>`).join("") || `<p class="vacio">Todavía no hay nada. Pulsa «${esc(S.nuevo)}».</p>`;
  };
  document.addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-editar]");
    if (ed) { abrirEditor(actual, FILAS.find((x) => String(x.id) === ed.dataset.editar)); return; }
    const bo = e.target.closest("[data-borrar]");
    if (bo) {
      const S = SECCIONES[actual], x = FILAS.find((y) => String(y.id) === bo.dataset.borrar);
      if (!x || !confirm(`¿Borrar «${(S.titulo || ((y) => y.titulo))(x)}»? No se puede deshacer.`)) return;
      const { error } = await sb.from(S.tabla).delete().eq("id", x.id);
      if (error) return avisa(errTxt(error), true);
      borraArchivos(x.adjuntos);
      avisa("Borrado"); pintaLista(actual);
    }
  });

  // ---------- Editor ----------
  const aLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  const campoHTML = ([col, etq, tipo, o = {}], val) => {
    const id = "f-" + col, req = o.req ? " required" : "", ay = o.ayuda ? `<small class="ayuda">${esc(o.ayuda)}</small>` : "";
    const lista = o.lista ? ` list="dl-${col}"` : "", dl = o.lista && tipo !== "opcion" ? `<datalist id="dl-${col}">${o.lista.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>` : "";
    switch (tipo) {
      case "largo": return `<label class="campo"><span>${esc(etq)}</span><textarea id="${id}" rows="7">${esc(val ?? "")}</textarea>${ay}</label>`;
      case "si": return `<label class="casilla"><input type="checkbox" id="${id}"${val ? " checked" : ""}><span>${esc(etq)}</span></label>`;
      case "opcion": return `<label class="campo"><span>${esc(etq)}</span><select id="${id}">${[...new Set([...(o.lista || []), val].filter(Boolean))].map((x) => `<option${x === val ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
      case "archivos": return `<div class="campo"><span>${esc(etq)}</span><div id="lista-adj" class="lista-adj"></div>
        <label class="btn-linea subir">${icono("mas")}Añadir archivos<input type="file" id="f-subir" multiple accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.odt,.ods"></label>
        <small class="ayuda">PDF, fotos, Word o Excel. Máximo 20 MB cada uno.</small></div>`;
      default: {
        const t = { texto: "text", fecha: "date", hora: "time", fechahora: "datetime-local", numero: "number", tel: "tel", email: "email" }[tipo];
        const v = tipo === "fechahora" ? aLocal(val) : (val ?? "");
        return `<label class="campo"><span>${esc(etq)}</span><input type="${t}" id="${id}" value="${esc(v)}"${req}${lista}>${dl}${ay}</label>`;
      }
    }
  };
  let ADJ = [];
  const pintaAdj = () => {
    const l = $("lista-adj"); if (!l) return;
    l.innerHTML = ADJ.map((a, i) => `<div class="adj-fila">${icono(esImagen(a) ? "ojo" : "documento")}<span>${esc(a.nombre)}<small>${tipoTxt(a)}${a.tamano ? " · " + tamanoTxt(a.tamano) : ""}</small></span>
      <button type="button" class="cerrar" data-quitar-adj="${i}" aria-label="Quitar ${esc(a.nombre)}">${icono("cerrar")}</button></div>`).join("");
  };
  const limpiaNombre = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
  const subir = async (files, tabla) => {
    for (const f of files) {
      if (f.size > 20 * 1048576) { avisa(`«${f.name}» pesa más de 20 MB`, true); continue; }
      avisa(`Subiendo «${f.name}»…`);
      const ruta = `${tabla}/${Date.now()}-${limpiaNombre(f.name)}`;
      const { error } = await sb.storage.from("documentos").upload(ruta, f, { contentType: f.type || undefined });
      if (error) { avisa(errTxt(error), true); continue; }
      const { data } = sb.storage.from("documentos").getPublicUrl(ruta);
      ADJ.push({ url: data.publicUrl, nombre: f.name, tipo: f.type, tamano: f.size, ruta });
      pintaAdj();
    }
    avisa("Archivos listos. Recuerda pulsar «Guardar».");
  };
  const borraArchivos = (lista) => {
    const rutas = (lista || []).map((a) => a.ruta).filter(Boolean);
    if (rutas.length) sb.storage.from("documentos").remove(rutas).then(() => {}, () => {});
  };

  const abrirEditor = (k, x) => {
    const S = SECCIONES[k], nuevo = !x;
    ADJ = x?.adjuntos ? [...x.adjuntos] : [];
    const quitados = [];
    V().innerHTML = `
      <button type="button" class="btn-texto volver" id="b-volver">${icono("atras")}Volver a ${esc(S.nombre)}</button>
      <form id="f-editor" class="tarjeta form-panel" novalidate>
        <h1 class="titulo-vista">${nuevo ? esc(S.nuevo) : "Editar"}</h1>
        ${S.campos.map((c) => campoHTML(c, nuevo ? (typeof c[3]?.def === "function" ? c[3].def() : c[3]?.def) : x[c[0]])).join("")}
        <div class="botones-editor">
          <button type="submit" class="btn grande">${icono("check")}Guardar${nuevo ? " y publicar" : " cambios"}</button>
        </div>
        <p id="ed-estado" class="estado" role="status"></p>
      </form>`;
    pintaAdj();
    window.scrollTo(0, 0);
    const volver = () => pintaLista(k);
    $("b-volver").addEventListener("click", () => {
      // Lo subido y no guardado se borra para no dejar archivos sueltos
      if (nuevo) borraArchivos(ADJ); else borraArchivos(ADJ.filter((a) => !(x.adjuntos || []).some((b) => b.url === a.url)));
      volver();
    });
    $("f-subir")?.addEventListener("change", (e) => { subir([...e.target.files], S.tabla); e.target.value = ""; });
    $("lista-adj")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-quitar-adj]"); if (!b) return;
      quitados.push(...ADJ.splice(Number(b.dataset.quitarAdj), 1)); pintaAdj();
    });
    $("f-editor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const est = $("ed-estado"); est.className = "estado";
      const v = {};
      for (const [col, etq, tipo, o = {}] of S.campos) {
        const el = $("f-" + col);
        if (tipo === "archivos") { v[col] = ADJ; continue; }
        if (tipo === "si") { v[col] = el.checked; continue; }
        let val = el.value.trim();
        if (o.req && !val) { est.textContent = `Falta rellenar «${etq}».`; est.classList.add("mal"); el.focus(); return; }
        if (tipo === "numero") val = Number(val) || 0;
        else if (tipo === "fechahora") val = val ? new Date(val).toISOString() : null;
        else if (!val && ["hora", "fecha", "tel", "email"].includes(tipo)) val = null;
        v[col] = val;
      }
      S.alGuardar?.(v, x);
      est.textContent = "Guardando…";
      const r = nuevo ? await sb.from(S.tabla).insert(v) : await sb.from(S.tabla).update(v).eq("id", x.id);
      if (r.error) { est.textContent = errTxt(r.error); est.classList.add("mal"); return; }
      borraArchivos(quitados.filter((a) => !ADJ.some((b) => b.url === a.url)));
      avisa(nuevo ? "Publicado" : "Cambios guardados");
      volver();
    });
  };

  // ---------- Buzón ----------
  const cuentaBuzon = async () => {
    const { count } = await sb.from("buzon").select("id", { count: "exact", head: true }).eq("leido", false).eq("archivado", false);
    const c = $("cuenta-buzon"); if (!c) return;
    c.hidden = !count; c.textContent = count || "";
  };
  let verArchivados = false;
  const pintaBuzon = async () => {
    V().innerHTML = `<div class="cab-seccion"><h1 class="titulo-vista">Buzón</h1>
      <button type="button" class="btn-linea" id="b-archivados">${verArchivados ? "Ver los pendientes" : "Ver archivados"}</button></div>
      <p class="sub-vista">Sugerencias y preguntas anónimas de la plantilla. Solo las veis los administradores. Para contestar una pregunta a todos, pulsa «Responder en la web».</p>
      <div class="lista" id="filas"><div class="esq"></div></div>`;
    $("b-archivados").addEventListener("click", () => { verArchivados = !verArchivados; pintaBuzon(); });
    const { data, error } = await sb.from("buzon").select("*").eq("archivado", verArchivados).order("id", { ascending: false });
    if (actual !== "buzon") return;
    if (error) { $("filas").innerHTML = `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    FILAS = data;
    $("filas").innerHTML = data.map((m) => `
      <div class="tarjeta mensaje${m.leido ? "" : " sin-leer"}">
        <div class="meta"><span class="etq ${m.tipo === "Pregunta" ? "azul" : ""}">${esc(m.tipo)}</span><span>${esc(fechaLarga(m.dia))}</span>${m.leido ? "" : '<span class="etq rojo">Sin leer</span>'}</div>
        <div class="texto">${textoHTML(m.texto)}</div>
        <div class="acciones">
          ${m.leido ? "" : `<button type="button" class="btn-linea" data-leido="${m.id}">${icono("check")}Marcar leído</button>`}
          ${m.tipo === "Pregunta" ? `<button type="button" class="btn-linea" data-responder="${m.id}">${icono("mensaje")}Responder en la web</button>` : ""}
          <button type="button" class="btn-linea" data-archivar="${m.id}">${icono("archivo")}${m.archivado ? "Sacar del archivo" : "Archivar"}</button>
          <button type="button" class="btn-linea peligro" data-borrar-msg="${m.id}" aria-label="Borrar">${icono("borrar")}</button>
        </div>
      </div>`).join("") || `<p class="vacio">${verArchivados ? "No hay mensajes archivados." : "No hay mensajes pendientes."}</p>`;
    cuentaBuzon();
  };
  $("vista-panel").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-leido],[data-archivar],[data-borrar-msg],[data-responder]");
    if (!b || actual !== "buzon") return;
    const id = Number(b.dataset.leido || b.dataset.archivar || b.dataset.borrarMsg || b.dataset.responder);
    const m = FILAS.find((x) => x.id === id); if (!m) return;
    let r;
    if (b.dataset.leido) r = await sb.from("buzon").update({ leido: true }).eq("id", id);
    else if (b.dataset.archivar) r = await sb.from("buzon").update({ archivado: !m.archivado, leido: true }).eq("id", id);
    else if (b.dataset.borrarMsg) { if (!confirm("¿Borrar este mensaje? No se puede deshacer.")) return; r = await sb.from("buzon").delete().eq("id", id); }
    else {
      await sb.from("buzon").update({ leido: true }).eq("id", id);
      actual = "preguntas";
      history.replaceState(null, "", "#preguntas");
      document.querySelectorAll("#pestanas-panel a").forEach((a) => a.classList.toggle("activa", a.dataset.vista === "preguntas"));
      abrirEditor("preguntas", null);
      $("f-pregunta").value = m.texto;
      $("f-respuesta").focus();
      return;
    }
    if (r.error) return avisa(errTxt(r.error), true);
    pintaBuzon();
  });

  // ---------- Textos ----------
  const TEXTOS = [
    ["bienvenida", "Bienvenida de la portada", "Una o dos frases que salen arriba en «Actualidad»."],
    ["nosotros", "Texto de «Nosotros»", "Qué es el comité, qué hace y cómo contactar."],
  ];
  const pintaTextos = async () => {
    V().innerHTML = `<h1 class="titulo-vista">Textos</h1><p class="sub-vista">Textos fijos de la web.</p><div class="esq"></div>`;
    const { data, error } = await sb.from("paginas").select("*");
    if (actual !== "textos") return;
    if (error) { V().innerHTML += `<p class="vacio">${esc(errTxt(error))}</p>`; return; }
    const P = Object.fromEntries(data.map((p) => [p.slug, p.contenido]));
    V().innerHTML = `<h1 class="titulo-vista">Textos</h1><p class="sub-vista">Textos fijos de la web.</p>
      <form id="f-textos" class="tarjeta form-panel" novalidate>
        ${TEXTOS.map(([s, n, a]) => `<label class="campo"><span>${esc(n)}</span><textarea id="t-${s}" rows="6">${esc(P[s] || "")}</textarea><small class="ayuda">${esc(a)}</small></label>`).join("")}
        <button type="submit" class="btn grande">${icono("check")}Guardar textos</button>
        <p id="t-estado" class="estado" role="status"></p>
      </form>`;
    $("f-textos").addEventListener("submit", async (e) => {
      e.preventDefault();
      const filas = TEXTOS.map(([s]) => ({ slug: s, contenido: $("t-" + s).value.trim() }));
      const { error: er } = await sb.from("paginas").upsert(filas);
      if (er) { $("t-estado").textContent = errTxt(er); $("t-estado").className = "estado mal"; return; }
      avisa("Textos guardados");
    });
  };

  // ---------- Accesos ----------
  const pintaAccesos = async () => {
    const { data: { session } } = await sb.auth.getSession();
    const yo = (session?.user?.email || "").toLowerCase();
    const { data, error } = await sb.from("admins").select("email").order("email");
    if (actual !== "accesos") return;
    V().innerHTML = `<h1 class="titulo-vista">Accesos</h1>
      <p class="sub-vista">Emails que pueden entrar en este panel. La persona añadida entra con «Es la primera vez: crear mi contraseña».</p>
      <div class="lista">${error ? `<p class="vacio">${esc(errTxt(error))}</p>` : data.map((a) => `
        <div class="tarjeta fila-panel"><div class="fila-txt"><b>${esc(a.email)}</b>${a.email.toLowerCase() === yo ? "<small>Tú</small>" : ""}</div>
        ${a.email.toLowerCase() === yo ? "" : `<div class="fila-btns"><button type="button" class="btn-linea peligro" data-quitar-admin="${esc(a.email)}">${icono("borrar")}Quitar</button></div>`}</div>`).join("")}</div>
      <form id="f-admin" class="tarjeta form-panel" novalidate>
        <label class="campo"><span>Añadir un email</span><input type="email" id="a-email" autocomplete="off"></label>
        <button type="submit" class="btn">${icono("mas")}Dar acceso</button>
      </form>`;
    $("f-admin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("a-email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return avisa("Ese email no parece correcto", true);
      const { error: er } = await sb.from("admins").insert({ email });
      if (er) return avisa(/duplicate/i.test(er.message) ? "Ese email ya tiene acceso" : errTxt(er), true);
      avisa("Acceso dado"); pintaAccesos();
    });
    V().querySelectorAll("[data-quitar-admin]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(`¿Quitar el acceso a ${b.dataset.quitarAdmin}?`)) return;
      const { error: er } = await sb.from("admins").delete().eq("email", b.dataset.quitarAdmin);
      if (er) return avisa(errTxt(er), true);
      avisa("Acceso quitado"); pintaAccesos();
    }));
  };

  entrar();
  registraSW();
})();
