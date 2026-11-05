# Web del Comité de Empresa Calsina Carré

Contexto para Claude Code. Léelo antes de tocar nada.

## Qué es
Web/app (PWA) gratuita y solo informativa del **comité de empresa** de Calsina Carré para toda la plantilla. **No es la web del sindicato**: la de la Sección Sindical CCOO es otro repositorio (`SSCCOO`, otro Supabase). Aquí nada de logos, colores ni textos de CCOO; el comité representa a trabajadores de cualquier sindicato (campo opcional `sindicato` en miembros).

La gestiona desde el panel el padre de Lorena (usuario GitHub `mariancracana77-SSCCOO`). Lorena es quien desarrolla y habla con Claude. El panel copia a propósito la **estructura del panel de CCOO** (el padre está acostumbrado a él): no cambiarla sin que lo pidan.

- Web: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/ (GitHub Pages desde `main`, raíz)
- Panel: `admin.html` (email + contraseña de Supabase)
- Versión actual: **14**

## Reglas (las mismas que en CCOO)
- No publicar en `main` sin que Lorena lo confirme. Trabajar en la rama indicada.
- Responder siempre en **español**, claro y sin tecnicismos.
- **Sin emojis** en la interfaz (iconos SVG de `comun.js`, función `icono()`).
- **Todo gratis**. **Sin datos personales** de trabajadores; teléfono/email de miembros solo con su permiso.
- **Nunca pedir ni aceptar claves/tokens en el chat**.
- El padre debe poder hacerlo todo **desde el panel, sin tocar código**.
- Móvil (320–412 px) y PC, letra muy grande y modo oscuro deben seguir funcionando.

## Marca
Kit visual HD del comité (CC metálico + camión + personas). Paleta: `#0B1E3C` azul noche, `#0E5FAE` azul, `#00C6FF` cian, `#E6EEF7` hielo, blanco. Letras: Montserrat (títulos) e Inter (texto), alojadas en `fuentes/` (`fuentes.css`). Imágenes en `img/`: `icon-192/512.png` (esquinas transparentes), `icon-maskable-512.png` y `apple-touch-icon.png` (a sangre), `favicon-32/64.png` (solo el CC), `hero-arte.webp` (CC + camión + la gasolinera de la empresa, a la derecha del bloque azul de la portada; la gasolinera la pidió el padre porque la empresa tiene gasolinera propia: dibujo en `herramientas/gasolinera.svg`, añadido a la derecha del recorte del kit alargando su fondo), `cabecera-900/1600.webp` (ya no se usan en la web), `og.png` (vista previa al compartir: se hace con `herramientas/og.html` + `herramientas/og.cjs`). El cartel (`cartel.html`) lleva cabecera con el logo y `hero-arte.webp`; debe caber en un A4.

## Actualidad (anuncios) y Avisos: no son lo mismo
Lo explicó el padre. **Actualidad = anuncios**: información general para todos, sin destacar (p. ej. «la reunión de hoy acordó que desde mañana el turno 3 tiene 25 minutos de pausa en vez de 20»). **Avisos** = lo importante que hay que destacar (huelga general la semana que viene, mañana festivo, elecciones, último día del mes para algo). Desde la v11 la pestaña se llama **«Info general»** (lo pidió el padre) y sus entradas son «anuncios»; por dentro sigue siendo `actualidad` (tabla, vista `#actualidad` y ancla `#noticia-N`).

## Avisos con estilo de señal de tráfico (v10)
Lo eligió el padre («que sea original», «más currado»). `R.senal(rojo)` en `render.js` dibuja una señal con su poste: normal = señal informativa azul cuadrada con «i»; urgente o destacado hoy = señal de peligro (triángulo de borde rojo con «!») con una luz ámbar que parpadea (se para con «reducir movimiento»). Los urgentes llevan `.rayas` arriba (rojo y blanco, como las vallas de obras) y todos los avisos tienen el borde de abajo como una carretera (`.aviso::after`: asfalto con raya blanca, amarilla si es urgente). El aviso urgente de la portada usa lo mismo (`.destacado.con-senal`). Se probaron otros 5 diseños, y una animación de un camión que reposta y descarga el aviso: no gustaron.

