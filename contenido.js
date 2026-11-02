/*
 * ============================================================
 *  CONTENIDO DE LA APP — edita solo este archivo
 * ============================================================
 *  - Cambia los textos entre comillas.
 *  - Para añadir un aviso o evento, copia un bloque { ... },
 *    pégalo debajo y cambia los datos (no olvides la coma).
 *  - Fechas en formato AAAA-MM-DD (ej.: "2026-12-24").
 *  - Después de cambiar algo, sube también sw.js con la
 *    VERSION incrementada para que los móviles se actualicen.
 * ============================================================
 */
const CONTENIDO = {
  nombre: "Comité Calsina Carré",
  lema: "Información y avisos para todos los socios",
  bienvenida:
    "Esta es la app oficial del comité. Aquí encontrarás los avisos, la agenda de actividades y la forma de contactar con nosotros.",

  avisos: [
    {
      fecha: "2026-11-02",
      titulo: "¡Estrenamos app!",
      texto: "Ya podéis instalar la app del comité en el móvil. Compartidla con todos los socios."
    },
    {
      fecha: "2026-10-20",
      titulo: "Cuotas del próximo año",
      texto: "Recordamos que el plazo para abonar la cuota anual termina el 31 de diciembre."
    }
  ],

  eventos: [
    {
      fecha: "2026-11-15",
      hora: "18:00",
      titulo: "Reunión general",
      lugar: "Local social",
      texto: "Repaso de las cuentas y propuestas para el próximo año."
    },
    {
      fecha: "2026-12-20",
      hora: "13:30",
      titulo: "Comida de Navidad",
      lugar: "Por confirmar",
      texto: "Apuntaos antes del 10 de diciembre."
    }
  ],

  contacto: {
    telefono: "600 000 000",
    email: "comite@ejemplo.com",
    direccion: "Calle Ejemplo, 1",
    horario: "Martes y jueves de 18:00 a 20:00"
  }
};
