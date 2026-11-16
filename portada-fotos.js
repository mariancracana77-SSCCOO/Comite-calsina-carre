// Fotos reales de la empresa que van pasando solas en la portada (encargo de Lorena, 16/11/2026), en el PC, en el móvil y en la app.
// La primera foto es el fondo de .hero-arte (styles.css y web-pc-rb.css; carga con la página). Las demás se piden después de cargar
// la página y cada una justo antes de enseñarla. En pantallas de menos de 760 px se usan las copias pequeñas de img/portada/movil/.
// Cambia cada 7 s en «cortina»; se para si la pestaña no se ve, con el botón de pausa o con «reducir movimiento» (entonces se queda la
// primera, quieta). Créditos completos en creditos.html.
(function () {
  "use strict";
  var quieto = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var mover = !quieto.matches;
  var pequena = window.matchMedia && matchMedia("(max-width: 759px)").matches;
  var ruta = function (src) { return pequena ? src.replace("img/portada/", "img/portada/movil/") : src; };
  // La primera foto es el fondo de .hero-arte en web-pc-rb.css (carga con la página). Las demás se piden después de cargar
  // la página y cada una justo antes de enseñarla. Cambia cada 7 s con un fundido; se para si la pestaña no se ve, con el botón
  // de pausa o con «reducir movimiento» (entonces se queda la primera, quieta). Créditos completos en creditos.html.
  var FOTOS = [
    { src: "img/portada/1-conductores.webp", que: "Conducción", credito: "Foto: aportada por un compañero de la plantilla" },
    { src: "img/portada/2-flota.webp", que: "La flota de camiones", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/3-almacen.webp", que: "Almacén y muelles de carga", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/3b-almacen-dentro.webp", que: "Dentro del almacén", credito: "Foto: TLSuda, CC BY-SA 4.0 (Wikimedia Commons)" },
    { src: "img/portada/4-taller.webp", que: "Taller", credito: "Foto: PattayaPatrol, CC BY-SA 4.0 (Wikimedia Commons)" },
    { src: "img/portada/5-gasolinera.webp", que: "La gasolinera de la empresa", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/6-tren.webp", que: "Transporte en tren", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/7-barco.webp", que: "Transporte por barco", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/8-duo.webp", que: "Dúo tráiler", credito: "Foto: Calsina Carré (calsina-carre.com)" },
    { src: "img/portada/9-base.webp", que: "La base", credito: "Foto: Calsina Carré (calsina-carre.com)" }
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
      if (i === 0) d.firstChild.style.backgroundImage = "url(" + ruta(f.src) + ")";
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
    arte.parentNode.insertBefore(pases, arte.nextSibling);
    var actual = 0, parado = false, reloj = null;
    var carga1 = function (i) {
      return new Promise(function (ok) {
        var c = capas[i].firstChild;
        if (c.style.backgroundImage) { ok(); return; }
        var im = new Image(); im.onload = im.onerror = function () { c.style.backgroundImage = "url(" + ruta(FOTOS[i].src) + ")"; ok(); }; im.src = ruta(FOTOS[i].src);
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
