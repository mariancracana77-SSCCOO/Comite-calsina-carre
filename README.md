# Comité de Empresa Calsina Carré

Web gratuita que **se instala como app** (PWA) para informar a toda la plantilla de Calsina Carré desde el **comité de empresa**. No es la web del sindicato: el comité representa a todos los trabajadores, sean del sindicato que sean. (La web de la Sección Sindical CCOO está en el repositorio `SSCCOO`).

- Web: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/
- Panel para publicar: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/admin.html

## Qué tiene la web

| Apartado | Qué hay |
|---|---|
| **Info general** (portada) | Cabecera con el logo, aviso urgente, próxima reunión con los días que faltan, «novedades desde tu última visita», consultas abiertas, accesos rápidos y anuncios (información general, sin destacar) |
| **Avisos** | Lo importante que hay que destacar (huelga, festivo, elecciones); los urgentes en rojo; contador de avisos sin leer en la pestaña |
| **Calendario de reuniones** | Calendario del mes, próximas reuniones (con botón «Añadir a mi calendario») y reuniones pasadas |
| **Actas** | Resumen y acuerdos con buscador y filtro por año; y **Documentos útiles** (convenio, calendario laboral, tablas salariales…) |
| **Sugerencias y preguntas** | Buzón **anónimo** y preguntas frecuentes |
| **Nosotros** | Qué es el comité y quién lo forma (con teléfono o email solo si la persona quiere) |

Además: **avisos al móvil** (notificaciones; en iPhone, con la app instalada), lupa para buscar en toda la web, botón fijo «Contactar con el comité», compartir por WhatsApp, letra más grande (botón «Aa»), modo oscuro, funciona sin conexión con lo último guardado, y página de privacidad.

## El panel (para publicar sin tocar código)

Tiene la misma forma de trabajar que el panel de CCOO:

- **En el ordenador**: menú a la izquierda (Inicio, Avisos, Actualidad, Reuniones, Actas · La plantilla · El comité · Herramientas).
- **En el móvil**: barra abajo (Inicio, Avisos, Reuniones, Actas, Más) y botón azul **«+ Nuevo»**.
- **Inicio**: «¿Qué quieres publicar hoy?» con botones grandes, próximos 14 días, avisos programados y lo último publicado.
- **Editor en ventana**: a un lado se escribe y al otro se ve **«Así lo verán los trabajadores»**. Botones de Negrita y Lista, archivos (tocar o arrastrar), y botones Borrar, Duplicar (útil para reuniones que se repiten), Cancelar y Publicar.
- **Buzón anónimo**: leer, archivar, y «Responder en la web» lo convierte en pregunta frecuente.
- **Consultas**: votaciones anónimas a la plantilla, con resultados.
- **Papelera**: lo borrado se puede recuperar durante 90 días.
- **Cartel con QR**: cartel A4 para el tablón de anuncios.
- **Ajustes**: correos con acceso al panel.
- **Avisos al móvil**: al publicar, llega una notificación a quien la haya activado en la web (casilla «Avisar al móvil al publicar»; al editar, «Volver a avisar al móvil de este cambio»). Los avisos programados avisan solos a su hora. En Inicio se ve cuántos móviles están apuntados y se puede mandar una prueba.
- **Visitas y estadísticas** (abajo en Inicio): visitas por día y lo más visto. Solo números, sin saber quién entra.
- **Guía del panel** (`guia.html`): cómo se hace cada cosa, con capturas. Enlazada desde el menú y desde Inicio.

### Entrar por primera vez
1. Abre el panel, despliega «¿Problemas para entrar?» y pulsa **«Primera vez: crear la cuenta»** (con el email autorizado y la contraseña que quieras).
2. Llega un email: pulsa el botón para confirmar. Después ya se entra con email y contraseña.

Emails autorizados al principio: los mismos dos administradores del panel de CCOO. Se cambian desde **Ajustes**.

## Cosas que tenéis que hacer vosotros (una vez)

1. **Supabase → Authentication → URL Configuration**: en «Site URL» poned
   `https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/admin.html`
   y añadid la misma dirección en «Redirect URLs». Sin esto, el botón de los emails (crear cuenta y recuperar contraseña) no lleva al panel.
2. **Publicar la web**: juntar la rama de trabajo con `main` y en GitHub → **Settings → Pages** elegir la rama `main`, carpeta `/ (root)`.
3. Revisar en el panel → **Textos de la web** la bienvenida, «Nosotros» y la privacidad.

## Base de datos

Proyecto Supabase propio del comité, **separado del de CCOO**: `comite-calsina-carre` (`ytxpubqyhnohhugpukdm`, París, plan gratis).

## Pruebas

```bash
NODE_PATH=$(npm root -g) node pruebas/humo.cjs
```

Abre la web y el panel con datos de prueba (sin tocar la base de datos real) en móvil de 320 y 390 px, oscuro, letra muy grande y PC. Avisa de errores y guarda capturas en `pruebas/capturas/`.

## Versiones

