// Cartel para el tablón: código QR hecho en el propio navegador (librería qrcode-generator, MIT).
// Nivel H (aguanta un 30 % tapado): así cabe el logo en el centro y se sigue leyendo.
(function () {
  // Sale de donde esté publicada la web: imprimir el cartel desde la web publicada, no desde una copia local
  const WEB = new URL("./", location.href).href;
  const q = qrcode(0, "H"); q.addData(WEB); q.make();
  document.getElementById("qr-web").innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  document.getElementById("url-web").textContent = WEB.replace(/^https?:\/\//, "");
  document.getElementById("b-imprimir").addEventListener("click", () => print());
})();
