// Tarjetas de la web. Las usan la página pública y la vista previa del panel,
// para que el panel enseñe exactamente lo que verán los trabajadores.
(function () {
  const nuevo = (d) => esNuevo(d) ? '<span class="etq nuevo">Nuevo</span>' : "";
  const botonCompartir = (ancla, titulo, texto) =>
    `<button type="button" class="btn-linea" data-compartir="${ancla}" data-t="${esc(titulo)}" data-x="${esc(texto)}">${icono("compartir")}Compartir</button>`;

  const noticia = (n) => `
    <article class="tarjeta" id="noticia-${n.id}">
      <div class="meta">${n.categoria && n.categoria !== "General" ? `<span class="etq">${esc(n.categoria)}</span>` : ""}${nuevo(n.creado)}<span>${esc(fechaLarga(n.fecha || hoyISO()))}</span></div>
      <h3>${esc(n.titulo || "Sin título")}</h3>
      <div class="texto">${textoHTML(n.contenido)}</div>
      ${adjuntosHTML(n.adjuntos)}
      <div class="acciones">${botonCompartir("noticia-" + n.id, n.titulo, n.contenido)}</div>
    </article>`;

  // Avisos con estilo de señal de tráfico (lo eligió el padre): triángulo azul con «i» o, si es urgente o
  // está destacado hoy, triángulo rojo con «!» y franja de rayas rojas y blancas arriba, como las de obras.
  const senal = (rojo) => `<svg class="senal${rojo ? " roja" : ""}" viewBox="0 0 48 44" aria-hidden="true"><path class="senal-fondo" d="M24 4 45 40H3z"/>${rojo
    ? '<path class="senal-signo" d="M24 17v10"/><circle class="senal-punto" cx="24" cy="33.5" r="2.6"/>'
    : '<circle class="senal-punto" cx="24" cy="18" r="2.6"/><path class="senal-signo" d="M24 24v10"/>'}</svg>`;
  // Destacado hoy («Destacar en la portada el día»): ese día se ve en rojo, como un urgente
  const aviso = (a) => { const hoy = a.destacar_dia && a.destacar_dia === hoyISO(), rojo = a.urgente || hoy; return `
    <article class="tarjeta aviso${rojo ? " urgente" : ""}" id="aviso-${a.id}">
      ${rojo ? '<div class="rayas" aria-hidden="true"></div>' : ""}
      <div class="aviso-cuerpo">
        ${senal(rojo)}
        <div class="aviso-txt">
          <div class="meta">${hoy ? '<span class="etq rojo">Destacado hoy</span>' : a.urgente ? '<span class="etq rojo">Urgente</span>' : '<span class="etq azul">Aviso</span>'}${nuevo(a.fecha)}<span>${esc(fechaLarga(a.fecha || new Date()))}</span></div>
          <h3>${esc(a.titulo || "Sin título")}</h3>
          <div class="texto">${textoHTML(a.contenido)}</div>
          ${adjuntosHTML(a.adjuntos)}
          <div class="acciones">${botonCompartir("aviso-" + a.id, a.titulo, a.contenido)}</div>
        </div>
      </div>
    </article>`; };

  const reunion = (r) => {
    const f = r.fecha || hoyISO(), d = fechaDia(f), pasada = f < hoyISO();
    return `
    <article class="tarjeta reunion${pasada ? " pasada" : ""}" id="reunion-${r.id}">
      <div class="dia" aria-hidden="true"><b>${d.getDate()}</b><span>${d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span></div>
      <div class="reunion-cuerpo">
        <div class="meta"><span class="etq azul">${esc(r.tipo)}</span>${f === hoyISO() ? '<span class="etq rojo">Hoy</span>' : ""}</div>
        <h3>${esc(r.titulo || "Sin título")}</h3>
        <p class="dato">${icono("calendario")}${esc(fechaSemana(f))}${r.hora ? " · " + esc(horario(r)) : ""}</p>
        ${r.lugar ? `<p class="dato">${icono("lugar")}${esc(r.lugar)}</p>` : ""}
        ${r.descripcion ? `<div class="texto">${textoHTML(r.descripcion)}</div>` : ""}
        ${pasada ? "" : `<div class="acciones">
          <button type="button" class="btn-linea" data-ics="${r.id}">${icono("anadir")}Añadir a mi calendario</button>
          ${botonCompartir("reunion-" + r.id, r.titulo, fechaSemana(f) + (r.hora ? ", " + horario(r) : "") + (r.lugar ? ". Lugar: " + r.lugar : "") + (r.descripcion ? "\n\n" + r.descripcion : ""))}
        </div>`}
      </div>
    </article>`;
  };

  const acta = (a) => `
    <article class="tarjeta acta" id="acta-${a.id}">
      <div class="meta"><span class="etq azul">${esc(a.tipo)}</span>${nuevo(a.creado)}<span>${esc(fechaLarga(a.fecha || hoyISO()))}</span></div>
      <h3>${esc(a.titulo || "Sin título")}</h3>
      ${a.resumen ? `<h4>Resumen</h4><div class="texto">${textoHTML(a.resumen)}</div>` : ""}
      ${a.acuerdos ? `<h4>Acuerdos</h4><div class="texto acuerdos">${textoHTML(a.acuerdos)}</div>` : ""}
      ${adjuntosHTML(a.adjuntos)}
      <div class="acciones">${botonCompartir("acta-" + a.id, "Acta: " + a.titulo, a.acuerdos ? "Acuerdos:\n" + a.acuerdos : a.resumen)}</div>
    </article>`;

  const documento = (d) => `
    <article class="tarjeta documento" id="documento-${d.id}">
      <div class="meta">${d.categoria ? `<span class="etq">${esc(d.categoria)}</span>` : ""}${nuevo(d.creado)}${d.actualizado && d.creado && d.actualizado.slice(0, 10) !== d.creado.slice(0, 10) ? `<span>Actualizado el ${esc(fechaLarga(d.actualizado))}</span>` : ""}</div>
      <h3>${esc(d.titulo || "Sin título")}</h3>
      ${d.descripcion ? `<div class="texto">${textoHTML(d.descripcion)}</div>` : ""}
      ${adjuntosHTML(d.adjuntos)}
      ${d.enlace ? `<div class="acciones"><a class="btn-linea" href="${esc(urlSegura(d.enlace))}" target="_blank" rel="noopener">${icono("flecha")}Abrir el enlace</a></div>` : ""}
    </article>`;

  const opciones = (e) => String(e.opciones || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const abierta = (e) => !e.cierra || e.cierra >= hoyISO();
  // votos: {opcion: n}; mio: número de la opción votada en este móvil (0 = sin votar)
  const consulta = (e, votos = {}, mio = 0, verResultados = false) => {
    const ops = opciones(e), ab = abierta(e), ver = verResultados || !!mio || !ab;
    const total = ops.reduce((n, _, i) => n + (votos[i + 1] || 0), 0);
    const cierre = e.cierra ? (ab ? "Se cierra el " + fechaLarga(e.cierra) : "Consulta cerrada") : "";
    const cuerpo = ver
      ? ops.map((o, i) => {
          const n = votos[i + 1] || 0, pc = total ? Math.round(n * 100 / total) : 0;
          return `<div class="cons-res${mio === i + 1 ? " mio" : ""}"><div class="cons-fila"><span>${esc(o)}${mio === i + 1 ? " <small>(tu voto)</small>" : ""}</span><b>${pc} %${verResultados ? ` <small>(${n})</small>` : ""}</b></div>
            <div class="cons-barra"><i style="width:${pc}%"></i></div></div>`;
        }).join("") + `<p class="cons-pie">${total} ${total === 1 ? "voto" : "votos"}${cierre ? " · " + esc(cierre) : ""}</p>`
      : (ops.map((o, i) => `<button type="button" class="cons-op" data-voto="${e.id}:${i + 1}">${esc(o)}</button>`).join("") || '<p class="cons-pie">Escribe las opciones, una por línea.</p>')
        + `<p class="cons-pie">Es anónima: solo se suman los votos, nadie puede saber qué has votado. Un voto por móvil.${cierre ? " " + esc(cierre) + "." : ""}</p>`;
    return `<section class="tarjeta consulta" id="consulta-${e.id}">
      <span class="cons-tipo">${icono("check")}Consulta a la plantilla</span>
      <h3>${esc(e.pregunta || "Pregunta")}</h3>
      ${e.explicacion ? `<div class="texto">${textoHTML(e.explicacion)}</div>` : ""}
      <div class="cons-cuerpo">${cuerpo}</div>
      <p class="estado" role="status"></p>
      ${ab && !verResultados ? `<div class="acciones">${botonCompartir("consulta-" + e.id, "Consulta: " + e.pregunta, "Vota de forma anónima en la web del comité.")}</div>` : ""}
    </section>`;
  };

  const pregunta = (p, abierta = false) => `
    <details class="tarjeta pregunta" id="pregunta-${p.id}"${abierta ? " open" : ""}>
      <summary>${esc(p.pregunta || "Pregunta")}</summary>
      <div class="texto">${textoHTML(p.respuesta) || "<p>Pendiente de respuesta.</p>"}</div>
    </details>`;

  const miembro = (m) => {
    const ini = String(m.nombre || "?").split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
    const tel = String(m.telefono || "").replace(/[^\d+]/g, "");
    const wa = tel.replace(/^\+/, "").replace(/^(?=[67]\d{8}$)/, "34");
    return `
    <article class="tarjeta miembro">
      ${m.foto && m.foto.url ? `<img class="inicial foto" src="${esc(urlSegura(m.foto.url))}" alt="" loading="lazy" width="54" height="54">` : `<div class="inicial" aria-hidden="true">${esc(ini)}</div>`}
      <div>
        <h3>${esc(m.nombre || "Nombre")}</h3>
        <p class="cargo">${esc(m.cargo)}${m.sindicato ? " · " + esc(m.sindicato) : ""}</p>
        ${m.detalle ? `<p class="detalle">${esc(m.detalle)}</p>` : ""}
        <div class="acciones">
          ${tel ? `<a class="btn-linea" href="tel:${esc(tel)}">${icono("telefono")}Llamar</a>` : ""}
          ${tel ? `<a class="btn-linea" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icono("mensaje")}WhatsApp</a>` : ""}
          ${m.email ? `<a class="btn-linea" href="mailto:${esc(m.email)}">${icono("email")}Email</a>` : ""}
        </div>
      </div>
    </article>`;
  };

  window.R = { senal, noticia, aviso, reunion, acta, documento, consulta, pregunta, miembro, opciones, abierta };
})();