- **v8**: contraseñas sin email como en CCOO: en Ajustes se pone la contraseña a cada correo con acceso (si no tiene cuenta, se crea) y códigos de rescate; el error al entrar explica que la cuenta del comité es distinta de la de CCOO.
- **v9**: Actualidad pasa a ser «anuncios» (información general para todos, sin destacar) y Avisos queda para lo importante (huelga, festivo, elecciones); textos y ayudas del panel lo explican.
- **v10**: avisos con estilo de señal de tráfico (señal azul de información con «i»; los urgentes, señal de peligro con «!» y luz ámbar, franja de rayas rojas y blancas y borde de carretera, también en la portada). Traído de CCOO: «Destacar en la portada el día» en los avisos (ese día sale en rojo arriba y llega «DESTACADO HOY» a los móviles desde las 8:00; botón «Quitar el destacado») y copia de seguridad en Ajustes (ZIP con archivos o solo textos; Inicio la recuerda cada mes).
- **v11**: «Actualidad» pasa a llamarse **«Info general»**. **Secciones propias**: desde el panel se crean secciones y subsecciones (con nombre, explicación, dibujo, orden y ocultar) y se publica dentro con archivos y aviso al móvil; las principales salen como pestañas y en la portada. **Asistente de actas** (como en CCOO): al crear un acta, una foto de las notas, un PDF o un Word y la IA gratuita de Google rellena el acta para revisarla (necesita el secreto `GEMINI_API_KEY` en Supabase).
- **v12**: el asistente de actas **tapa lo importante antes de enviar** a Google: en el texto, nombres (que vuelven al recibir el borrador), DNI, teléfonos, emails, cuentas y matrículas; en fotos y PDF escaneados, se tapa con el dedo. Antes de enviar se ve exactamente lo que sale.
- **v13**: «Pedir un cambio a Claude» en el panel (como en CCOO): el padre escribe lo que quiere cambiar, con fotos o vídeos, y lo habla con Claude en un chat; Claude lo prepara, Lorena lo revisa en su app y el padre ve las capturas y decide «Publicar» o «Descartar». Avisos al móvil solo para quien usa el panel.
- **v14**: portada nueva (la pidió el padre): camión de lona cargado por una carretilla, las CC y la gasolinera, fundida con el fondo azul; en el móvil, solo la carretilla y el camión, más grandes. Además, el timbre de las peticiones avisa en su propio buzón (sesión «Timbres Comité»).
- **v15**: las fotos y los PDF de avisos, anuncios y publicaciones se abren dentro de la web, encima de la página y con «Cerrar», sin descargarlos (lo pidió el padre en el panel, petición n.º 5). Los Word y Excel siguen abriéndose aparte.
- **v16**: anuncios y avisos largos salen recogidos con «Leer más» (petición n.º 4 del padre). Calendario de reuniones con colores: reuniones en verde, festivos de España en rojo y festivos de Cataluña con la senyera, con leyenda (petición n.º 3; al tocar un festivo sale su nombre; festivos de 2026, falta añadir 2027 cuando salga el oficial).
- **v17**: calendario con botón «Mes / Año entero» (12 meses en pequeño; al tocar un mes se abre). Festivos laborales oficiales de Cataluña de 2026 y 2027 sacados del BOE (BOE-A-2025-21667 y BOE-A-2026-21254); los de España con la bandera española. Reuniones con la empresa en azul y las del comité en verde (petición n.º 6 del padre). También: panel del padre más fácil (lo pidió Lorena): sus peticiones en dos bloques, «Lo tuyo» (Te toca a ti / Esperando) arriba y «Confirmado por Lorena» debajo; preguntas de Claude con botones y «Otra cosa»; «Que lo siga Lorena», «Quitar de mi lista» y «No me gusta, quitarlo»; menos texto, buscador, negritas y fotos grandes en el chat. En la portada, el nombre «Comité de empresa · Calsina Carré» se ve mejor.
- **v19**: petición n.º 7 del padre: el nombre «CALSINA CARRÉ» en blanco y negrita en la lona del camión y en la carretilla de la portada (PC y móvil), sin flecha ni lema.
- **v18**: en lo que pide el padre, el botón «Sí, publicar» pasa a «Me gusta, adelante» (lo pidió Lorena: él pensaba que se publicaba al momento). Encima: «Si te gusta, pulsa «Me gusta, adelante». Lorena lo sube a la web.»; después: «Hecho: en unos minutos lo verás en la web» y, si tarda, «Está tardando. Lorena ya lo sabe». Igual que CCOO v138.
- **v7**: parte legal (aviso legal, privacidad completa, cookies, aviso informativo y botón para borrar los datos del móvil), borrado automático del buzón a los 12 meses, verificación en dos pasos y contraseñas más seguras en el panel, Inicio del panel con bloque azul.
- **v6**: se quitan los iconos de lo que tiene la empresa (portada, cartel e imagen al compartir); fotos de los miembros (desde el panel, solo con su permiso; se recortan y reducen en el móvil antes de subirlas) y apartados vacíos con icono y explicación.
- **v5**: cartel A4 con QR y la imagen al compartir por WhatsApp con el estilo nuevo.
- **v4**: gasolinera de la empresa junto al camión en la portada; fila de iconos con lo que tiene la empresa (transporte, almacén, carga y descarga, distribución, gasolinera) en el bloque azul; pie de página completo (logo, enlaces y aviso legal) y cabecera azul con icono en cada apartado; en PC, el calendario con las próximas reuniones al lado.
- **v3**: portada nueva más profesional (bloque azul con la marca, accesos rápidos, columna con lo urgente y la próxima reunión); «Accesos» del panel pasa a «Ajustes»; el nombre ya no se repite en la ventana de la app.
- **v2**: avisos al móvil (notificaciones), visitas y estadísticas en el panel, guía del panel.
- **v1**: primera versión: web con los 6 apartados, consultas, documentos, buscador, panel como el de CCOO, papelera, cartel con QR, marca del comité (kit HD).
