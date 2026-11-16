// Movimiento y cifras de la web en el ORDENADOR. Solo actúa con pantalla de 1000 px o más en el navegador
// (la misma condición con la que index.html carga web-pc-*.css). En el móvil, en la app instalada y en el panel no hace nada
// (ni siquiera carga GSAP). Sin este archivo la web se ve entera: todo empieza visible.
// Qué hace:
//   0. «El comité, ahora mismo» (#cifras, portada): cuenta lo que la web ya ha pintado (reuniones previstas, avisos publicados y
//      miembros) y escribe la frase con el número final. Si no hay ningún dato, el bloque sigue oculto. Esto se hace también con
//      «reducir movimiento» (solo que sin contar hacia arriba).
// Y, si el sistema NO pide «reducir movimiento»:
//   1. Entrada de la portada: titular, texto e imagen en una secuencia corta (GSAP 3.15.1, curva expo-out).
//   2. Lo que queda por debajo de la pantalla aparece un poco al llegar con el scroll, una sola vez (GSAP ScrollTrigger 3.15.1;
//      la transición la pone el CSS de cada diseño con .pc-revela / .pc-visto: solo opacity y transform). Lo que ya se ve al abrir
//      una página no se esconde nunca.
//   3. Los números de las cifras suben desde 0 hasta el número real al llegar a ellos (una vez).
//   4. Parallax muy ligero de la imagen de la portada (propiedad «translate», no toca el layout).
// No hay scroll suave ni nada que secuestre la rueda del ratón o el teclado.
(function () {
  "use strict";
  var pc = window.matchMedia && matchMedia("(min-width: 1000px) and (display-mode: browser)");
  if (!pc || !pc.matches) return;
  var quieto = matchMedia("(prefers-reduced-motion: reduce)");
  var mover = !quieto.matches;

  var html = document.documentElement;
  var hoja = document.querySelector('link[href*="web-pc-"]');
  var estilo = ((hoja && hoja.getAttribute("href")) || "").replace(/^.*web-pc-([a-z0-9]+)\.css.*$/, "$1");
  // Carácter de cada diseño: de dónde llega el titular y cuánto se mueve la imagen al bajar
  var CARACTER = {
    e2: { x: 0, y: 22, dur: 0.7, imagen: { opacity: 0.35, scale: 1.02 }, parallax: 0.08 },
    ra: { x: 0, y: 28, dur: 0.8, imagen: { opacity: 0, scale: 1.04 }, parallax: 0.1 },
    rb: { x: -24, y: 0, dur: 0.8, imagen: { opacity: 0, x: 110 }, parallax: 0.14 },
  }[estilo] || { x: 0, y: 14, dur: 0.6, imagen: { opacity: 0.4 }, parallax: 0.06 };

  var enPortada = !location.hash || location.hash === "#actualidad";
  var dom = new Promise(function (r) { if (document.readyState !== "loading") r(); else document.addEventListener("DOMContentLoaded", r); });
  var carga = function (src) {
    return new Promise(function (ok, mal) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  };

  // ---- 0. El comité, ahora mismo ----
  var TEXTOS = {
    reuniones: ["reunión prevista", "reuniones previstas"],
    avisos: ["aviso publicado", "avisos publicados"],
    miembros: ["persona en el comité", "personas en el comité"],
  };
  var huella = "", contado = false, stCifras = null;
  var cuenta = function () {
    return {
      // Las reuniones de hoy en adelante: en el PC van todas en «Próximas» (#reunion-arriba solo se usa en el móvil)
      reuniones: document.querySelectorAll('#reunion-arriba article[id^="reunion-"], #lista-proximas article[id^="reunion-"]').length,
      avisos: document.querySelectorAll("#lista-avisos article.aviso").length,
      miembros: document.querySelectorAll("#lista-miembros article.miembro").length,
      // si la lista de avisos tiene «Ver más», hay más de los que se cuentan
      masAvisos: !!document.querySelector('#lista-avisos [data-ver-mas="avisos"]'),
    };
  };
  var span = function (clase, txt) { var s = document.createElement("span"); s.className = clase; if (txt) s.textContent = txt; return s; };
  var pintaCifras = function () {
    var caja = document.getElementById("cifras"), frase = document.getElementById("cifras-frase");
    if (!caja || !frase) return;
    var n = cuenta(), h = JSON.stringify(n);
    if (h === huella) return;
    huella = h;
    var partes = ["reuniones", "avisos", "miembros"].filter(function (k) { return n[k] > 0; });
    frase.textContent = "";
    if (!partes.length) { caja.removeAttribute("data-listo"); return; }
    frase.appendChild(span("cifras-pre", "Ahora mismo hay "));
    partes.forEach(function (k, i) {
      var c = span("cifra c-" + k), b = document.createElement("b");
      b.textContent = n[k] + (k === "avisos" && n.masAvisos ? "+" : "");
      b.setAttribute("data-n", n[k]);
      c.appendChild(b);
      c.appendChild(span("cifra-txt", " " + (k === "avisos" && n.masAvisos ? "o más " : "") + TEXTOS[k][n[k] === 1 ? 0 : 1]));
      frase.appendChild(c);
      frase.appendChild(span("cifras-sep", i < partes.length - 2 ? ", " : i === partes.length - 2 ? " y " : "."));
    });
    caja.setAttribute("data-listo", "");
    armaCifras();
  };
  // El contador se arma cuando ya hay ScrollTrigger y el bloque se ve (si se arma oculto, saltaría antes de tiempo)
  var armaCifras = function () {
    var caja = document.getElementById("cifras"), ST = window.ScrollTrigger;
    if (!mover || contado || stCifras || !ST || !ST.create || !caja || !caja.hasAttribute("data-listo") || !caja.getClientRects().length) return;
    stCifras = ST.create({ trigger: caja, start: "top 88%", once: true, onEnter: function () { setTimeout(subeNumeros, enPortada ? 450 : 0); } });
  };
  var subeNumeros = function () {
    if (contado || !window.gsap) return;
    contado = true;
    document.querySelectorAll("#cifras .cifra b").forEach(function (b, i) {
      var fin = +b.getAttribute("data-n"), mas = /\+$/.test(b.textContent) ? "+" : "", o = { v: 0 };
      if (!(fin > 1)) return;
      gsap.to(o, { v: fin, duration: 1.1 + i * 0.15, ease: "expo.out", delay: i * 0.08,
        onUpdate: function () { b.textContent = Math.round(o.v) + mas; },
        onComplete: function () { b.textContent = b.getAttribute("data-n") + mas; } });
    });
  };
  var VIGILA = ["lista-avisos", "lista-proximas", "reunion-arriba", "lista-miembros"];
  dom.then(function () {
    pintaCifras();
    var mo = new MutationObserver(function () { pintaCifras(); });
    VIGILA.forEach(function (id) { var e = document.getElementById(id); if (e) mo.observe(e, { childList: true, subtree: true }); });
  });

  if (!mover) return;

  // ---- 1. Entrada de la portada ----
  if (enPortada) html.classList.add("pc-anim"); // el CSS esconde el titular un instante hasta que empieza la entrada
  var listo = function () { html.classList.add("pc-anim-listo"); };
  var seguro = setTimeout(listo, 1200); // si GSAP no llega a tiempo, se enseña todo tal cual
  var entrada = function () {
    var g = window.gsap, txt = document.querySelectorAll("#v-actualidad .hero-eyebrow, #v-actualidad .hero-titulo, #v-actualidad .hero-sub, #v-actualidad .hero-btns"), arte = document.querySelector("#v-actualidad .hero-arte");
    if (!g || !txt.length || html.classList.contains("pc-anim-listo")) { listo(); return; }
    clearTimeout(seguro);
    var tl = g.timeline({ defaults: { ease: "expo.out", duration: CARACTER.dur }, onComplete: function () { g.set(txt, { clearProps: "transform,opacity" }); if (arte) g.set(arte, { clearProps: "transform,opacity" }); } });
    tl.fromTo(txt, { opacity: 0, x: CARACTER.x, y: CARACTER.y }, { opacity: 1, x: 0, y: 0, stagger: 0.09, immediateRender: true }, 0);
    if (arte) tl.fromTo(arte, CARACTER.imagen, { opacity: 1, x: 0, scale: 1, duration: CARACTER.dur + 0.6, ease: "power3.out" }, 0.05);
    listo();
  };
  var conGsap = carga("lib/gsap-3.15.1.min.js");
  conGsap.then(function () { dom.then(entrada); }, listo);
  if (!enPortada) listo();

  // ---- 2 a 4. Con ScrollTrigger ----
  var QUE = "main .tarjeta, main .lead, .agenda-item, .banda-parte, #cifras .cifra, .foto-pc";
  var vistos = new Set();
  var clave = function (e) { return e.id || e.getAttribute("href") || (e.querySelector("a[href]") || {}).href || e.className; };
  var cola = [], enCola = false;
  var revela = function (e) {
    cola.push(e);
    if (enCola) return;
    enCola = true;
    requestAnimationFrame(function () {
      enCola = false;
      var lote = cola.splice(0).sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.top - rb.top || ra.left - rb.left; });
      lote.forEach(function (x, i) {
        x.style.setProperty("--pc-retraso", Math.min(i * 70, 280) + "ms");
        x.classList.add("pc-visto");
        // Al terminar se quitan las clases: así el hover y lo demás del diseño funcionan sin nada encima
        setTimeout(function () { x.classList.remove("pc-revela", "pc-visto"); x.style.removeProperty("--pc-retraso"); }, 1100 + Math.min(i * 70, 280));
      });
    });
  };
  conGsap.then(function () { return carga("lib/ScrollTrigger-3.15.1.min.js"); }).then(function () { return dom; }).then(function () {
    var g = window.gsap, ST = window.ScrollTrigger;
    if (!g || !ST) return;
    g.registerPlugin(ST);
    // Solo se prepara lo que está por DEBAJO de la pantalla en este momento: lo que ya se ve no parpadea nunca
    var prepara = function (raiz) {
      if (!raiz) return;
      var lista = raiz.matches && raiz.matches(QUE) ? [raiz] : [];
      if (raiz.querySelectorAll) lista = lista.concat([].slice.call(raiz.querySelectorAll(QUE)));
      var alto = window.innerHeight;
      lista.forEach(function (e) {
        if (e.classList.contains("pc-revela") || !e.getClientRects().length) return;
        var k = clave(e);
        if (k && vistos.has(k)) return; // ya se vio: al repintar con los datos nuevos no se anima otra vez
        if (k) vistos.add(k);
        if (e.getBoundingClientRect().top < alto) return;
        e.classList.add("pc-revela");
        ST.create({ trigger: e, start: "top 94%", once: true, onEnter: function () { revela(e); } });
      });
    };
    var limpia = function () { ST.getAll().forEach(function (t) { if (t.trigger && !t.trigger.isConnected) t.kill(); }); };
    var pendiente = null;
    var repasa = function () {
      clearTimeout(pendiente);
      pendiente = setTimeout(function () { limpia(); prepara(document.querySelector(".vista:not([hidden])")); prepara(document.querySelector(".banda-contacto")); ST.refresh(); armaCifras(); }, 80);
    };
    prepara(document.querySelector(".vista:not([hidden])"));
    prepara(document.querySelector(".banda-contacto"));
    // Al repintar (copia guardada y luego la red) o al cambiar de apartado: fuera lo que ya no está, se prepara lo nuevo
    // (los números que suben dentro de #cifras no cuentan como repintar)
    new MutationObserver(function (ms) { if (ms.some(function (m) { return !(m.target.closest && m.target.closest("#cifras .cifra")); })) repasa(); })
      .observe(document.getElementById("contenido"), { childList: true, subtree: true });
    window.addEventListener("hashchange", repasa);

    // 3. Las cifras suben al llegar a ellas (si ya se ven al abrir, después de la entrada de la portada)
    armaCifras();

    // 4. Parallax muy ligero de la imagen de la portada
    var hero = document.querySelector("#v-actualidad .hero"), arte = document.querySelector("#v-actualidad .hero-arte");
    if (hero && arte) ST.create({ trigger: hero, start: "top top", end: "bottom top", onUpdate: function (s) {
      arte.style.translate = s.progress > 0 ? "0 " + (s.progress * hero.offsetHeight * CARACTER.parallax).toFixed(1) + "px" : "";
    } });

    // Si el sistema pasa a «reducir movimiento» con la página abierta, todo queda quieto y a la vista
    quieto.addEventListener && quieto.addEventListener("change", function (e) {
      if (!e.matches) return;
      listo();
      ST.getAll().forEach(function (t) { t.kill(); });
      document.querySelectorAll(".pc-revela").forEach(function (x) { x.classList.remove("pc-revela", "pc-visto"); });
      if (arte) arte.style.translate = "";
    });
  });
  // ---- 5. Fondo de la portada con fotos de varios oficios que cambian solas (encargo de Lorena, 16/11/2026) ----
  // La primera foto es el fondo de .hero-arte en web-pc-rb.css (carga con la página). Las demás se piden después de cargar
  // la página y cada una justo antes de enseñarla. Cambia cada 7 s con un fundido; se para si la pestaña no se ve, con el botón
  // de pausa o con «reducir movimiento» (entonces se queda la primera, quieta). Créditos completos en creditos.html.
  var FOTOS = [
    { src: "img/portada/1-conductores.webp", que: "Conductores", credito: "Foto: aportada por un compañero de la plantilla" },
    { src: "img/portada/2-almacen.webp", que: "Almacén y carretillas", credito: "Foto: TLSuda, CC BY-SA 4.0 (Wikimedia Commons)" },
    { src: "img/portada/3-taller.webp", que: "Taller", credito: "Foto: PattayaPatrol, CC BY-SA 4.0 (Wikimedia Commons)" }
  ];
  var CADA = 7000;
  var montaFotos = function () {
    var hero = document.querySelector("#v-actualidad .hero"), arte = hero && hero.querySelector(".hero-arte");
    if (!arte || arte.querySelector(".hero-fotos")) return;
    var credito = hero.querySelector(".hero-credito");
    var pon = function (i) {
      if (!credito) return;
      credito.textContent = FOTOS[i].credito + " · ";
      var a = document.createElement("a"); a.href = "creditos.html"; a.textContent = "Créditos de las fotos";
      credito.appendChild(a); credito.hidden = false;
    };
    pon(0);
    if (!mover) return; // con «reducir movimiento», una sola foto fija
    var caja = document.createElement("div"); caja.className = "hero-fotos";
    var capas = FOTOS.map(function (f, i) {
      var d = document.createElement("div"); d.className = "hero-foto" + (i === 0 ? " activa" : "");
      d.appendChild(document.createElement("i"));
      if (i === 0) d.firstChild.style.backgroundImage = "url(" + f.src + ")";
      caja.appendChild(d); return d;
    });
    var filo = document.createElement("div"); filo.className = "hero-filo"; caja.appendChild(filo);
    arte.appendChild(caja);
    var pases = document.createElement("div"); pases.className = "hero-pases";
    pases.setAttribute("role", "group"); pases.setAttribute("aria-label", "Fotos de la portada");
    var PAUSA = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';
    var SIGUE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11a.8.8 0 0 0 1.2.7l9-5.5a.8.8 0 0 0 0-1.4l-9-5.5A.8.8 0 0 0 4 2.5z"/></svg>';
    var boton = document.createElement("button"); boton.type = "button"; boton.className = "pausa";
    pases.appendChild(boton);
    var puntos = FOTOS.map(function (f, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "punto";
      b.setAttribute("aria-label", "Foto " + (i + 1) + " de " + FOTOS.length + ": " + f.que);
      if (i === 0) b.setAttribute("aria-current", "true");
      pases.appendChild(b); return b;
    });
    hero.appendChild(pases);
    var actual = 0, parado = false, reloj = null;
    var carga1 = function (i) {
      return new Promise(function (ok) {
        var c = capas[i].firstChild;
        if (c.style.backgroundImage) { ok(); return; }
        var im = new Image(); im.onload = im.onerror = function () { c.style.backgroundImage = "url(" + FOTOS[i].src + ")"; ok(); }; im.src = FOTOS[i].src;
      });
    };
    var limpia = null;
    var ve = function (i) {
      if (i === actual) return;
      carga1(i).then(function () {
        clearTimeout(limpia);
        capas.forEach(function (c) { c.classList.remove("sale", "entra", "va"); });
        filo.classList.remove("entra", "va");
        var antes = capas[actual], nueva = capas[i];
        antes.classList.remove("activa"); antes.classList.add("sale"); puntos[actual].removeAttribute("aria-current");
        nueva.classList.add("entra", "activa", "ya"); filo.classList.add("entra");
        void nueva.offsetWidth; // que el navegador pinte la posición de salida antes de mover la cortina
        nueva.classList.add("va"); filo.classList.add("va");
        actual = i; puntos[i].setAttribute("aria-current", "true"); pon(i);
        limpia = setTimeout(function () { antes.classList.remove("sale"); nueva.classList.remove("entra", "va"); filo.classList.remove("entra", "va"); }, 1700);
        carga1((i + 1) % FOTOS.length); // la siguiente, ya preparada
      });
    };
    var llena = function () { // vuelve a empezar la rayita que se va llenando
      var b = puntos[actual]; b.removeAttribute("aria-current"); void b.offsetWidth; b.setAttribute("aria-current", "true");
    };
    var para = function () { clearInterval(reloj); reloj = null; };
    var sigue = function () { para(); if (!parado && !document.hidden) { llena(); reloj = setInterval(function () { ve((actual + 1) % FOTOS.length); }, CADA); } };
    var pinta = function () {
      boton.innerHTML = parado ? SIGUE : PAUSA; pases.classList.toggle("parado", parado);
      boton.setAttribute("aria-label", parado ? "Seguir pasando las fotos" : "Parar las fotos");
    };
    boton.addEventListener("click", function () { parado = !parado; pinta(); sigue(); });
    puntos.forEach(function (b, i) { b.addEventListener("click", function () { if (i === actual) return; ve(i); setTimeout(sigue, 0); }); });
    document.addEventListener("visibilitychange", sigue);
    quieto.addEventListener && quieto.addEventListener("change", function (e) { if (e.matches) { parado = true; pinta(); para(); } });
    pinta();
    carga1(1);
    sigue();
  };
  var trasCarga = function () { setTimeout(montaFotos, 300); };
  if (document.readyState === "complete") trasCarga(); else window.addEventListener("load", trasCarga);
})();