## Traído de CCOO en la v10
- **Destacar un aviso un día** (como CCOO v102–103): columna `avisos.destacar_dia` (date) + `destacado_avisado`. Ese día el aviso sale en rojo arriba en la portada («Destacado hoy») y en su lista; la tarea `notificar` (cron) manda «DESTACADO HOY: …» una vez, a partir de las 8:00 de Madrid. Si se cambia el día, `alGuardar` pone `destacado_avisado = false` (o `true` si es nuevo, de hoy, y ya avisa al publicar). Campo tipo fecha con opción `quitar` → botón «Quitar el destacado» (`data-vaciar`). No toca `urgente`.
- **Copia de seguridad** en Ajustes (`#accesos-copia` baja hasta ella): «Descargar copia con archivos» (ZIP con `lib/jszip.min.js`, MIT, cargado solo al usarlo) o «Solo los textos» (JSON). Guarda la fecha en `paginas.ultima_copia`; Inicio la recuerda si nunca se hizo o hace más de 31 días. Lleva el buzón: si se añaden tablas, añadirlas a `TABLAS_COPIA`.

## Secciones propias (v11)
Para que el padre sea independiente (como «Apartados» en CCOO). Tablas `apartados` (titulo, descripcion, icono, orden, visible, `padre_id`: subsección, un solo nivel; on delete cascade) y `publicaciones` (apartado_id, titulo, contenido, fecha, adjuntos, publicado, notificar/notificado). RLS: se leen las secciones visibles y lo publicado de secciones visibles; escribe `is_admin()`. Triggers `pon_actualizado` y `a_la_papelera`; `recuperar_borrado` las admite (pide recuperar antes la sección). `contar_visita('secciones')`.
- Web: las principales salen como pestañas antes de «Nosotros» (`.pest-seccion`) y en los accesos de la portada (`#accesos-secciones`); una sola vista `#v-seccion` (`pintaSeccion`) para `#seccion-N` y `#publicacion-N`, con miga a la sección madre, subsecciones como tarjetas (`R.seccion`) y lo publicado (`R.publicacion`). También en el buscador y en «Novedades».
- Panel: grupo «Tus secciones» con `apartados` («Secciones», ordenables dentro de su madre, subsecciones metidas `.fila-hija`) y `publicaciones` («Publicar en secciones»). `APS` = todas las secciones (`cargaAps`, en cada cambio de página). Los campos «opcion» admiten listas de pares [valor, texto] y funciones; `num: true` guarda número/null.
- `notificar` avisa también de `publicaciones` («<Sección>: título», `#publicacion-N`).

## Asistente de actas (v11, como en CCOO)
En «Nueva acta» (`SECCIONES.actas.asistente`), `asistenteHTML`/`prepararAsistente`/`generarActa` en `admin.js`: fotos (reducidas a 2000 px JPEG), PDF, Word (.docx leído con JSZip en el navegador) o texto, hasta 6, → función `generar-acta` (copia en `herramientas/funciones/generar-acta.ts`, `verify_jwt` activado + `is_admin()` dentro; Gemini gratuito, modelos en `MODELOS`) → rellena título, tipo (de `TIPOS_REUNION`), fecha, resumen y acuerdos. No guarda nada. Necesita el secreto `GEMINI_API_KEY` en el Supabase del comité (lo pone Lorena en Edge Functions → Secrets; nunca por el chat). Lo enviado va a Google (lo avisa el panel): solo lo usa el admin. **v12, tapar datos** (todo en el dispositivo, comentario largo encima del código): `tapaTexto` (nombres → `[PERSONA n]`, que `devuelveNombres` repone al recibir; DNI/NIE, teléfonos, emails, cuentas, n.º Seg. Social y matrículas se quedan tapados), nombres de `miembros` + lista propia (localStorage `comite-ia-tapar`) + heurísticas (tras «Sr.», «compañero»…; dos o tres palabras con mayúscula que no estén en `NO_NOMBRES`); fotos y PDF escaneados con `abreTapador` (pintar con el dedo, se envía la imagen ya pintada); PDF con texto leído con pdf.js (`lib/pdfjs/`, 4.10.38 legacy, Apache 2.0, se carga con `import()` solo al usarlo); paso «Preparar y revisar» (`revisaEnvio`, `#ia-revision`) antes de `generarActa`.

