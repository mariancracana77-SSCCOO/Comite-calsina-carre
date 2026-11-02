// Web pública del Comité de Empresa Calsina Carré
(function () {
  const $ = (id) => document.getElementById(id);
  const D = { actualidad: [], avisos: [], reuniones: [], actas: [], preguntas: [], miembros: [], paginas: {} };
  const VISTAS = ["actualidad", "avisos", "reuniones", "actas", "buzon", "nosotros"];

  // ---------- Cabecera: tema y letra ----------
  const pintaTema = () => { $("b-tema").innerHTML = icono(TEMA.oscuro() ? "sol" : "luna"); };
  pintaTema();
  $("b-tema").addEventListener("click", () => { TEMA.cambiaTema(); pintaTema(); });
  $("b-letra").addEventListener("click", () => {
    const l = TEMA.cambiaLetra();
    $("b-letra").setAttribute("aria-label", "Tamaño de letra: " + ({ "": "normal", grande: "grande", "muy-grande": "muy grande" }[l]));
  });
  $("mes-ant").innerHTML = icono("atras");
  $("mes-sig").innerHTML = icono("flecha");
  $("b-instalar-no").innerHTML = icono("cerrar");

  // ---------- Navegación entre apartados ----------
  const irA = (hash, { foco = false } = {}) => {
    const h = (hash || "").replace(/^#/, "");
    let vista = VISTAS.includes(h) ? h : "actualidad", destino = null;
    const m = h.match(/^(noticia|aviso|reunion|acta)-(\d+)$/);
    if (m) { vista = { noticia: "actualidad", aviso: "avisos", reunion: "reuniones", acta: "actas" }[m[1]]; destino = h; }
    VISTAS.forEach((v) => { $("v-" + v).hidden = v !== vista; });
    document.querySelectorAll("#pestanas a").forEach((a) => {
      const sel = a.dataset.vista === vista;
      a.classList.toggle("activa", sel);
      if (sel) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest", inline: "center" }); } else a.removeAttribute("aria-current");
    });
    document.title = $("v-" + vista).dataset.titulo + " · Comité de Empresa Calsina Carré";
    if (vista === "avisos") marcaAvisosVistos();
    if (destino) {
      if (m[1] === "reunion") { const r = D.reuniones.find((x) => String(x.id) === m[2]); if (r && r.fecha < hoyISO()) $("pasadas-caja").open = true; }
      if (m[1] === "acta") { filtroAno = "todos"; $("buscar-actas").value = ""; pintaActas(); }
      requestAnimationFrame(() => {
        const el = $(destino);
        if (el) { el.scrollIntoView({ block: "start" }); el.classList.add("resalta"); setTimeout(() => el.classList.remove("resalta"), 2200); }
      });
    } else window.scrollTo(0, 0);
    if (foco) $("contenido").focus({ preventScroll: true });
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

  // ---------- Piezas ----------
  const nuevo = (d) => esNuevo(d) ? '<span class="etq nuevo">Nuevo</span>' : "";
  const botonesItem = (tipo, x, titulo, texto) => `<div class="acciones">
      <button type="button" class="btn-linea" data-compartir="${tipo}-${x.id}" data-t="${esc(titulo)}" data-x="${esc(texto)}">${icono("compartir")}Compartir</button>
    </div>`;

  const tarjetaNoticia = (n) => `
    <article class="tarjeta" id="noticia-${n.id}">
      <div class="meta">${n.categoria && n.categoria !== "General" ? `<span class="etq">${esc(n.categoria)}</span>` : ""}${nuevo(n.creado)}<span>${esc(fechaLarga(n.fecha))}</span></div>
      <h3>${esc(n.titulo)}</h3>
      <div class="texto">${textoHTML(n.contenido)}</div>
      ${adjuntosHTML(n.adjuntos)}
      ${botonesItem("noticia", n, n.titulo, n.contenido)}
    </article>`;

  const tarjetaAviso = (a) => `
    <article class="tarjeta aviso${a.urgente ? " urgente" : ""}" id="aviso-${a.id}">
      <div class="meta">${a.urgente ? `<span class="etq rojo">${icono("alerta")}Urgente</span>` : ""}${nuevo(a.fecha)}<span>${esc(fechaLarga(a.fecha))}</span></div>
      <h3>${esc(a.titulo)}</h3>
      <div class="texto">${textoHTML(a.contenido)}</div>
      ${adjuntosHTML(a.adjuntos)}
      ${botonesItem("aviso", a, a.titulo, a.contenido)}
    </article>`;

  const tarjetaReunion = (r) => {
    const d = fechaDia(r.fecha), pasada = r.fecha < hoyISO();
    return `
    <article class="tarjeta reunion${pasada ? " pasada" : ""}" id="reunion-${r.id}">
      <div class="dia" aria-hidden="true"><b>${d.getDate()}</b><span>${d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span></div>
      <div class="reunion-cuerpo">
        <div class="meta"><span class="etq azul">${esc(r.tipo)}</span>${r.fecha === hoyISO() ? '<span class="etq rojo">Hoy</span>' : ""}</div>
        <h3>${esc(r.titulo)}</h3>
        <p class="dato">${icono("calendario")}${esc(fechaSemana(r.fecha))}${r.hora ? " · " + esc(horario(r)) : ""}</p>
        ${r.lugar ? `<p class="dato">${icono("lugar")}${esc(r.lugar)}</p>` : ""}
        ${r.descripcion ? `<div class="texto">${textoHTML(r.descripcion)}</div>` : ""}
        ${pasada ? "" : `<div class="acciones">
          <button type="button" class="btn-linea" data-ics="${r.id}">${icono("anadir")}Añadir a mi calendario</button>
          <button type="button" class="btn-linea" data-compartir="reunion-${r.id}" data-t="${esc(r.titulo)}" data-x="${esc(fechaSemana(r.fecha) + (r.hora ? ", " + horario(r) : "") + (r.lugar ? ". Lugar: " + r.lugar : "") + (r.descripcion ? "\n\n" + r.descripcion : ""))}">${icono("compartir")}Compartir</button>
        </div>`}
      </div>
    </article>`;
  };

  const tarjetaActa = (a) => `
    <article class="tarjeta acta" id="acta-${a.id}">
      <div class="meta"><span class="etq azul">${esc(a.tipo)}</span>${nuevo(a.creado)}<span>${esc(fechaLarga(a.fecha))}</span></div>
      <h3>${esc(a.titulo)}</h3>
      ${a.resumen ? `<h4>Resumen</h4><div class="texto">${textoHTML(a.resumen)}</div>` : ""}
      ${a.acuerdos ? `<h4>Acuerdos</h4><div class="texto acuerdos">${textoHTML(a.acuerdos)}</div>` : ""}
      ${adjuntosHTML(a.adjuntos)}
      ${botonesItem("acta", a, "Acta: " + a.titulo, (a.acuerdos ? "Acuerdos:\n" + a.acuerdos : a.resumen))}
    </article>`;

  const vacio = (txt) => `<p class="vacio">${esc(txt)}</p>`;

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
    $("lista-actualidad").innerHTML = D.actualidad.map(tarjetaNoticia).join("") || vacio("Todavía no hay noticias publicadas.");
  };

  // ---------- Avisos ----------
  const pintaAvisos = () => {
    $("lista-avisos").innerHTML = D.avisos.map(tarjetaAviso).join("") || vacio("No hay avisos.");
    pintaCuenta();
  };

  // ---------- Calendario de reuniones ----------
  let mesVisto = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
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

  // ---------- Actas ----------
  let filtroAno = "todos";
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

  // ---------- Sugerencias y preguntas ----------
  const pintaPreguntas = () => {
    $("lista-preguntas").innerHTML = D.preguntas.map((p) => `
      <details class="tarjeta pregunta">
        <summary>${esc(p.pregunta)}</summary>
        <div class="texto">${textoHTML(p.respuesta) || "<p>Pendiente de respuesta.</p>"}</div>
      </details>`).join("") || vacio("Todavía no hay preguntas respondidas.");
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

  // ---------- Nosotros ----------
  const pintaNosotros = () => {
    $("nosotros-texto").innerHTML = textoHTML(D.paginas.nosotros) || "<p>Información del comité próximamente.</p>";
    $("lista-miembros").innerHTML = D.miembros.map((m) => {
      const ini = m.nombre.split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
      const tel = String(m.telefono || "").replace(/[^\d+]/g, "");
      return `
      <article class="tarjeta miembro">
        <div class="inicial" aria-hidden="true">${esc(ini)}</div>
        <div>
          <h3>${esc(m.nombre)}</h3>
          <p class="cargo">${esc(m.cargo)}${m.sindicato ? " · " + esc(m.sindicato) : ""}</p>
          ${m.detalle ? `<p class="detalle">${esc(m.detalle)}</p>` : ""}
          <div class="acciones">
            ${tel ? `<a class="btn-linea" href="tel:${esc(tel)}">${icono("telefono")}Llamar</a>` : ""}
            ${m.email ? `<a class="btn-linea" href="mailto:${esc(m.email)}">${icono("email")}Email</a>` : ""}
          </div>
        </div>
      </article>`;
    }).join("") || vacio("Pronto pondremos aquí quién forma el comité.");
  };

  // ---------- Botones de compartir y calendario ----------
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-compartir]");
    if (c) { compartir(c.dataset.t, c.dataset.x, c.dataset.compartir); return; }
    const i = e.target.closest("[data-ics]");
    if (i) { const r = D.reuniones.find((x) => String(x.id) === i.dataset.ics); if (r) descargaICS(r); }
  });

  // ---------- Carga de datos ----------
  const pintaTodo = () => { pintaActualidad(); pintaAvisos(); pintaReuniones(); pintaActas(); pintaPreguntas(); pintaNosotros(); };
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
      sb.from("paginas").select("*"),
    ]);
    const fallo = r.find((x) => x.error);
    if (fallo) throw fallo.error;
    const ahora = new Date().toISOString();
    [D.actualidad, D.avisos, D.reuniones, D.actas, D.preguntas, D.miembros] = r.slice(0, 6).map((x) => x.data || []);
    // Si el panel está abierto en este navegador, el servidor le da también lo programado: aquí no se enseña
    D.avisos = D.avisos.filter((a) => !a.publicar_en || a.publicar_en <= ahora);
    D.paginas = Object.fromEntries((r[6].data || []).map((p) => [p.slug, p.contenido]));
  };

  const arranca = async () => {
    // Primera visita: no avisar de avisos antiguos como "sin leer"
    const primera = !TEMA.lee("comite-avisos-vistos");
    try {
      await cargar();
      guardaCopia();
      $("sin-red").hidden = true;
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
    irA(location.hash);
  };
  window.addEventListener("online", arranca);

  // ---------- Instalar como app ----------
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
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
})();
