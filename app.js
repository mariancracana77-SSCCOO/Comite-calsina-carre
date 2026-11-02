(function () {
  const C = CONTENIDO;
  const $ = (id) => document.getElementById(id);

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fechaLarga = (iso) =>
    new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const hoy = new Date().toISOString().slice(0, 10);

  // ---------- Textos generales ----------
  $("titulo").textContent = C.nombre;
  $("lema").textContent = C.lema;
  $("bienvenida").textContent = C.bienvenida;
  document.title = C.nombre;

  // ---------- Avisos ----------
  const avisos = [...C.avisos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tarjetaAviso = (a) => `
    <article class="tarjeta">
      <p class="fecha">${esc(fechaLarga(a.fecha))}</p>
      <h3>${esc(a.titulo)}</h3>
      <p>${esc(a.texto)}</p>
    </article>`;
  $("lista-avisos").innerHTML = avisos.map(tarjetaAviso).join("") || '<p class="vacio">No hay avisos.</p>';
  $("ultimo-aviso").innerHTML = avisos[0] ? tarjetaAviso(avisos[0]) : '<p class="vacio">No hay avisos.</p>';

  // ---------- Agenda ----------
  const eventos = [...C.eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const tarjetaEvento = (e) => {
    const d = new Date(e.fecha + "T12:00:00");
    const pasado = e.fecha < hoy;
    return `
    <article class="tarjeta evento${pasado ? " pasado" : ""}">
      <div class="dia">
        <strong>${d.getDate()}</strong>
        <span>${d.toLocaleDateString("es-ES", { month: "short" })}</span>
      </div>
      <div>
        <h3>${esc(e.titulo)}${pasado ? ' <small>(ya pasó)</small>' : ""}</h3>
        <p class="fecha">${esc(fechaLarga(e.fecha))}${e.hora ? " · " + esc(e.hora) : ""}</p>
        ${e.lugar ? `<p>📍 ${esc(e.lugar)}</p>` : ""}
        ${e.texto ? `<p>${esc(e.texto)}</p>` : ""}
      </div>
    </article>`;
  };
  $("lista-eventos").innerHTML = eventos.map(tarjetaEvento).join("") || '<p class="vacio">No hay eventos.</p>';
  const proximo = eventos.find((e) => e.fecha >= hoy);
  $("proximo-evento").innerHTML = proximo ? tarjetaEvento(proximo) : '<p class="vacio">No hay eventos próximos.</p>';

  // ---------- Contacto ----------
  const k = C.contacto;
  const tel = String(k.telefono || "").replace(/\s/g, "");
  $("datos-contacto").innerHTML = [
    k.telefono && `<a class="fila" href="tel:${esc(tel)}">📞 ${esc(k.telefono)}</a>`,
    k.telefono && `<a class="fila" href="https://wa.me/34${esc(tel)}">💬 WhatsApp</a>`,
    k.email && `<a class="fila" href="mailto:${esc(k.email)}">✉️ ${esc(k.email)}</a>`,
    k.direccion && `<a class="fila" href="https://maps.google.com/?q=${encodeURIComponent(k.direccion)}">📍 ${esc(k.direccion)}</a>`,
    k.horario && `<p class="fila">🕒 ${esc(k.horario)}</p>`
  ].filter(Boolean).join("");

  // ---------- Navegación ----------
  const ir = (id) => {
    document.querySelectorAll(".pantalla").forEach((s) => s.classList.toggle("activa", s.id === id));
    document.querySelectorAll(".menu button").forEach((b) => b.classList.toggle("activo", b.dataset.ir === id));
    window.scrollTo(0, 0);
  };
  document.querySelectorAll(".menu button").forEach((b) =>
    b.addEventListener("click", () => {
      history.replaceState(null, "", "#" + b.dataset.ir);
      ir(b.dataset.ir);
    })
  );
  const inicial = location.hash.slice(1);
  if (inicial && $(inicial)?.classList.contains("pantalla")) ir(inicial);

  // ---------- Instalar como app ----------
  const instalada = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let aviso;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    aviso = e;
    $("banner-instalar").hidden = false;
  });
  $("boton-instalar").addEventListener("click", async () => {
    if (!aviso) return;
    aviso.prompt();
    await aviso.userChoice;
    aviso = null;
    $("banner-instalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => ($("banner-instalar").hidden = true));

  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let iosCerrado = false;
  try { iosCerrado = localStorage.getItem("ios-cerrado") === "1"; } catch (_) {}
  if (esIOS && !instalada && !iosCerrado) $("ayuda-ios").hidden = false;
  document.querySelectorAll("[data-cierra]").forEach((b) =>
    b.addEventListener("click", () => {
      $(b.dataset.cierra).hidden = true;
      try { localStorage.setItem("ios-cerrado", "1"); } catch (_) {}
    })
  );

  // ---------- Funcionamiento sin conexión ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
  }
})();