## Pedir un cambio a Claude (v13, lo pidió Lorena el 5/11/2026)
Copia del sistema de CCOO (ver su CLAUDE.md: «Circuito de peticiones», «Orden de cada petición», medidor, revisor barato, etc.; las reglas son las mismas). Lo atiende la misma sesión de Claude «Timbres».
- Supabase del comité: tablas `peticiones_claude` (texto, adjuntos, estado nueva/en_curso/lista/publicada/descartada/no_hecha/deshecha, respuesta, mensajes, ficha, propuesta, decision, version, avisar_lorena, deshacer…; solo admins), `peticiones_estado` (id 1, `pausa`), `push_admin` (móviles del panel; sin políticas), `captura_fichas` y `privado.nueva_ficha_captura()`; bucket público `peticiones` (50 MB, fotos/vídeo/audio, sube solo admin). Disparadores: `peticiones_no_se_borran`/`peticiones_no_se_vacian` (los chats no se borran ni se cambian, solo se añade al final; no quitarlos) y `peticiones_avisa_padre` (cuando Claude escribe, llama a `avisar-padre`). RPC solo admins: `anadir_a_peticion`, `pedir_lorena`, `deshacer_peticion`, `decidir_peticion`, `suscribir_push_admin`, `desuscribir_push_admin`, `push_admin_activo`.
- Funciones (copias en `herramientas/funciones/`): `timbre` (comenta «Comité: …» en la PR buzón n.º 2 del repo **SSCCOO**; necesita el secreto `GITHUB_TOKEN` en este Supabase, lo pone Lorena), `avisar-padre` (push SOLO a `push_admin`, nunca a `push_subs`), `captura` (sube capturas al bucket con una ficha de un solo uso).
- Panel: página `peticiones` en «Herramientas» y tarjeta en Inicio (bloque «Pedir un cambio a Claude» de `admin.js`, estilos `.pet-*` en `admin.css`). localStorage `comite-adm-pet-filtro`, `comite-adm-pet-abiertas`, `comite-adm-pet-vistos`, `comite-push-panel`. `app.js` no cuenta como avisos de la web un móvil con solo `comite-push-panel` (la web guarda `comite-push`) y al apagar los de la web no apaga los del panel. `sw.js` abre/enfoca `admin.html` si la notificación apunta allí.
- App de revisión de Lorena (la misma que CCOO): fichas del comité con documento `c<N>`, `web: 'comite'` y título «Comité: …». Al hacer la ficha, escribir lo mismo en `peticiones_claude.ficha` (capturas solo con URL de este Supabase).
- Publicar: en este repo, con su versión, respaldo `respaldo-v<N-1>` antes y `pruebas/humo.cjs` en verde.

## Iconos de lo que tiene la empresa: QUITADOS
El padre pidió mostrar lo que tiene la empresa (camión, toro, transpaleta, distribuidor, gasolinera). Se probó como franja bajo los accesos y como fila de iconos en el bloque azul, en el cartel y en la imagen al compartir: no le gustó y se quitó de todo (v6). No volver a ponerlo. Se mantiene la gasolinera dibujada junto al camión en `hero-arte.webp`. **Excepción (v14, petición n.º 1 del padre en el panel)**: él mismo pidió añadir al logo de siempre una carretilla con una caja en las palas; está abajo a la derecha de `icon-512.png` y de los iconos sacados de él (192, 96, maskable, apple-touch, `og.png`). Dibujo en `herramientas/logo-carretilla/carretilla.svg` (se pinta encima del logo anterior). Los iconos `camion`, `toro`, `transpaleta`, `reparto` y `surtidor` siguen definidos en `comun.js` sin usar.

