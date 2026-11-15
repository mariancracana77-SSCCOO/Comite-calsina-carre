// Movimiento de la web en el ORDENADOR (maqueta de diseño). Solo actúa si se cumplen las dos cosas:
//   - pantalla de 1000 px o más en el navegador (la misma condición con la que index.html carga web-pc-*.css), y
//   - el sistema NO pide «reducir movimiento».
// En el móvil, en la app instalada y en el panel no hace nada (ni siquiera carga GSAP). Sin este archivo la web se ve entera:
// todo empieza visible y solo se esconde un momento lo que se va a animar.
// Qué hace:
//   1. Entrada de la portada: titular, texto e imagen en una secuencia corta (GSAP 3.15.1, lib/gsap-3.15.1.min.js, curva expo-out).
//   2. Tarjetas, avisos y filas de la agenda aparecen un poco al llegar con el scroll, una sola vez cada una
//      (IntersectionObserver; la transición la pone el CSS de cada diseño con .pc-revela / .pc-visto: solo opacity y transform).
//   3. Parallax muy ligero de la imagen de la portada (propiedad «translate», no toca el layout).
// No hay scroll suave ni nada que secuestre la rueda del ratón (por eso no se usa Lenis).
(function () {
  "use strict";
  var pc = window.matchMedia && matchMedia("(min-width: 1000px) and (display-mode: browser)");
  var quieto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  if (!pc || !pc.matches || quieto.matches || !("IntersectionObserver" in window)) return;

  var html = document.documentElement;
  var hoja = document.querySelector('link[href*="web-pc-"]');
  var estilo = ((hoja && hoja.getAttribute("href")) || "").replace(/^.*web-pc-([a-z0-9]+)\.css.*$/, "$1");
  // Carácter de cada diseño: de dónde llega el titular y cuánto se mueve la imagen al bajar
  var CARACTER = {
    a: { x: 0, y: 18, dur: 0.6, imagen: { opacity: 0.35, scale: 1.015 }, parallax: 0.05 },
    b: { x: -18, y: 0, dur: 0.55, imagen: { opacity: 0.35, x: 22 }, parallax: 0.06 },
    c: { x: 0, y: 14, dur: 0.6, imagen: { opacity: 0.4, scale: 1.03 }, parallax: 0.12 },
    d: { x: 0, y: 22, dur: 0.7, imagen: { opacity: 0.35, scale: 1.02 }, parallax: 0.08 },
    e1: { x: 0, y: 22, dur: 0.7, imagen: { opacity: 0.35, scale: 1.02 }, parallax: 0.08 },
    e2: { x: 0, y: 22, dur: 0.7, imagen: { opacity: 0.35, scale: 1.02 }, parallax: 0.08 },
  }[estilo] || { x: 0, y: 14, dur: 0.6, imagen: { opacity: 0.4 }, parallax: 0.06 };

  // ---- 1. Entrada de la portada ----
  var enPortada = !location.hash || location.hash === "#actualidad";
  if (enPortada) html.classList.add("pc-anim"); // el CSS esconde el titular un instante hasta que empieza la entrada
  var listo = function () { html.classList.add("pc-anim-listo"); };
  var seguro = setTimeout(listo, 1200); // si GSAP no llega a tiempo, se enseña todo tal cual
  var dom = new Promise(function (r) { if (document.readyState !== "loading") r(); else document.addEventListener("DOMContentLoaded", r); });
  var entrada = function () {
    var g = window.gsap, txt = document.querySelectorAll("#v-actualidad .hero-titulo, #v-actualidad .hero-sub"), arte = document.querySelector("#v-actualidad .hero-arte");
    if (!g || !txt.length || html.classList.contains("pc-anim-listo")) { listo(); return; }
    clearTimeout(seguro);
    var tl = g.timeline({ defaults: { ease: "expo.out", duration: CARACTER.dur }, onComplete: function () { g.set(txt, { clearProps: "transform,opacity" }); if (arte) g.set(arte, { clearProps: "transform,opacity" }); } });
    tl.fromTo(txt, { opacity: 0, x: CARACTER.x, y: CARACTER.y }, { opacity: 1, x: 0, y: 0, stagger: 0.08, immediateRender: true }, 0);
    if (arte) tl.fromTo(arte, CARACTER.imagen, { opacity: 1, x: 0, scale: 1, duration: CARACTER.dur + 0.1 }, 0.06);
    listo();
  };
  if (enPortada) {
    var s = document.createElement("script");
    s.src = "lib/gsap-3.15.1.min.js";
    s.onload = function () { dom.then(entrada); };
    s.onerror = listo;
    document.head.appendChild(s);
  } else listo();

  // ---- 2. Aparecer al llegar con el scroll, una sola vez ----
  var QUE = "main .tarjeta, main .lead, .agenda-item, .banda-parte";
  var vistos = new Set();
  var clave = function (e) { return e.id || e.getAttribute("href") || (e.querySelector("a[href]") || {}).href || ""; };
  var io = new IntersectionObserver(function (entradas) {
    var nuevas = entradas.filter(function (x) { return x.isIntersecting; }).map(function (x) { return x.target; })
      .sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.top - rb.top || ra.left - rb.left; });
    nuevas.forEach(function (e, i) {
      io.unobserve(e);
      e.style.setProperty("--pc-retraso", Math.min(i * 70, 280) + "ms");
      e.classList.add("pc-visto");
      var k = clave(e); if (k) vistos.add(k);
      // Al terminar se quitan las clases: así el hover y lo demás del diseño funcionan sin nada encima
      setTimeout(function () { e.classList.remove("pc-revela", "pc-visto"); e.style.removeProperty("--pc-retraso"); }, 1100 + Math.min(i * 70, 280));
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
  var prepara = function (raiz) {
    var lista = raiz.matches && raiz.matches(QUE) ? [raiz] : [];
    if (raiz.querySelectorAll) lista = lista.concat([].slice.call(raiz.querySelectorAll(QUE)));
    lista.forEach(function (e) {
      if (e.classList.contains("pc-revela")) return;
      var k = clave(e);
      if (k && vistos.has(k)) return; // ya se vio: al repintar con los datos nuevos no se anima otra vez
      e.classList.add("pc-revela");
      io.observe(e);
    });
  };
  dom.then(function () {
    prepara(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) prepara(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  });

  // ---- 3. Parallax muy ligero de la imagen de la portada ----
  var pendiente = false;
  var mueve = function () {
    pendiente = false;
    var arte = document.querySelector("#v-actualidad .hero-arte");
    if (!arte || !arte.getClientRects().length) return;
    var y = Math.min(window.scrollY, 600);
    arte.style.translate = y > 0 ? "0 " + (y * CARACTER.parallax).toFixed(1) + "px" : "";
  };
  window.addEventListener("scroll", function () { if (!pendiente) { pendiente = true; requestAnimationFrame(mueve); } }, { passive: true });

  // Si el sistema pasa a «reducir movimiento» con la página abierta, todo queda quieto y a la vista
  quieto.addEventListener && quieto.addEventListener("change", function (e) {
    if (!e.matches) return;
    listo();
    document.querySelectorAll(".pc-revela").forEach(function (x) { x.classList.remove("pc-revela", "pc-visto"); });
    var arte = document.querySelector("#v-actualidad .hero-arte"); if (arte) arte.style.translate = "";
    io.disconnect();
  });
})();
