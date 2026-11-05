// Web pública del Comité de Empresa Calsina Carré
(function () {
  const $ = (id) => document.getElementById(id);
  const D = { actualidad: [], avisos: [], reuniones: [], actas: [], preguntas: [], miembros: [], encuestas: [], votos: {}, documentos: [], paginas: {}, apartados: [], publicaciones: [] };
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const VISTAS = ["actualidad", "avisos", "reuniones", "actas", "buzon", "nosotros", "seccion", "buscar", "privacidad", "aviso-legal", "cookies"];
  const PESTANA_DE = { buscar: null, privacidad: null, "aviso-legal": null, cookies: null };

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
    // v11: secciones propias (#seccion-N) y lo publicado en ellas (#publicacion-N)
    let pestSeccion = null;
    const ms = h.match(/^(seccion|publicacion)-(\d+)$/);
    if (ms) {
      const pub = ms[1] === "publicacion" ? D.publicaciones.find((x) => String(x.id) === ms[2]) : null;
      const idSec = pub ? pub.apartado_id : +ms[2];
      vista = "seccion"; pestSeccion = pintaSeccion(idSec);
      if (pub) destino = h;
    }
    const m = ms ? null : h.match(/^(noticia|aviso|reunion|acta|consulta|documento)-(\d+)$/);
    if (m) {
      vista = { noticia: "actualidad", aviso: "avisos", reunion: "reuniones", acta: "actas", consulta: "actualidad", documento: "actas" }[m[1]];
      destino = h;
    }
    VISTAS.forEach((v) => { $("v-" + v).hidden = v !== vista; });
    const pest = vista === "seccion" ? pestSeccion : vista in PESTANA_DE ? PESTANA_DE[vista] : vista;
    document.querySelectorAll("#pestanas a").forEach((a) => {
      const sel = a.dataset.vista === pest;
      a.classList.toggle("activa", sel);
      if (sel) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest", inline: "center" }); } else a.removeAttribute("aria-current");
    });
    // Instalada, la ventana ya pone el nombre de la app delante: no repetirlo
    document.title = $("v-" + vista).dataset.titulo + (instalada ? "" : " · Comité de Empresa Calsina Carré");
    if (vista === "avisos") marcaAvisosVistos();
    if (vista === "buscar") setTimeout(() => $("buscar-todo").focus(), 50);
    if (destino) {
      if (m && m[1] === "reunion") { const r = D.reuniones.find((x) => String(x.id) === m[2]); if (r && r.fecha < hoyISO()) $("pasadas-caja").open = true; }
      if (m && m[1] === "acta") { ponSegmento("actas"); filtroAno = "todos"; $("buscar-actas").value = ""; pintaActas(); }
      if (m && m[1] === "documento") ponSegmento("documentos");
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
  // Apartado sin contenido: icono, título, explicación y, si toca, un enlace útil
  const vacio = (titulo, txt = "", ic = "documento", enlace = null) => `
    <div class="vacio-caja">
      <span class="vacio-ic">${icono(ic)}</span>
      <b>${esc(titulo)}</b>
      ${txt ? `<p>${esc(txt)}</p>` : ""}
      ${enlace ? `<a class="btn-linea" href="${esc(enlace[0])}">${esc(enlace[1])}</a>` : ""}
    </div>`;
  const tarjetaNoticia = R.noticia, tarjetaAviso = R.aviso, tarjetaReunion = R.reunion, tarjetaActa = R.acta, tarjetaDocumento = R.documento;

  // ---------- Consultas anónimas ----------
  const abierta = R.abierta;
  const misVotos = () => { try { return JSON.parse(TEMA.lee("comite-votos") || "{}"); } catch (_) { return {}; } };
  const consultaHTML = (e) => R.consulta(e, D.votos[e.id] || {}, misVotos()[e.id] || 0);
  const pintaConsultas = () => {
    // Abiertas siempre; cerradas solo las de los últimos 30 días
    const lim = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const lista = D.encuestas.filter((e) => abierta(e) || e.cierra >= lim);
    $("consultas").innerHTML = lista.length ? `<div class="lista">${lista.map(consultaHTML).join("")}</div>` : "";
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
    ["actualidad", "creado", "anuncio", "anuncios", "noticia"],
    ["reuniones", "creado", "reunión", "reuniones", "reunion"],
    ["actas", "creado", "acta", "actas", "acta"],
    ["encuestas", "creado", "consulta", "consultas", "consulta"],
    ["documentos", "creado", "documento", "documentos", "documento"],
    ["publicaciones", "creado", "publicación", "publicaciones", "publicacion"],
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
    const hoyDest = D.avisos.find((a) => a.destacar_dia === hoyISO());
    const urg = hoyDest || D.avisos.find((a) => a.urgente && Date.now() - new Date(a.fecha) < 14 * 86400000);
    const txtCorto = (t, n) => { t = String(t || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
    $("urgente").innerHTML = urg ? `
      <a class="destacado urgente con-senal" href="#aviso-${urg.id}">
        <span class="rayas" aria-hidden="true"></span>${R.senal(true)}
        <span class="destacado-etq">${urg === hoyDest ? "Destacado hoy" : "Aviso urgente"}</span>
        <b>${esc(urg.titulo)}</b>
        ${urg.contenido ? `<span class="destacado-txt">${esc(txtCorto(urg.contenido, 150))}</span>` : ""}
        <span class="destacado-ir">Leer el aviso${icono("flecha")}</span>
      </a>` : "";
    const prox = D.reuniones.find((r) => r.fecha >= hoyISO());
    $("proxima").innerHTML = prox ? (() => {
      const dias = Math.round((fechaDia(prox.fecha) - fechaDia(hoyISO())) / 86400000), d = fechaDia(prox.fecha);
      return `
      <a class="destacado cita" href="#reunion-${prox.id}">
        <span class="destacado-cab"><span class="destacado-etq">${icono("calendario")}Próxima reunión</span><span class="faltan">${dias === 0 ? "Es hoy" : dias === 1 ? "Mañana" : "En " + dias + " días"}</span></span>
        <span class="cita-cuerpo">
          <span class="dia" aria-hidden="true"><b>${d.getDate()}</b><span>${d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span></span>
          <span class="cita-datos"><b>${esc(prox.titulo)}</b>
            <span class="destacado-txt">${esc(fechaSemana(prox.fecha))}${prox.hora ? " · " + esc(horario(prox)) : ""}</span>
            ${prox.lugar ? `<span class="destacado-txt">${icono("lugar")}${esc(prox.lugar)}</span>` : ""}</span>
        </span>
      </a>`;
    })() : "";
    pintaNovedades();
    pintaConsultas();
    $("lista-actualidad").innerHTML = D.actualidad.map(tarjetaNoticia).join("") || vacio("Todavía no hay anuncios", "Aquí saldrá la información general del comité: acuerdos, cambios de turnos y pausas, convenio, nóminas y todo lo que os afecta.", "periodico", ["#avisos-movil", "Avisarme cuando haya novedades"]);
  };

  // ---------- Avisos ----------
  const pintaAvisos = () => {
    $("lista-avisos").innerHTML = D.avisos.map(tarjetaAviso).join("") || vacio("No hay avisos por ahora", "Cuando el comité publique un aviso, saldrá aquí. Activa los avisos y te llegará al móvil.", "megafono");
    pintaCuenta();
  };

  // ---------- Calendario de reuniones ----------
  // Festivos (petición n.º 3 del panel): España en rojo, Cataluña con la senyera; las reuniones, en verde.
  // OJO: cada año hay que añadir el año nuevo aquí (calendario oficial del BOE y del DOGC). Sin festivos locales.
  const FESTIVOS = {
    "2026-01-01": ["es", "Año Nuevo"], "2026-01-06": ["es", "Reyes"], "2026-04-03": ["es", "Viernes Santo"], "2026-04-06": ["cat", "Lunes de Pascua"],
    "2026-05-01": ["es", "Fiesta del Trabajo"], "2026-06-24": ["cat", "Sant Joan"], "2026-08-15": ["es", "La Asunción"], "2026-09-11": ["cat", "Diada de Catalunya"],
    "2026-10-12": ["es", "Fiesta Nacional"], "2026-11-01": ["es", "Todos los Santos"], "2026-12-06": ["es", "Día de la Constitución"], "2026-12-08": ["es", "La Inmaculada"],
    "2026-12-25": ["es", "Navidad"], "2026-12-26": ["cat", "Sant Esteve"],
    // 2027 (petición n.º 6): BOE 13/10/2026 (BOE-A-2026-21254) y DOGC 1/4/2026 (ORDRE EMT/52/2026).
    // El 15 de agosto y Sant Esteve caen en domingo y no están en el calendario laboral.
    "2027-01-01": ["es", "Año Nuevo"], "2027-01-06": ["es", "Reyes"], "2027-03-26": ["es", "Viernes Santo"], "2027-03-29": ["cat", "Lunes de Pascua"],
    "2027-05-01": ["es", "Fiesta del Trabajo"], "2027-06-24": ["cat", "Sant Joan"], "2027-09-11": ["cat", "Diada de Catalunya"],
    "2027-10-12": ["es", "Fiesta Nacional"], "2027-11-01": ["es", "Todos los Santos"], "2027-12-06": ["es", "Día de la Constitución"], "2027-12-08": ["es", "La Inmaculada"],
    "2027-12-25": ["es", "Navidad"],
  };
  // Vista «Mes» o «Año entero» (petición n.º 6 del panel): en el año salen los 12 meses en pequeño;
  // al tocar el nombre de un mes se abre ese mes. Los festivos y las reuniones se tocan igual que en el mes.
  const mesVisto = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  let vistaCal = "mes";
  const nombreMes = (a, m, conAno) => { const n = new Date(a, m, 1).toLocaleDateString("es-ES", conAno ? { month: "long", year: "numeric" } : { month: "long" }); return n.charAt(0).toUpperCase() + n.slice(1); };
  const celdas = (a, m) => {
    const primero = (new Date(a, m, 1).getDay() + 6) % 7, dias = new Date(a, m + 1, 0).getDate();
    const porDia = {};
    D.reuniones.forEach((r) => { (porDia[r.fecha] ||= []).push(r); });
    const hoy = hoyISO(), mes = new Date(a, m, 1).toLocaleDateString("es-ES", { month: "long" });
    let h = "";
    for (let i = 0; i < primero; i++) h += "<span></span>";
    for (let d = 1; d <= dias; d++) {
      const iso = `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, rs = porDia[iso], fe = FESTIVOS[iso];
      const emp = rs && rs.some((r) => r.tipo === "Reunión con la empresa"); // con la empresa en azul, las demás en verde (n.º 6)
      const cls = ["dia-mes", iso === hoy ? "hoy" : "", rs ? (emp ? "con empresa" : "con") : "", fe ? "fest-" + fe[0] : ""].join(" ");
      const nombres = [...(rs || []).map((r) => r.titulo), ...(fe ? ["Festivo: " + fe[1]] : [])].join(", ");
      h += rs
        ? `<a class="${cls}" href="#reunion-${rs[0].id}" aria-label="${d} de ${mes}: ${esc(nombres)}">${d}<i></i></a>`
        : fe ? `<button type="button" class="${cls}" data-festivo="${esc(d + " de " + mes + " de " + a + ": " + fe[1] + (fe[0] === "cat" ? " (festivo de Cataluña)" : " (festivo de España)"))}" aria-label="${d} de ${mes}: ${esc(nombres)}"><b>${d}</b></button>` : `<span class="${cls}">${d}</span>`;
    }
    return h;
  };
  const pintaMes = () => {
    const a = mesVisto.getFullYear(), m = mesVisto.getMonth(), ano = vistaCal === "ano";
    $("ver-mes").setAttribute("aria-selected", String(!ano)); $("ver-ano").setAttribute("aria-selected", String(ano));
    $("mes-ant").setAttribute("aria-label", ano ? "Año anterior" : "Mes anterior");
    $("mes-sig").setAttribute("aria-label", ano ? "Año siguiente" : "Mes siguiente");
    $("mes-nombre").textContent = ano ? String(a) : nombreMes(a, m, true);
    $("mes-cuerpo").hidden = ano; $("ano-rejilla").hidden = !ano;
    $("mes-calendario").classList.toggle("ano", ano);
    if (ano) {
      let h = "";
      for (let i = 0; i < 12; i++) h += `<section class="ano-mes"><button type="button" class="ano-mes-nombre" data-mes="${i}" aria-label="Ver ${nombreMes(a, i, true)}">${nombreMes(a, i)}</button><div class="mes-dias" aria-hidden="true"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="mes-rejilla">${celdas(a, i)}</div></section>`;
      $("ano-rejilla").innerHTML = h; $("mes-rejilla").innerHTML = "";
    } else { $("mes-rejilla").innerHTML = celdas(a, m); $("ano-rejilla").innerHTML = ""; }
    $("mes-festivo").textContent = ""; $("mes-festivo").hidden = true;
  };
  // Al tocar un festivo sale su nombre debajo del calendario (lo pidió el padre)
  $("mes-calendario").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-festivo]");
    if (b) { $("mes-festivo").textContent = b.dataset.festivo; $("mes-festivo").hidden = false; return; }
    const n = ev.target.closest("[data-mes]");
    if (n) { mesVisto.setMonth(Number(n.dataset.mes)); vistaCal = "mes"; pintaMes(); $("mes-calendario").scrollIntoView({ block: "nearest" }); }
  });
  $("ver-mes").addEventListener("click", () => { vistaCal = "mes"; pintaMes(); });
  $("ver-ano").addEventListener("click", () => { vistaCal = "ano"; pintaMes(); });
  $("mes-ant").addEventListener("click", () => { if (vistaCal === "ano") mesVisto.setFullYear(mesVisto.getFullYear() - 1); else mesVisto.setMonth(mesVisto.getMonth() - 1); pintaMes(); });
  $("mes-sig").addEventListener("click", () => { if (vistaCal === "ano") mesVisto.setFullYear(mesVisto.getFullYear() + 1); else mesVisto.setMonth(mesVisto.getMonth() + 1); pintaMes(); });

  const pintaReuniones = () => {
    const hoy = hoyISO();
    const prox = D.reuniones.filter((r) => r.fecha >= hoy);
    const pas = D.reuniones.filter((r) => r.fecha < hoy).reverse();
    $("lista-proximas").innerHTML = prox.map(tarjetaReunion).join("") || vacio("No hay reuniones previstas", "Cuando se convoque una reunión o una asamblea, saldrá aquí con el día, la hora y el lugar.", "calendario");
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
      || (q ? vacio("No hay actas con esas palabras", "Prueba con otras palabras o mira todas las actas.", "buscar") : vacio("Todavía no hay actas", "Aquí saldrán el resumen y los acuerdos de cada reunión.", "acta"));
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
      || vacio("Todavía no hay documentos", "Aquí estarán el convenio, el calendario laboral, las tablas salariales y otros documentos útiles.", "documento");
  };

  // ---------- Sugerencias y preguntas ----------
  const pintaPreguntas = () => {
    $("lista-preguntas").innerHTML = D.preguntas.map((p) => R.pregunta(p)).join("") || vacio("Todavía no hay preguntas respondidas", "Si tienes una duda, escríbela arriba: el comité responderá aquí las más habituales.", "ayuda");
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
    $("privacidad-texto").innerHTML = textoHTML(D.paginas.privacidad) || "<p>Esta web es solo informativa y no pide datos personales.</p>";
    $("aviso-legal-texto").innerHTML = textoHTML(D.paginas.aviso_legal) || "<p>Web informativa del Comité de Empresa de Calsina Carré.</p>";
    $("cookies-texto").innerHTML = textoHTML(D.paginas.cookies) || "<p>Esta web no usa cookies. Solo guarda tus preferencias en tu propio móvil.</p>";
    $("lista-miembros").innerHTML = D.miembros.map(R.miembro).join("") || vacio("Pronto pondremos aquí quién forma el comité", "Mientras tanto, puedes escribirnos de forma anónima.", "personas", ["#buzon", "Ir al buzón anónimo"]);
  };

  // ---------- Secciones que crea el comité (v11) ----------
  // Las principales salen como pestañas (antes de «Nosotros») y en los accesos de la portada; las subsecciones, dentro de su sección.
  const nombreSeccion = (id) => D.apartados.find((a) => a.id === id)?.titulo || "Sección";
  const principales = () => D.apartados.filter((a) => !a.padre_id);
  const pintaPestanasSecciones = () => {
    document.querySelectorAll("#pestanas .pest-seccion").forEach((a) => a.remove());
    $("pest-nosotros").insertAdjacentHTML("beforebegin", principales().map((a) => `<a href="#seccion-${a.id}" data-vista="seccion-${a.id}" class="pest-seccion">${esc(a.titulo)}</a>`).join(""));
    $("accesos-secciones").innerHTML = principales().map((a) => `<a href="#seccion-${a.id}"><span class="ic">${icono(a.icono || "carpeta")}</span><span>${esc(a.titulo)}</span></a>`).join("");
  };
  // Pinta la sección y devuelve la pestaña que hay que marcar (la de la sección principal)
  const pintaSeccion = (id) => {
    const a = D.apartados.find((x) => x.id === id), v = $("v-seccion");
    if (!a) {
      $("seccion-ic").innerHTML = icono("carpeta"); $("seccion-titulo").textContent = "Sección no disponible"; $("seccion-miga").hidden = true;
      $("seccion-desc").textContent = "Esta sección ya no está en la web o se ha ocultado.";
      $("seccion-hijas").innerHTML = ""; $("seccion-pubs").innerHTML = vacio("No hay nada aquí", "Vuelve a la portada para ver lo último del comité.", "carpeta", ["#actualidad", "Ir a Info general"]);
      v.dataset.titulo = "Sección"; return null;
    }
    const padre = a.padre_id ? D.apartados.find((x) => x.id === a.padre_id) : null;
    $("seccion-ic").innerHTML = icono(a.icono || "carpeta");
    $("seccion-titulo").textContent = a.titulo;
    $("seccion-desc").textContent = String(a.descripcion || "").replace(/\*\*/g, "");
    $("seccion-desc").hidden = !a.descripcion;
    $("seccion-miga").hidden = !padre;
    $("seccion-miga").innerHTML = padre ? `<a href="#seccion-${padre.id}">${icono("atras")}${esc(padre.titulo)}</a>` : "";
    const hijas = D.apartados.filter((x) => x.padre_id === a.id);
    const cuenta = (sid) => D.publicaciones.filter((p) => p.apartado_id === sid).length;
    $("seccion-hijas").innerHTML = hijas.map((h) => R.seccion(h, cuenta(h.id))).join("");
    const pubs = D.publicaciones.filter((p) => p.apartado_id === a.id);
    $("seccion-pubs").innerHTML = pubs.map(R.publicacion).join("") || (hijas.length ? "" : vacio("Todavía no hay nada en esta sección", "Cuando el comité publique algo aquí, lo verás en esta página.", a.icono || "carpeta", ["#avisos-movil", "Avisarme cuando haya novedades"]));
    v.dataset.titulo = a.titulo;
    return "seccion-" + (padre ? padre.id : a.id);
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
      ...D.actualidad.filter((x) => casa(x.titulo, x.contenido, x.categoria)).map((x) => ["Info general", x.titulo, "noticia-" + x.id, x.fecha]),
      ...D.apartados.filter((x) => casa(x.titulo, x.descripcion)).map((x) => ["Sección", x.titulo, "seccion-" + x.id, null]),
      ...D.publicaciones.filter((x) => casa(x.titulo, x.contenido, (x.adjuntos || []).map((a) => a.nombre).join(" "))).map((x) => [nombreSeccion(x.apartado_id), x.titulo, "publicacion-" + x.id, x.fecha]),
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
  const pintaTodo = () => { pintaPestanasSecciones(); pintaActualidad(); pintaAvisos(); pintaReuniones(); pintaActas(); pintaDocumentos(); pintaPreguntas(); pintaNosotros(); };
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
      sb.from("apartados").select("*").eq("visible", true).order("orden").order("id"),
      sb.from("publicaciones").select("*").eq("publicado", true).order("fecha", { ascending: false }).order("id", { ascending: false }),
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
    // Secciones: solo las visibles cuyo padre (si lo tienen) también se ve; publicaciones de esas secciones
    const vis = new Set((r[10].data || []).map((a) => a.id));
    D.apartados = (r[10].data || []).filter((a) => !a.padre_id || vis.has(a.padre_id));
    const ok = new Set(D.apartados.map((a) => a.id));
    D.publicaciones = (r[11].data || []).filter((p) => ok.has(p.apartado_id));
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
    if (!primeraCarga && !$("v-seccion").hidden) { const mm = location.hash.match(/^#(seccion|publicacion)-(\d+)$/); if (mm) pintaSeccion(mm[1] === "seccion" ? +mm[2] : D.publicaciones.find((p) => String(p.id) === mm[2])?.apartado_id); }
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
      if (!ses && ["actualidad", "avisos", "reuniones", "actas", "buzon", "nosotros", "buscar", "seccion"].includes(vista)) {
        sessionStorage.setItem(k, "1");
        sb.rpc("contar_visita", { p_seccion: vista === "seccion" ? "secciones" : vista === "actas" && !$("bloque-documentos").hidden ? "documentos" : vista }).then(() => {}, () => {});
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
      // Si este móvil solo tiene los avisos del panel (comite-push-panel) y no los de la web, la web no los da por activados
      const soloPanel = !!sub && !TEMA.lee("comite-push") && TEMA.lee("comite-push-panel") === sub.endpoint;
      pintaPush(sub && !soloPanel && Notification.permission === "granted");
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
      TEMA.guarda("comite-push", j.endpoint); // para que el panel sepa que la web también usa esta dirección
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
      // Si el panel usa esta misma dirección para sus avisos (comite-push-panel), se quita de los de la web sin apagarla en el móvil
      const delPanel = !!sub && TEMA.lee("comite-push-panel") === sub.endpoint;
      if (sub) { await sb.rpc("desuscribir_push", { p_endpoint: sub.endpoint }); if (!delPanel) await sub.unsubscribe(); }
      try { localStorage.removeItem("comite-push"); } catch (_) {}
      pintaPush(false); $("push-acepto").checked = false;
      estado(est, "Avisos desactivados en este móvil.", "bien");
    } catch (e) { estado(est, "No se han podido desactivar. Prueba de nuevo.", "mal"); }
  });
  const estado = (el, txt, tipo = "") => { el.textContent = txt; el.className = "estado" + (tipo ? " " + tipo : ""); };

  // ---------- Aviso de privacidad (solo informa; no bloquea nada) ----------
  if (TEMA.lee("comite-aviso-privacidad") !== "1") $("aviso-privacidad").hidden = false;
  const cierraAvisoPrivacidad = () => { $("aviso-privacidad").hidden = true; TEMA.guarda("comite-aviso-privacidad", "1"); };
  $("b-aviso-ok").addEventListener("click", cierraAvisoPrivacidad);
  $("aviso-privacidad").querySelector('a[href="#cookies"]').addEventListener("click", cierraAvisoPrivacidad);

  // ---------- Borrar lo que la web guarda en este móvil ----------
  $("b-borrar-datos").addEventListener("click", async () => {
    if (!confirm("¿Borrar lo que esta web guarda en este móvil? Olvidará tus preferencias, lo que has visto y lo que has votado.")) return;
    try { Object.keys(localStorage).filter((k) => k.startsWith("comite-")).forEach((k) => localStorage.removeItem(k)); } catch (_) {}
    try { Object.keys(sessionStorage).filter((k) => k.startsWith("comite-")).forEach((k) => sessionStorage.removeItem(k)); } catch (_) {}
    try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k.startsWith("comite-")).map((k) => caches.delete(k))); } catch (_) {}
    TEMA.aplica();
    $("borrar-estado").textContent = "Hecho. Se ha borrado todo lo que esta web guardaba en este móvil."; $("borrar-estado").className = "estado bien";
  });

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

  $("pie-ano").textContent = new Date().getFullYear();
  arranca();
  registraSW();
  preparaPush();
})();