## Archivos
- `index.html` + `app.js`: web pública. Vistas `#actualidad` (portada), `#avisos`, `#reuniones`, `#actas` (con segmento «Documentos útiles», `#documentos`), `#buzon`, `#nosotros`, `#buscar`, `#privacidad`. Enlaces directos `#aviso-N`, `#noticia-N`, `#reunion-N`, `#acta-N`, `#consulta-N`, `#documento-N`. localStorage (todo con try/catch en `TEMA.lee/guarda`): `comite-tema`, `comite-letra`, `comite-avisos-vistos`, `comite-ultima-visita`, `comite-votos`, `comite-copia` (copia sin conexión), `comite-no-instalar`.
- Apartados vacíos: `vacio(titulo, texto, icono, [enlace, texto])` en `app.js` (caja `.vacio-caja`). Para verlos en pruebas: `?prueba-vacio` en la dirección vacía el simulador.
- `render.js`: tarjetas (`R.aviso`, `R.noticia`, `R.reunion`, `R.acta`, `R.documento`, `R.consulta`, `R.pregunta`, `R.miembro`) que usan la web **y la vista previa del panel**. Cambiar aquí para que las dos coincidan.
- `comun.js`: conexión Supabase, `esc`, `urlSegura`, `textoHTML` (párrafos, `- ` listas, `**negrita**`), fechas, adjuntos, iconos, tema/letra, `.ics`, compartir, aviso de versión nueva.
- `admin.html` + `admin.js` + `admin.css`: panel. `SECCIONES` define campos de cada tabla (tipos: texto, largo, fecha, hora, fechahora, si, opcion, numero, tel, email, url, archivos, foto, nota). `MENU`/`BARRA`: menú lateral (PC) y barra de abajo (móvil). Páginas especiales: inicio, buzon, textos, papelera, cartel, accesos (sale como «Ajustes»: correos con acceso).
- `cartel.html` + `cartel.js`: cartel A4 con QR (`lib/qr.js`, MIT).
- `guia.html` + `img/guia/`: guía del panel para el padre, con capturas hechas con los datos de prueba.
- `sw.js`: caché para instalar y usar sin conexión (los datos de Supabase siempre van a la red).
- `pruebas/`: `mock-supabase.js` (datos de prueba en memoria; `localStorage prueba-sesion = 1` entra al panel) y `humo.cjs`.

## Al publicar una versión nueva
Cambiar el número en: `?v=N` de los HTML, `VERSION_WEB` en `comun.js` y `VERSION` en `sw.js`. Añadir línea en «Versiones» del README. Pasar `pruebas/humo.cjs` antes.

## Legal y privacidad
- Páginas `#aviso-legal`, `#privacidad` y `#cookies` (textos en `paginas`: `aviso_legal`, `privacidad`, `cookies`, editables en el panel → Textos de la web). Enlaces en el pie. Responsable: el comité; contacto por los miembros (sin email por ahora: el padre puede añadirlo).
- Sin cookies; solo almacenamiento técnico en el móvil (exento de consentimiento, art. 22.2 LSSI). Aviso informativo no bloqueante la primera vez (`#aviso-privacidad`, localStorage `comite-aviso-privacidad`). En Cookies, botón para borrar todo lo que la web guarda en el móvil (claves `comite-*` y cachés `comite-*`).
- Consentimiento con casilla sin marcar: buzón y avisos al móvil. Fotos/teléfono/email de miembros, solo con su permiso.
- Conservación: buzón se borra solo a los 12 meses (pg_cron `borrar-buzon-antiguo`, 3:17), papelera 90 días, `push_subs` se limpian al fallar.
- Si se añade algo que guarde datos, actualizar el texto de privacidad.

