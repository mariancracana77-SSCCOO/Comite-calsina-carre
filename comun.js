// Código que comparten la web (index.html) y el panel (admin.html).

// ---- Conexión con Supabase ----
// Esta clave es pública: solo permite LEER lo publicado y enviar al buzón.
// Para publicar hace falta iniciar sesión en el panel con una cuenta de admin.
window.SUPABASE_URL = "https://ytxpubqyhnohhugpukdm.supabase.co";
window.SUPABASE_KEY = "sb_publishable_tmkeed90aj4Fv00UoTTy7Q_qBPUAaCj";
window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
window.VERSION_WEB = "23"; // cambiar junto con ?v= en los HTML y VERSION en sw.js
// Dirección de la web: sale de donde esté publicada (no hay que tocarla si cambia el dominio)
window.WEB_URL = new URL("./", location.href).href;

// ---- Utilidades ----
window.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Solo deja pasar enlaces http, https, mailto y tel
window.urlSegura = (u) => {
  const s = String(u || "").trim();
  return /^(https?:|mailto:|tel:)/i.test(s) ? s : "#";
};

// Texto sencillo a HTML: párrafos, listas con "- ", **negrita** y enlaces.
// v23: la puntuación del final («.», «,», «)», comillas…) se queda fuera del enlace.
// Con { enlaces: false } las direcciones salen como texto (para lo que escribe gente anónima, como el buzón).
window.textoHTML = (s, { enlaces = true } = {}) => {
  if (!String(s ?? "").trim()) return "";
  const linea = (t) => {
    const h = esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return enlaces ? h.replace(/(https?:\/\/[^\s<]+?)((?:[.,;:!?)\]]|&quot;|&#39;)*)(?=\s|<|$)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>$2') : h;
  };
  const esLista = (l) => /^\s*[-•*]\s+/.test(l);
  return String(s ?? "").trim().split(/\n\s*\n/).map((bloque) => {
    const out = []; let lista = [], texto = [];
    const cierraTexto = () => { if (texto.length) out.push("<p>" + texto.map(linea).join("<br>") + "</p>"); texto = []; };
    const cierraLista = () => { if (lista.length) out.push("<ul>" + lista.map((l) => "<li>" + linea(l.replace(/^\s*[-•*]\s+/, "")) + "</li>").join("") + "</ul>"); lista = []; };
    bloque.split("\n").forEach((l) => { if (esLista(l)) { cierraTexto(); lista.push(l); } else { cierraLista(); texto.push(l); } });
    cierraTexto(); cierraLista();
    return out.join("");
  }).join("");
};

window.fechaDia = (iso) => new Date(String(iso).slice(0, 10) + "T12:00:00");
window.fechaLarga = (d) => (typeof d === "string" && d.length === 10 ? fechaDia(d) : new Date(d))
  .toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
window.fechaSemana = (iso) => {
  const t = fechaDia(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
// Día (AAAA-MM-DD) en la hora de Madrid, como la tarea «notificar» del servidor, aunque el móvil tenga otra zona (v23)
window.diaMadrid = (d = new Date()) => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
  catch (_) { return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
};
window.hoyISO = () => diaMadrid();
// Sin acentos y en minúsculas, para buscar (v23: en un solo sitio; antes estaba repetida)
window.sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// iPhone y iPad (el iPad moderno se presenta como un Mac con pantalla táctil)
window.esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
window.esNuevo = (d) => d && Date.now() - new Date(d) < 7 * 86400000;
window.horario = (r) => r.hora ? (r.hora + (r.hora_fin ? " a " + r.hora_fin : "")) : "";

// ---- Archivos adjuntos ----
window.esImagen = (a) => /^image\//.test(a.tipo || "") && !/hei[cf]/.test(a.tipo);
window.tamanoTxt = (b) => !b ? "" : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB";
window.tipoTxt = (a) => {
  const t = a.tipo || "", e = (String(a.nombre || "").split(".").pop() || "").toUpperCase();
  if (t.startsWith("image/")) return "Imagen";
  if (t === "application/pdf") return "PDF";
  if (/word|opendocument\.text/.test(t)) return "Word";
  if (/excel|spreadsheet|csv/.test(t)) return "Excel";
  return e || "Archivo";
};
// titulo (v23): el de la tarjeta, para que el visor diga «Foto 1 de 2: …» y el lector de pantalla sepa qué foto es
window.adjuntosHTML = (lista, titulo = "") => {
  lista = lista || [];
  if (!lista.length) return "";
  const fotos = lista.filter(esImagen), docs = lista.filter((a) => !esImagen(a));
  const nombreFoto = (i) => (fotos.length > 1 ? `Foto ${i + 1} de ${fotos.length}` : "Foto") + (titulo ? ": " + titulo : "");
  return (fotos.length ? `<div class="galeria${fotos.length === 1 ? " una" : ""}">${fotos.map((f, i) =>
      `<a href="${esc(urlSegura(f.url))}" target="_blank" rel="noopener" data-titulo="${esc(nombreFoto(i))}" aria-label="Ver en grande: ${esc(nombreFoto(i))}"><img src="${esc(urlSegura(f.url))}" alt="" loading="lazy" decoding="async" width="400" height="300"></a>`).join("")}</div>` : "")
    + (docs.length ? `<div class="adjuntos">${docs.map((a) =>
      `<a class="adjunto" href="${esc(urlSegura(a.url))}" target="_blank" rel="noopener"${a.tipo === "application/pdf" ? ` data-visor="pdf" data-titulo="${esc(a.nombre || "PDF")}"` : ""}>${icono("documento")}
        <span><b>${esc(a.nombre || "Archivo")}</b><small>${tipoTxt(a)}${a.tamano ? " · " + tamanoTxt(a.tamano) : ""}</small></span></a>`).join("")}</div>` : "");
};

// ---- Iconos (trazos SVG sencillos, sin emojis) ----
const IC = {
  periodico: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7 9h7M7 13h7M7 16h4"/>',
  megafono: '<path d="M3 10v4h4l6 4V6L7 10H3z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  acta: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  mensaje: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 6 5"/>',
  alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lugar: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  documento: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  compartir: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  anadir: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  telefono: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  flecha: '<path d="m9 6 6 6-6 6"/>',
  atras: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  borrar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  instalar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  candado: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  archivo: '<path d="M3 7h18v13H3zM3 7l2-3h14l2 3M10 11h4"/>',
  inicio: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  subir: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  texto: '<path d="M4 6h16M4 10h16M4 14h10M4 18h7"/>',
  grafica: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  puntos: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  duplicar: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  recuperar: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 3v5.7h5.7"/>',
  subirOrden: '<path d="m6 15 6-6 6 6"/>',
  bajarOrden: '<path d="m6 9 6 6 6-6"/>',
  campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  campanaNo: '<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H4l2-2"/><path d="M10 20a2 2 0 0 0 4 0M3 3l18 18"/>',
  camion: '<path d="M1.5 6H13v9.5H1.5z"/><path d="M14.5 9h3.1l3.4 3.8v2.7h-6.5z"/><path d="M13 15.5h1.5"/><circle cx="4.6" cy="17.6" r="1.6"/><circle cx="8.6" cy="17.6" r="1.6"/><circle cx="18" cy="17.6" r="1.6"/>',
  toro: '<path d="M2.5 16.5V11h11.5v5.5"/><path d="M5 11V4.5h6.5L13 11"/><path d="M17 3v15.5h5.5"/><path d="M14 13.5h3"/><circle cx="5.5" cy="17.5" r="2.2"/><circle cx="12" cy="18" r="1.6"/>',
  transpaleta: '<path d="M3.5 2.5 7.5 12"/><path d="M2 3.5 5 2"/><path d="M6 12h4.5v5H6z"/><path d="M10.5 15.5h11.5v1.5H10.5z"/><circle cx="8.2" cy="19.3" r="1.5"/><circle cx="20" cy="19.3" r="1.1"/>',
  reparto: '<path d="M2 7h11v9H2z"/><path d="M13 10h4l3.5 3.5V16H13z"/><path d="M5 10.5h5v3H5z"/><circle cx="6" cy="17.6" r="1.7"/><circle cx="17" cy="17.6" r="1.7"/>',
  surtidor: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M2.5 21h13"/><path d="M7 6.5h4v4H7z"/><path d="M14 9h2a1.8 1.8 0 0 1 1.8 1.8v5.4a1.6 1.6 0 0 0 3.2 0V8.5L18 5.5"/>',
  // v11: asistente de actas
  magia: '<path d="m4 20 11-11"/><path d="m14 6 1-3 1 3 3 1-3 1-1 3-1-3-3-1z"/><path d="M19 13.5 19.6 15l1.4.6-1.4.5-.6 1.4-.5-1.4-1.5-.5 1.5-.6z"/>',
  camara: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  // v11: iconos para las secciones que crea el padre
  carpeta: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  euro: '<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5"/><path d="M4 10h9M4 14h9"/>',
  salud: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  escudo: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  sinred: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18"/>',
};
window.icono = (n, clase = "") =>
  `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ""}</svg>`;

// ---- Tema y tamaño de letra (se recuerdan en este dispositivo) ----
const lee = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
window.TEMA = {
  aplica() {
    const t = lee("comite-tema");
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const l = lee("comite-letra");
    if (l) document.documentElement.dataset.letra = l; else delete document.documentElement.dataset.letra;
  },
  oscuro() {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  },
  cambiaTema() { guarda("comite-tema", this.oscuro() ? "light" : "dark"); this.aplica(); },
  cambiaLetra() {
    const orden = ["", "grande", "muy-grande"], ahora = lee("comite-letra") || "";
    guarda("comite-letra", orden[(orden.indexOf(ahora) + 1) % orden.length]); this.aplica();
    return lee("comite-letra") || "";
  },
  lee, guarda,
};
TEMA.aplica();

// ---- Archivo .ics para añadir una reunión al calendario del móvil ----
window.descargaICS = (r) => {
  const d = String(r.fecha).replace(/-/g, "");
  const hm = (h) => (String(h || "").match(/^(\d{1,2}):(\d{2})/) || []).slice(1).map((x) => x.padStart(2, "0")).join("") + "00";
  const limpia = (t) => String(t || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
  let ini, fin;
  if (r.hora && /^\d{1,2}:\d{2}/.test(r.hora)) {
    ini = `DTSTART;TZID=Europe/Madrid:${d}T${hm(r.hora)}`;
    // v23: sin hora de fin, una hora (algunos calendarios la creaban de 0 minutos)
    let hf = r.hora_fin && /^\d{1,2}:\d{2}/.test(r.hora_fin) ? hm(r.hora_fin) : null, df = d;
    if (!hf) { const [h, m] = hm(r.hora).match(/\d\d/g).map(Number), t = fechaDia(r.fecha); t.setHours(h + 1, m, 0, 0);
      df = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`; hf = String(t.getHours()).padStart(2, "0") + String(t.getMinutes()).padStart(2, "0") + "00"; }
    fin = `DTEND;TZID=Europe/Madrid:${df}T${hf}`;
  } else {
    const s = fechaDia(r.fecha); s.setDate(s.getDate() + 1);
    ini = `DTSTART;VALUE=DATE:${d}`; fin = `DTEND;VALUE=DATE:${s.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  // Zona horaria de Madrid escrita dentro (la norma la pide cuando se usa TZID)
  const ZONA = ["BEGIN:VTIMEZONE", "TZID:Europe/Madrid",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"];
  // Líneas de 75 bytes como mucho: las largas siguen en la siguiente con un espacio delante (sin partir una letra)
  const dobla = (l) => { const out = []; let cur = "", n = 0;
    for (const ch of l) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; } cur += ch; n += b; }
    out.push(cur); return out.join("\r\n "); };
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Comite Calsina Carre//ES", "CALSCALE:GREGORIAN", ...(r.hora ? ZONA : []), "BEGIN:VEVENT",
    `UID:reunion-${r.id}@comite-calsina-carre`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    ini, fin, `SUMMARY:${limpia(r.titulo)}`, r.lugar ? `LOCATION:${limpia(r.lugar)}` : "", r.descripcion ? `DESCRIPTION:${limpia(r.descripcion)}` : "",
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean).map(dobla).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
  a.download = "reunion-comite.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

// ---- Compartir (menú del móvil o WhatsApp) ----
window.compartir = async (titulo, cuerpo, ancla) => {
  const limpio = String(cuerpo || "").replace(/\*\*/g, "").trim();
  const texto = `*${titulo}*\n\n${limpio.length > 400 ? limpio.slice(0, 399) + "…" : limpio}\n\nMás información: ${WEB_URL}${ancla ? "#" + ancla : ""}`;
  if (navigator.share) { try { await navigator.share({ title: titulo, text: texto }); return; } catch (e) { if (e.name === "AbortError") return; } }
  window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
};

// ---- Aviso de versión nueva (cuando el service worker se actualiza) ----
window.registraSW = () => {
  if (!("serviceWorker" in navigator)) return;
  const habia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habia || document.getElementById("banda-version")) return;
    const b = document.createElement("div");
    b.id = "banda-version"; b.className = "banda-version"; b.setAttribute("role", "status");
    b.innerHTML = `<span>Hay una versión nueva</span><button type="button" class="btn claro">Actualizar</button>`;
    b.querySelector("button").addEventListener("click", () => location.reload());
    document.body.appendChild(b);
  });
};

// ---- Pestañas (role="tablist"): con las flechas izquierda/derecha, Inicio y Fin se pasa de una a otra (v22) ----
document.addEventListener("keydown", (e) => {
  const tab = e.target.closest?.('[role="tablist"] [role="tab"]');
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')].filter((t) => !t.hidden && !t.disabled);
  const i = tabs.indexOf(tab), n = tabs.length;
  if (n < 2 || i < 0) return;
  const j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
  e.preventDefault();
  tabs[j].focus(); tabs[j].click();
});
