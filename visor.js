// Visor de fotos y PDF dentro de la web (petición n.º 5 del panel: «que se puedan ver sin descargar»).
// Al tocar una foto de una tarjeta (.galeria a) o un PDF adjunto (a[data-visor="pdf"]) se abre una ventana
// encima de la página con «Cerrar». Los PDF se pintan página a página con pdf.js (lib/pdfjs, Apache 2.0),
// que solo se carga la primera vez que se abre uno. Word, Excel y lo demás se siguen abriendo aparte.
// No se puede impedir hacer capturas de pantalla: ninguna web puede.
(function () {
  let PDFJS = null, velo = null, antes = null, tarea = 0, docAbierto = null, observador = null;

  const cierra = (desdeAtras) => {
    if (!velo) return;
    tarea++; velo.remove(); velo = null;
    observador?.disconnect(); observador = null;
    try { docAbierto?.destroy(); } catch (_) {}
    docAbierto = null;
    document.documentElement.classList.remove("visor-abierto");
    document.removeEventListener("keydown", tecla, true);
    const vuelve = antes; antes = null;
    if (!desdeAtras && history.state && history.state.visor) {
      // v23: al volver atrás el navegador quitaba el foco (con Esc acababa en la página entera): se devuelve cuando termina
      window.addEventListener("popstate", () => setTimeout(() => vuelve?.focus?.(), 0), { once: true });
      history.back();
    }
    vuelve?.focus?.();
  };
  const tecla = (e) => {
    if (e.key === "Escape") { e.preventDefault(); cierra(false); }
    else if (e.key === "Tab" && velo) {
      // El foco se queda dentro del visor: va de «Abrir aparte» a «Cerrar» y al contenido (que se mueve con las flechas)
      // v23: también llega al enlace «Abrirlo aparte» que sale si el PDF no se puede abrir
      e.preventDefault();
      const fs = [...velo.querySelectorAll(".visor-cab a[href], .visor-cerrar, .visor-cuerpo, .visor-cuerpo a[href]")];
      const i = fs.indexOf(document.activeElement);
      fs[(i + (e.shiftKey ? fs.length - 1 : 1) + fs.length) % fs.length].focus();
    }
  };
  window.addEventListener("popstate", () => { if (velo) cierra(true); });

  // aparte: dirección para «Abrir aparte» (en los PDF: así se puede guardar el convenio o abrirlo con otra aplicación)
  const abre = (titulo, aparte = "") => {
    antes = document.activeElement;
    velo = document.createElement("div");
    velo.className = "visor"; velo.setAttribute("role", "dialog"); velo.setAttribute("aria-modal", "true"); velo.setAttribute("aria-label", titulo);
    velo.innerHTML = `<div class="visor-cab"><b class="visor-tit">${esc(titulo)}</b>
      ${aparte ? `<a class="visor-aparte" href="${esc(urlSegura(aparte))}" target="_blank" rel="noopener">${icono("instalar")}<span>Abrir aparte</span></a>` : ""}
      <button type="button" class="visor-cerrar">${icono("cerrar")}Cerrar</button></div>
      <div class="visor-cuerpo" tabindex="0"></div>`;
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

  // v22: las páginas se dibujan solo cuando se acercan a la pantalla (IntersectionObserver) y se borran
  // cuando quedan lejos: así un convenio de 100 páginas no se come la memoria del móvil.
  const pdf = async (url, titulo) => {
    const c = abre(titulo || "PDF", url), mia = ++tarea;
    c.innerHTML = '<p class="visor-msg" role="status">Abriendo el PDF…</p>';
    try {
      if (!PDFJS) {
        PDFJS = await import("./lib/pdfjs/pdf.min.mjs");
        PDFJS.GlobalWorkerOptions.workerSrc = "lib/pdfjs/pdf.worker.min.mjs";
      }
      const doc = await PDFJS.getDocument({ url, isEvalSupported: false }).promise;
      if (mia !== tarea) { doc.destroy(); return; }
      docAbierto = doc;
      c.innerHTML = "";
      const ancho = Math.min(c.clientWidth - 16, 1000), ppx = Math.min(window.devicePixelRatio || 1, 2);
      const dibuja = async (cv) => {
        if (cv.dataset.estado) return;
        cv.dataset.estado = "dibujando";
        const gen = cv._gen = (cv._gen || 0) + 1; // si se suelta y vuelve a entrar, el dibujo viejo no sigue
        try {
          const pag = await doc.getPage(+cv.dataset.n);
          if (mia !== tarea || cv._gen !== gen) return;
          const v1 = pag.getViewport({ scale: 1 }), vp = pag.getViewport({ scale: (ancho / v1.width) * ppx });
          cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
          cv.style.aspectRatio = vp.width + " / " + vp.height;
          cv._tarea = pag.render({ canvasContext: cv.getContext("2d"), viewport: vp });
          await cv._tarea.promise;
          if (cv._gen === gen) cv.dataset.estado = "hecha";
        } catch (_) { if (cv._gen === gen) cv.dataset.estado = ""; }
        if (cv._gen === gen) cv._tarea = null;
      };
      const suelta = (cv) => {
        if (!cv.dataset.estado) return;
        cv._gen = (cv._gen || 0) + 1;
        cv._tarea?.cancel?.(); cv._tarea = null;
        cv.dataset.estado = ""; cv.width = 0; cv.height = 0;
      };
      // Alto de cada página antes de dibujarla, para que la barra de desplazamiento sea la de verdad
      const v1 = (await doc.getPage(1)).getViewport({ scale: 1 });
      if (mia !== tarea) return;
      const obs = "IntersectionObserver" in window
        ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? dibuja(e.target) : suelta(e.target))), { root: c, rootMargin: "1200px 0px" })
        : null;
      observador = obs;
      for (let n = 1; n <= doc.numPages; n++) {
        const cv = document.createElement("canvas");
        cv.className = "visor-pag"; cv.dataset.n = n; cv.width = 0; cv.height = 0;
        cv.style.width = Math.floor(ancho) + "px"; cv.style.aspectRatio = v1.width + " / " + v1.height;
        cv.setAttribute("aria-label", `Página ${n} de ${doc.numPages}`); cv.setAttribute("role", "img");
        c.appendChild(cv);
        if (obs) obs.observe(cv);
      }
      // Sin IntersectionObserver (navegadores muy viejos): de una en una
      if (!obs) for (const cv of c.querySelectorAll(".visor-pag")) { if (mia !== tarea) return; await dibuja(cv); }
      // Con el foco en el PDF, las flechas y AvPág lo mueven
      if (velo && document.activeElement === velo.querySelector(".visor-cerrar")) c.focus({ preventScroll: true });
    } catch (e) {
      if (mia !== tarea) return;
      c.innerHTML = `<p class="visor-msg" role="status">No se ha podido abrir el PDF aquí. <a href="${esc(urlSegura(url))}" target="_blank" rel="noopener">Abrirlo aparte</a></p>`;
      if (velo && document.activeElement === velo.querySelector(".visor-cerrar")) c.querySelector("a")?.focus();
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