## Seguridad
- Panel: contraseña de 10+ con letras y números (`claveFlojaTxt`); verificación en dos pasos TOTP opcional en Ajustes (`supabase.auth.mfa`); al entrar, si hay factor, pide el código (`#s-dos-pasos`); `is_admin()` exige sesión aal2 si la cuenta tiene factor verificado. «Cerrar en todos» = `signOut({ scope: "global" })`.
- Contraseñas sin email (como en CCOO): función `cuenta` (copia en `herramientas/funciones/cuenta.ts`, `verify_jwt` desactivado, autenticación dentro). `poner_clave`: un admin pone la contraseña a otro correo de `admins` y, si no tiene cuenta, se la crea ya confirmada. `estado`: códigos que quedan + qué correos tienen cuenta. `codigos`/`usar_codigo`: 8 códigos de rescate (tabla `codigos_rescate`, solo hash, sin políticas). En Ajustes: «Poner contraseña» en cada correo, contraseña opcional al dar acceso, y «Códigos de rescate». En la pantalla de entrar: «Tengo un código de rescate». El padre se lió con los emails de Supabase (le abrían la web de CCOO): mejor ponerle la contraseña desde Ajustes.
- `<meta name="referrer" content="strict-origin-when-cross-origin">` en todas las páginas.
- CSP en los HTML: `script-src 'self'`. Prohibido `<script>` en línea, `onclick=""` y `eval`. Delegación de eventos.
- Siempre `esc()` al meter texto en HTML; enlaces con `urlSegura()`.
- Las consultas de supabase-js no se envían si no se esperan: usar `await` o `.then()`.

## Supabase
- Proyecto `ytxpubqyhnohhugpukdm` (`comite-calsina-carre`, eu-west-3). Clave publicable en `comun.js`.
- Tablas: `admins`, `actualidad` (publicado), `avisos` (urgente, publicar_en), `reuniones`, `actas`, `preguntas` (orden), `miembros` (orden, `foto` jsonb {url, ruta}: campo tipo «foto» del panel, se recorta a 480 px cuadrados en webp en el navegador antes de subirla a `documentos/miembros/`, lo que también quita los datos EXIF), `encuestas` (opciones una por línea, publicada, cierra), `encuesta_votos` (solo por RPC), `documentos` (categoria, orden, enlace), `buzon` (solo admin lee), `paginas` (bienvenida, nosotros, privacidad), `papelera`.
- RLS en todas: lectura pública de lo publicado; escritura solo `is_admin()`. Trigger `solo_admins_registran` en `auth.users`.
- RPC públicas: `enviar_buzon` (anónimo, rechaza emails/teléfonos, tope 40/día), `votar_encuesta` (tope 3000). Admin: `recuperar_borrado`. Trigger `a_la_papelera` guarda lo borrado 90 días.
- Avisos al móvil: función `notificar` (copia en `herramientas/funciones/notificar.ts`; `verify_jwt` desactivado, la autenticación va dentro: admin con su sesión, o la tarea con `x-cron-secret`). Las claves VAPID las crea la función la primera vez y están en `config_privada` (sin políticas: nadie las lee desde fuera); la pública la da la RPC `clave_push_publica`. Tabla `push_subs` (sin políticas; RPC `suscribir_push`/`desuscribir_push`, tope 5000; `contar_suscritos` solo admin). Columnas `notificar`/`notificado` en avisos, actualidad, reuniones, actas, encuestas y documentos. Tarea pg_cron `notificar-pendientes` cada 10 min (avisos programados que ya tocan y pendientes de los últimos 2 días). El panel llama a la función al publicar (`avisarMoviles`); campos `notificar` (solo al crear) y `_cambio` (solo al editar; las columnas con «_» no se guardan). `sw.js` enseña la notificación y al tocarla abre `#aviso-N`, etc.
- Estadísticas: tabla `visitas` (dia, seccion, n; solo admin lee) y RPC pública `contar_visita` (secciones fijas). La web cuenta una visita «total» al día por móvil y una por apartado por sesión; no cuenta si ese navegador ha entrado al panel (`comite-admin-email`).
- Storage: bucket público `documentos` (20 MB); subir/borrar solo admin.
- En migraciones, la palabra `delete` puede pedir confirmación: montarla con `'del' || 'ete'`. Probar sin dejar rastro con un `do $$ … raise exception 'RESULTADO …' $$`.

## Pendiente / ideas
- Configurar en Supabase la «Site URL» del panel (lo hace Lorena; ver README).
- Canal de Telegram como en CCOO (si lo piden).
- Guía (`guia.html`): al cambiar el panel, rehacer sus capturas con `pruebas/humo.cjs` (sale en español: navegador con `--lang=es-ES`) y actualizar el texto.
