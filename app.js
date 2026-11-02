// Web pública del Comité de Empresa Calsina Carré
(function () {
  const $ = (id) => document.getElementById(id);
  const D = { actualidad: [], avisos: [], reuniones: [], actas: [], preguntas: [], miembros: [], encuestas: [], votos: {}, documentos: [], paginas: {} };
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const VISTAS = ["actualidad", "avisos", "reuniones", "actas", "buzon", "nosotros", "buscar", "privacidad"];
  const PESTANA_DE = { buscar: null, privacidad: null };

  // ---------- Iconos fijos del HTML ----------
  document.querySelectorAll("[data-ic]").forEach((s) => { s.innerHTML = icono(s.dataset.ic); });
  $("b-buscar").innerHTML = icono("buscar");
  $("mes-ant").innerHTML = icono("atras");
  $("mes-sig").innerHTML = icono("flecha");
  $("b-instalar-no").innerHTML = icono("cerrar");

  // ---------- Cabecera: tema, letra y buscar ----------
  const pintaTema = () => { $("b-tema").innerHTML = icono(TEMA.oscuro() ? "sol" : "luna"); };
  pintaTema();
  $("b-tema").addEventListener("click", () => { TEMA.cambiaTema(); pintaTema(); });
  $("b-letra").addEventListener("click", () => {
    const l = TEMA.cambiaLetra();
    $("b-letra").setAttribute("aria-label", "Tamaño de letra: " + ({ "": "normal", grande: "grande", "muy-grande": "muy grande" }[l]));
  });
  $("b-buscar").addEventListener("click", () => { location.hash = "buscar"; });

  // ---------- Navegación entre apartados ----------
  const irA = (hash, { foco = false } = {}) => {
    const h = (hash || "").replace(/^#/, "");
    let vista = VISTAS.includes(h) ? h : "actualidad", destino = null;
    if (h === "documentos") { vista = "actas"; ponSegmento("documentos"); }
    if (h === "avisos-movil") { vista = "avisos"; }
    const m = h.match(/^(noticia|aviso|reunion|acta|consulta|documento)-(\d+)$/);
    if (m) {
      vista = { noticia: "actualidad", aviso: "avisos", reunion: "reuniones", acta: "actas", consulta: "actualidad", documento: "actas" }[m[1]];
      destino = h;
    }
    VISTAS.forEach((v) => { $("v-" + v).hidden = v !== vista; });
    const pest = vista in PESTANA_DE ? PESTANA_DE[vista] : vista;
    document.querySelectorAll("#pestanas a").forEach((a) => {
      const sel = a.dataset.vista === pest;
      a.classList.toggle("activa", sel);
      if (sel) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest", inline: "center" }); } else a.removeAttribute("aria-current");
    });
    document.title = $("v-" + vista).dataset.titulo + " · Comité de Empresa Calsina Carré";
    if (vista === "avisos") marcaAvisosVistos();
    if (vista === "buscar") setTimeout(() => $("buscar-todo").focus(), 50);
    if (destino) {
      if (m[1] === "reunion") { const r = D.reuniones.find((x) => String(x.id) === m[2]); if (r && r.fecha < hoyISO()) $("pasadas-caja").open = true; }
      if (m[1] === "acta") { ponSegmento("actas"); filtroAno = "todos"; $("buscar-actas").value = ""; pintaActas(); }
      if (m[1] === "documento") ponSegmento("documentos");
      requestAnimationFrame(() => {
        const el = $(destino);
        if (el) { el.scrollIntoView({ block: "start" }); el.classList.add("resalta"); setTimeout(() => el.classList.remove("resalta"), 2200); }
      });
    } else if (h === "avisos-movil" && !$("push-caja").hidden) {
      requestAnimationFrame(() => { $("push-caja").scrollIntoView({ block: "start" }); $("push-caja").classList.add("resalta"); setTimeout(() => $("push-caja").classList.remove("resalta"), 2200); });
    } else window.scrollTo(0, 0);
    cuentaVisita(vista);
    if (foco && vista !== "buscar") $("contenido").focus({ preventScroll: true });
  };
  window.addEventListener("hashchange", () => irA(location.hash, { foco: true }));

  // ---------- Avisos sin leer (contador en la pestaña) ----------
  const marcaAvisosVistos = () => {
    if (!D.avisos.length) return;
    TEMA.guarda("comite-avisos-vistos", D.avisos[0].fecha);
    pintaCuenta();
  };
  const pintaCuenta = () => {
    const visto = TEMA.lee("comite-avisos-vistos");
    const n = visto ? D.avisos.filter((a) => a.fecha > visto).length : 0;
    const c = document.querySelector('[data-cuenta="avisos"]');
    c.hidden = !n; c.textContent = n; c.setAttribute("aria-label", n + " sin leer");
  };

  // ---------- Piezas (en render.js, compartidas con el panel) ----------
  const vacio = (txt) => `<p class="vacio">${esc(txt)}</p>`;
  const tarjetaNoticia = R.noticia, tarjetaAviso = R.aviso, tarjetaReunion = R.reunion, tarjetaActa = R.acta, tarjetaDocumento = R.documento;

  // ---------- Consultas anónimas ----------
  const abierta = R.abierta;
  const misVotos = () => { try { return JSON.parse(TEMA.lee("comite-votos") || "{}"); } catch (_) { return {}; } };
  const consultaHTML = (e) => R.consulta(e, D.votos[e.id] || {}, misVotos()[e.id] || 0);
  const pintaConsultas = () => {
    // Abiertas siempre; cerradas solo las de los últimos 30 días
    const lim = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const lista = D.encuestas.filter((e) => abierta(e) || e.cierra >= lim);
    $("consultas").innerHTML = lista.length ? `<h2 class="titulo-bloque">Consultas a la plantilla</h2><div class="lista">${lista.map(consultaHTML).join("")}</div>` : "";
  };
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-voto]"); if (!b) return;
    const [id, op] = b.dataset.voto.split(":").map(Number);
    const caja = b.closest(".consulta"), est = caja.querySelector(".estado");
    caja.querySelectorAll("[data-voto]").forEach((x) => { x.disabled = true; });
    est.className = "estado"; est.textContent = "Enviando tu voto…";
    const { error } = await sb.rpc("votar_encuesta", { p_id: id, p_opcion: op });
    if (error) {
      est.textContent = /fetch|network/i.test(error.message) ? "No hay conexión. Prueba de nuevo." : error.message;
      est.classList.add("mal");
      caja.querySelectorAll("[data-voto]").forEach((x) => { x.disabled = false; });
      return;
    }
    const mv = misVotos(); mv[id] = op; TEMA.guarda("comite-votos", JSON.stringify(mv));
    const { data } = await sb.from("encuesta_votos").select("*").eq("encuesta_id", id);
    if (data) { D.votos[id] = {}; data.forEach((r) => { D.votos[id][r.opcion] = r.n; }); }
    else { (D.votos[id] ||= {})[op] = ((D.votos[id] || {})[op] || 0) + 1; }
    caja.outerHTML = consultaHTML(D.encuestas.find((e) => e.id === id));
  });

  // ---------- Novedades desde tu última visita ----------
  let ultimaVisita = null;
  const NOV = [
    ["avisos", "fecha", "aviso", "avisos", "aviso"],
    ["actualidad", "creado", "noticia", "noticias", "noticia"],
    ["reuniones", "creado", "reunión", "reuniones", "reunion"],
    ["actas", "creado", "acta", "actas", "acta"],
    ["encuestas", "creado", "consulta", "consultas", "consulta"],
    ["documentos", "creado", "documento", "documentos", "documento"],
  ];
  const pintaNovedades = () => {
    if (!ultimaVisita) { $("novedades").innerHTML = ""; return; }
    const partes = [], enlaces = [];
    NOV.forEach(([t, campo, uno, varios, ancla]) => {
      const nuevos = D[t].filter((x) => x[campo] && x[campo] > ultimaVisita);
      if (!nuevos.length) return;
      partes.push(nuevos.length + " " + (nuevos.length === 1 ? uno : varios));
      enlaces.push(`<a href="#${ancla}-${nuevos[0].id}">${esc(nuevos.length === 1 ? (nuevos[0].titulo || nuevos[0].pregunta) : "Ver " + varios)}</a>`);
    });
    $("novedades").innerHTML = partes.length
      ? `<div class="novedades"><b>Novedades desde tu última visita:</b> ${esc(partes.join(", "))}<div class="nov-enlaces">${enlaces.join("")}</div></div>`
      : `<div class="novedades al-dia">${icono("check")}<span>Estás al día: no hay nada nuevo desde tu última visita.</span></div>`;
  };

  // ---------- Actualidad (portada) ----------
  const pintaActualidad = () => {
    $("bienvenida").textContent = D.paginas.bienvenida || "";
    $("bienvenida").hidden = !D.paginas.bienvenida;
    const urg = D.avisos.find((a) => a.urgente && Date.now() - new Date(a.fecha) < 14 * 86400000);
    $("urgente").innerHTML = urg ? `
      <a class="rotulo urgente" href="#aviso-${urg.id}">
        <span class="etq rojo">${icono("alerta")}Urgente</span>
        <b>${esc(urg.titulo)}</b>
        <span class="rotulo-txt">${esc(String(urg.contenido || "").replace(/\*\*/g, "").slice(0, 160))}${(urg.contenido || "").length > 160 ? "…" : ""}</span>
        <span class="rotulo-ir">Ver el aviso completo${icono("flecha")}</span>
      </a>` : "";
    const prox = D.reuniones.find((r) => r.fecha >= hoyISO());
    $("proxima").innerHTML = prox ? (() => {
      const dias = Math.round((fechaDia(prox.fecha) - fechaDia(hoyISO())) / 86400000);
      return `
      <a class="rotulo cita" href="#reunion-${prox.id}">
        <span class="rotulo-etq">Próxima reunión</span>
        <b>${esc(prox.titulo)}</b>
        <span class="rotulo-txt">${icono("calendario")}${esc(fechaSemana(prox.fecha))}${prox.hora ? " · " + esc(horario(prox)) : ""}</span>
        ${prox.lugar ? `<span class="rotulo-txt">${icono("lugar")}${esc(prox.lugar)}</span>` : ""}
        <span class="faltan">${dias === 0 ? "Es hoy" : dias === 1 ? "Mañana" : "Faltan " + dias + " días"}</span>
      </a>`;
    })() : "";
    pintaNovedades();
    pintaConsultas();
    $("lista-actualidad").innerHTML = D.actualidad.map(tarjetaNoticia).join("") || vacio("Todavía no hay noticias publicadas.");
  };

  // ---------- Avisos ----------
  const pintaAvisos = () => {
    $("lista-avisos").innerHTML = D.avisos.map(tarjetaAviso).join("") || vacio("No hay avisos.");
    pintaCuenta();
  };

  // ---------- Calendario de reuniones ----------
  const mesVisto = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  const pintaMes = () => {
    const a = mesVisto.getFullYear(), m = mesVisto.getMonth();
    const nombre = mesVisto.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    $("mes-nombre").textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    const primero = (new Date(a, m, 1).getDay() + 6) % 7, dias = new Date(a, m + 1, 0).getDate();
    const porDia = {};
    D.reuniones.forEach((r) => { (porDia[r.fecha] ||= []).push(r); });
    const hoy = hoyISO();
    let h = "";
    for (let i = 0; i < primero; i++) h += "<span></span>";
    for (let d = 1; d <= dias; d++) {
      const iso = `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, rs = porDia[iso];
      const cls = ["dia-mes", iso === hoy ? "hoy" : "", rs ? "con" : ""].join(" ");
      h += rs
        ? `<a class="${cls}" href="#reunion-${rs[0].id}" aria-label="${d}: ${esc(rs.map((r) => r.titulo).join(", "))}">${d}<i></i></a>`
        : `<span class="${cls}">${d}</span>`;
    }
    $("mes-rejilla").innerHTML = h;
  };
  $("mes-ant").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() - 1); pintaMes(); });
  $("mes-sig").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() + 1); pintaMes(); });

  const pintaReuniones = () => {
    const hoy = hoyISO();
    const prox = D.reuniones.filter((r) => r.fecha >= hoy);
    const pas = D.reuniones.filter((r) => r.fecha < hoy).reverse();
    $("lista-proximas").innerHTML = prox.map(tarjetaReunion).join("") || vacio("No hay reuniones previstas por ahora.");
    $("lista-pasadas").innerHTML = pas.map(tarjetaReunion).join("");
    $("pasadas-caja").hidden = !pas.length;
    pintaMes();
  };

  // ---------- Actas y documentos ----------
  let filtroAno = "todos";
  function ponSegmento(s) {
    ["actas", "documentos"].forEach((k) => {
      $("seg-" + k).setAttribute("aria-selected", String(k === s));
      $("bloque-" + k).hidden = k !== s;
    });
  }
  $("seg-actas").addEventListener("click", () => { ponSegmento("actas"); history.replaceState(null, "", "#actas"); });
  $("seg-documentos").addEventListener("click", () => { ponSegmento("documentos"); history.replaceState(null, "", "#documentos"); });

  const pintaActas = () => {
    const anos = [...new Set(D.actas.map((a) => a.fecha.slice(0, 4)))];
    $("anos-actas").innerHTML = anos.length > 1 ? ["todos", ...anos].map((y) =>
      `<button type="button" class="chip${filtroAno === y ? " activa" : ""}" data-ano="${y}" aria-pressed="${filtroAno === y}">${y === "todos" ? "Todas" : y}</button>`).join("") : "";
    const q = $("buscar-actas").value.trim().toLowerCase();
    const lista = D.actas.filter((a) => (filtroAno === "todos" || a.fecha.startsWith(filtroAno))
      && (!q || [a.titulo, a.tipo, a.resumen, a.acuerdos].join(" ").toLowerCase().includes(q)));
    $("lista-actas").innerHTML = lista.map(tarjetaActa).join("")
      || vacio(q ? "No hay actas con esas palabras." : "Todavía no hay actas publicadas.");
  };
  $("buscar-actas").addEventListener("input", pintaActas);
  $("anos-actas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ano]"); if (!b) return;
    filtroAno = b.dataset.ano; pintaActas();
  });
  const pintaDocumentos = () => {
    const grupos = {};
    D.documentos.forEach((d) => { (grupos[d.categoria || "General"] ||= []).push(d); });
    const nombres = Object.keys(grupos);
    $("lista-documentos").innerHTML = nombres.map((g) =>
      `${nombres.length > 1 ? `<h2 class="titulo-bloque">${esc(g)}</h2>` : ""}<div class="lista">${grupos[g].map(tarjetaDocumento).join("")}</div>`).join("")
      || vacio("Todavía no hay documentos.");
  };

  // ---------- Sugerencias y preguntas ----------
  const pintaPreguntas = () => {
    $("lista-preguntas").innerHTML = D.preguntas.map((p) => R.pregunta(p)).join("") || vacio("Todavía no hay preguntas respondidas.");
  };
  $("buzon-texto").addEventListener("input", (e) => { $("buzon-cuenta").textContent = e.target.value.length; });
  $("form-buzon").addEventListener("submit", async (e) => {
    e.preventDefault();
    const est = $("buzon-estado"), txt = $("buzon-texto").value.trim();
    est.className = "estado";
    if (txt.length < 5) { est.textContent = "Escribe un poco más (mínimo 5 letras)."; est.classList.add("mal"); return; }
    if (!$("buzon-acepto").checked) { est.textContent = "Marca la casilla para poder enviarlo."; est.classList.add("mal"); return; }
    const tipo = e.target.querySelector("[name=tipo]:checked").value;
    const b = $("buzon-enviar"); b.disabled = true; est.textContent = "Enviando…";
    try {
      const { error } = await sb.rpc("enviar_buzon", { p_tipo: tipo, p_texto: txt });
      if (error) throw error;
      e.target.reset(); $("buzon-cuenta").textContent = "0";
      est.textContent = "Enviado. Gracias: el comité lo leerá en su próxima revisión."; est.classList.add("bien");
    } catch (err) {
      const m = String(err.message || "");
      est.textContent = /Failed to fetch|NetworkError|network/i.test(m) ? "No hay conexión. Prueba de nuevo cuando tengas internet." : m || "No se ha podido enviar. Prueba de nuevo.";
      est.classList.add("mal");
    } finally { b.disabled = false; }
  });

  // ---------- Nosotros y privacidad ----------
  const pintaNosotros = () => {
    $("nosotros-texto").innerHTML = textoHTML(D.paginas.nosotros) || "<p>Información del comité próximamente.</p>";
    $("privacidad-texto").innerHTML = textoHTML(D.paginas.privacidad) || "<p>Esta web es solo informativa.</p>";
    $("lista-miembros").innerHTML = D.miembros.map(R.miembro).join("") || vacio("Pronto pondremos aquí quién forma el comité.");
  };

  // ---------- Buscar en toda la web ----------
  const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const buscar = () => {
    const q = sinAcentos($("buscar-todo").value.trim());
    if (q.length < 2) { $("buscar-info").textContent = "Escribe al menos 2 letras."; $("lista-buscar").innerHTML = ""; return; }
    const palabras = q.split(/\s+/);
    const casa = (...t) => { const s = sinAcentos(t.join(" ")); return palabras.every((p) => s.includes(p)); };
    const res = [
      ...D.avisos.filter((x) => casa(x.titulo, x.contenido)).map((x) => ["Aviso", x.titulo, "aviso-" + x.id, x.fecha]),
      ...D.actualidad.filter((x) => casa(x.titulo, x.contenido, x.categoria)).map((x) => ["Actualidad", x.titulo, "noticia-" + x.id, x.fecha]),
      ...D.reuniones.filter((x) => casa(x.titulo, x.descripcion, x.lugar, x.tipo)).map((x) => ["Reunión", x.titulo, "reunion-" + x.id, x.fecha]),
      ...D.actas.filter((x) => casa(x.titulo, x.resumen, x.acuerdos, x.tipo)).map((x) => ["Acta", x.titulo, "acta-" + x.id, x.fecha]),
      ...D.documentos.filter((x) => casa(x.titulo, x.descripcion, x.categoria, (x.adjuntos || []).map((a) => a.nombre).join(" "))).map((x) => ["Documento", x.titulo, "documento-" + x.id, null]),
      ...D.preguntas.filter((x) => casa(x.pregunta, x.respuesta)).map((x) => ["Pregunta frecuente", x.pregunta, "buzon", null]),
      ...D.encuestas.filter((x) => casa(x.pregunta, x.explicacion, x.opciones)).map((x) => ["Consulta", x.pregunta, "consulta-" + x.id, x.creado]),
    ];
    $("buscar-info").textContent = res.length ? res.length + (res.length === 1 ? " resultado" : " resultados") : "No hay nada con esas palabras. Prueba con otras, o pregúntanos en el buzón.";
    $("lista-buscar").innerHTML = res.map(([tipo, titulo, ancla, fecha]) => `
      <a class="tarjeta resultado" href="#${ancla}">
        <span class="meta"><span class="etq azul">${esc(tipo)}</span>${fecha ? `<span>${esc(fechaLarga(fecha))}</span>` : ""}</span>
        <b>${esc(titulo)}</b>${icono("flecha")}
      </a>`).join("");
  };
  $("buscar-todo").addEventListener("input", buscar);

  // ---------- Botones de compartir y calendario ----------
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-compartir]");
    if (c) { compartir(c.dataset.t, c.dataset.x, c.dataset.compartir); return; }
    const i = e.target.closest("[data-ics]");
    if (i) { const r = D.reuniones.find((x) => String(x.id) === i.dataset.ics); if (r) descargaICS(r); }
  });

  // ---------- Carga de datos ----------
  const pintaTodo = () => { pintaActualidad(); pintaAvisos(); pintaReuniones(); pintaActas(); pintaDocumentos(); pintaPreguntas(); pintaNosotros(); };
  const guardaCopia = () => TEMA.guarda("comite-copia", JSON.stringify({ t: Date.now(), D }));
  const leeCopia = () => { try { return JSON.parse(TEMA.lee("comite-copia") || "null"); } catch (_) { return null; } };

  const cargar = async () => {
    const r = await Promise.all([
      sb.from("actualidad").select("*").eq("publicado", true).order("fecha", { ascending: false }).order("id", { ascending: false }),
      sb.from("avisos").select("*").order("fecha", { ascending: false }),
      sb.from("reuniones").select("*").order("fecha").order("hora", { nullsFirst: true }),
      sb.from("actas").select("*").order("fecha", { ascending: false }),
      sb.from("preguntas").select("*").order("orden").order("id"),
      sb.from("miembros").select("*").order("orden").order("id"),
      sb.from("encuestas").select("*").eq("publicada", true).order("creado", { ascending: false }),
      sb.from("documentos").select("*").order("categoria").order("orden").order("id"),
      sb.from("encuesta_votos").select("*"),
      sb.from("paginas").select("*"),
    ]);
    const fallo = r.find((x) => x.error);
    if (fallo) throw fallo.error;
    const ahora = new Date().toISOString();
    [D.actualidad, D.avisos, D.reuniones, D.actas, D.preguntas, D.miembros, D.encuestas, D.documentos] = r.slice(0, 8).map((x) => x.data || []);
    // Si el panel está abierto en este navegador, el servidor le da también lo programado: aquí no se enseña
    D.avisos = D.avisos.filter((a) => !a.publicar_en || a.publicar_en <= ahora);
    D.votos = {};
    (r[8].data || []).forEach((v) => { (D.votos[v.encuesta_id] ||= {})[v.opcion] = v.n; });
    D.paginas = Object.fromEntries((r[9].data || []).map((p) => [p.slug, p.contenido]));
  };

  let primeraCarga = true;
  const arranca = async () => {
    // Primera visita: no avisar de avisos antiguos como "sin leer"
    const primera = !TEMA.lee("comite-avisos-vistos");
    if (primeraCarga) { ultimaVisita = TEMA.lee("comite-ultima-visita"); }
    try {
      await cargar();
      guardaCopia();
      $("sin-red").hidden = true;
      if (primeraCarga) TEMA.guarda("comite-ultima-visita", new Date().toISOString());
    } catch (_) {
      const c = leeCopia();
      if (c) Object.assign(D, c.D);
      $("sin-red").innerHTML = icono("sinred") + (c
        ? `<span>Sin conexión. Estás viendo la información guardada el ${esc(new Date(c.t).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}.</span>`
        : "<span>Sin conexión. Conéctate a internet para ver la información.</span>");
      $("sin-red").hidden = false;
    }
    if (primera && D.avisos.length) TEMA.guarda("comite-avisos-vistos", D.avisos[0].fecha);
    pintaTodo();
    if (primeraCarga) irA(location.hash);
    if (!$("v-buscar").hidden) buscar();
    primeraCarga = false;
  };
  window.addEventListener("online", arranca);
  // Al volver a la app después de un rato, se actualiza sola
  let oculta = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") oculta = Date.now();
    else if (oculta && Date.now() - oculta > 5 * 60000) arranca();
  });

  // ---------- Estadísticas (solo números por día; sin datos de quién entra) ----------
  // No cuenta en el móvil de quien publica (el que ha entrado alguna vez en el panel)
  const cuentaVisita = (vista) => {
    if (TEMA.lee("comite-admin-email") || /prueba/.test(location.search)) return;
    const hoy = hoyISO();
    try {
      if (TEMA.lee("comite-visita-dia") !== hoy) {
        TEMA.guarda("comite-visita-dia", hoy);
        sb.rpc("contar_visita", { p_seccion: "total" }).then(() => {}, () => {});
        if (instalada) sb.rpc("contar_visita", { p_seccion: "app" }).then(() => {}, () => {});
      }
      const k = "comite-vista-" + vista, ses = sessionStorage.getItem(k);
      if (!ses && ["actualidad", "avisos", "reuniones", "actas", "buzon", "nosotros", "buscar"].includes(vista)) {
        sessionStorage.setItem(k, "1");
        sb.rpc("contar_visita", { p_seccion: vista === "actas" && !$("bloque-documentos").hidden ? "documentos" : vista }).then(() => {}, () => {});
      }
    } catch (_) {}
  };

  // ---------- Avisos al móvil (notificaciones) ----------
  const PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const claveBytes = (b64) => { const p = "=".repeat((4 - (b64.length % 4)) % 4), s = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  const pintaPush = (activo) => {
    $("push-off").hidden = !!activo; $("push-on").hidden = !activo;
    $("barra-campana").classList.toggle("activo", !!activo);
  };
  const preparaPush = async () => {
    const caja = $("push-caja");
    if (!PUSH_OK) {
      // iPhone: los avisos solo funcionan con la app instalada (iOS 16.4 o más nuevo)
      if (esIOS && !instalada) {
        caja.hidden = false; $("push-off").hidden = true;
        $("push-txt").textContent = "En iPhone, primero instala la app: en Safari pulsa Compartir y luego «Añadir a pantalla de inicio». Ábrela desde el icono y aquí podrás activar los avisos.";
      }
      return;
    }
    caja.hidden = false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      pintaPush(sub && Notification.permission === "granted");
    } catch (_) { pintaPush(false); }
  };
  $("push-activar").addEventListener("click", async () => {
    const est = $("push-estado");
    estado(est, "");
    if (!$("push-acepto").checked) return estado(est, "Marca la casilla para poder activarlos.", "mal");
    // El permiso se pide en el mismo toque (si no, algunos móviles no lo enseñan)
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return estado(est, "El móvil no ha dado permiso. Puedes cambiarlo en los ajustes del navegador o de la app: Notificaciones → Permitir.", "mal");
    estado(est, "Activando…");
    try {
      const [{ data: clave, error }, reg] = await Promise.all([sb.rpc("clave_push_publica"), navigator.serviceWorker.ready]);
      if (error || !clave) throw error || new Error("Los avisos todavía no están preparados. Prueba más tarde.");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(clave) });
      const j = sub.toJSON();
      const r = await sb.rpc("suscribir_push", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
      if (r.error) throw r.error;
      pintaPush(true);
      estado(est, "Listo. Te avisaremos cuando el comité publique algo.", "bien");
    } catch (e) {
      estado(est, /fetch|network/i.test(String(e?.message)) ? "No hay conexión. Prueba de nuevo." : (e?.message || "No se han podido activar. Prueba de nuevo."), "mal");
    }
  });
  $("push-desactivar").addEventListener("click", async () => {
    const est = $("push-estado");
    try {
      const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
      if (sub) { await sb.rpc("desuscribir_push", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
      pintaPush(false); $("push-acepto").checked = false;
      estado(est, "Avisos desactivados en este móvil.", "bien");
    } catch (e) { estado(est, "No se han podido desactivar. Prueba de nuevo.", "mal"); }
  });
  const estado = (el, txt, tipo = "") => { el.textContent = txt; el.className = "estado" + (tipo ? " " + tipo : ""); };

  // ---------- Instalar como app ----------
  const noQuiere = () => TEMA.lee("comite-no-instalar") === "1";
  let pideInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); pideInstalar = e;
    if (!noQuiere()) $("instalar").hidden = false;
  });
  $("b-instalar").addEventListener("click", async () => {
    if (!pideInstalar) return;
    pideInstalar.prompt(); await pideInstalar.userChoice; pideInstalar = null; $("instalar").hidden = true;
  });
  $("b-instalar-no").addEventListener("click", () => { $("instalar").hidden = true; TEMA.guarda("comite-no-instalar", "1"); });
  window.addEventListener("appinstalled", () => { $("instalar").hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !instalada && !noQuiere()) {
    $("instalar-txt").textContent = "En Safari, pulsa el botón Compartir y luego «Añadir a pantalla de inicio».";
    $("b-instalar").hidden = true;
    $("instalar").hidden = false;
  }

  arranca();
  registraSW();
  preparaPush();
})();
