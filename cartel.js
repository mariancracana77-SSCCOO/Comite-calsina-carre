// Cartel para el tablón: código QR hecho en el propio navegador (librería qrcode-generator, MIT).
// Nivel H (aguanta un 30 % tapado): así cabe el logo en el centro y se sigue leyendo.
(function () {
  const WEB = "https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/";
  const q = qrcode(0, "H"); q.addData(WEB); q.make();
  document.getElementById("qr-web").innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  document.getElementById("url-web").textContent = WEB.replace(/^https:\/\//, "");
  document.getElementById("b-imprimir").addEventListener("click", () => print());
})();
