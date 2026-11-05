// Visor de fotos y PDF dentro de la web (petición n.º 5 del panel: «que se puedan ver sin descargar»).
// Al tocar una foto de una tarjeta (.galeria a) o un PDF adjunto (a[data-visor="pdf"]) se abre una ventana
// encima de la página con «Cerrar». Los PDF se pintan página a página con pdf.js (lib/pdfjs, Apache 2.0),
// que solo se carga la primera vez que se abre uno. Word, Excel y lo demás se siguen abriendo aparte.
// No se puede impedir hacer capturas de pantalla: ninguna web puede.
(function () {
  let PDFJS = null, velo = null, antes = null, tarea = 0;

  const cierra = (desdeAtras) => {
    if (!velo) return;
    tarea++; velo.remove(); velo = null;
    document.documentElement.classList.remove("visor-abierto");
    document.removeEventListener("keydown", tecla, true);
    if (!desdeAtras && history.state && history.state.visor) history.back();
    antes?.focus?.();
  };
  const tecla = (e) => {
    if (e.key === "Escape") { e.preventDefault(); cierra(false); }
    else if (e.key === "Tab" && velo) { e.preventDefault(); velo.querySelector(".visor-cerrar").focus(); }
  };
  window.addEventListener("popstate", () => { if (velo) cierra(true); });

  const abre = (titulo) => {
    antes = document.activeElement;
    velo = document.createElement("div");
    velo.className = "visor"; velo.setAttribute("role", "dialog"); velo.setAttribute("aria-modal", "true"); velo.setAttribute("aria-label", titulo);
    velo.innerHTML = `<div class="visor-cab"><b class="visor-tit">${esc(titulo)}</b>
      <button type="button" class="visor-cerrar">${icono("cerrar")}Cerrar</button></div>
      <div class="visor-cuerpo" tabindex="-1"></div>`;
    document.body.appendChild(velo);
    document.documentElement.classList.add("visor-abierto");
    velo.querySelector(".visor-cerrar").addEventListener("click", () => cierra(false));
    velo.addEventListener("click", (e) => { if (e.target === velo || e.target.classList.contains("visor-cuerpo")) cierra(false); });
    document.addEventListener("keydown", tecla, true);
    history.pushState({ visor: true }, "");
    velo.querySelector(".visor-cerrar").focus();
    return velo.querySelector(".visor-cuerpo");
  };

  const foto = (url, titulo) => {
    const c = abre(titulo || "Foto");
    const img = document.createElement("img");
    img.className = "visor-foto"; img.alt = titulo || ""; img.src = url;
    c.appendChild(img);
  };

  const pdf = async (url, titulo) => {
    const c = abre(titulo || "PDF"), mia = ++tarea;
    c.innerHTML = '<p class="visor-msg" role="status">Abriendo el PDF…</p>';
    try {
      if (!PDFJS) {
        PDFJS = await import("./lib/pdfjs/pdf.min.mjs");
        PDFJS.GlobalWorkerOptions.workerSrc = "lib/pdfjs/pdf.worker.min.mjs";
      }
      const doc = await PDFJS.getDocument({ url, isEvalSupported: false }).promise;
      if (mia !== tarea) return;
      c.innerHTML = "";
      const ancho = Math.min(c.clientWidth - 16, 1000), ppx = Math.min(window.devicePixelRatio || 1, 2);
      for (let n = 1; n <= doc.numPages; n++) {
        const pag = await doc.getPage(n);
        if (mia !== tarea) return;
        const v1 = pag.getViewport({ scale: 1 }), esc2 = ancho / v1.width, vp = pag.getViewport({ scale: esc2 * ppx });
        const cv = document.createElement("canvas");
        cv.className = "visor-pag"; cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
        cv.style.width = Math.floor(vp.width / ppx) + "px";
        cv.setAttribute("aria-label", `Página ${n} de ${doc.numPages}`); cv.setAttribute("role", "img");
        c.appendChild(cv);
        await pag.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      }
    } catch (e) {
      if (mia !== tarea) return;
      c.innerHTML = `<p class="visor-msg">No se ha podido abrir el PDF aquí. <a href="${esc(urlSegura(url))}" target="_blank" rel="noopener">Abrirlo aparte</a></p>`;
    }
  };

  document.addEventListener("click", (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const a = ev.target.closest(".galeria a, a[data-visor]");
    if (!a) return;
    const url = urlSegura(a.getAttribute("href") || "");
    if (!url || url === "#") return;
    ev.preventDefault();
    const titulo = a.dataset.titulo || "";
    if (a.dataset.visor === "pdf") pdf(url, titulo); else foto(url, titulo || "Foto");
  });
})();
