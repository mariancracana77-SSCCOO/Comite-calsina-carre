# Web del Comité de Empresa Calsina Carré

Contexto para Claude Code. Léelo antes de tocar nada.

## Qué es
Web/app (PWA) gratuita y solo informativa del **comité de empresa** de Calsina Carré para toda la plantilla. **No es la web del sindicato**: la de la Sección Sindical CCOO es otro repositorio (`SSCCOO`, otro Supabase). Aquí nada de logos, colores ni textos de CCOO; el comité representa a trabajadores de cualquier sindicato (campo opcional `sindicato` en miembros).

La gestiona desde el panel el padre de Lorena (usuario GitHub `mariancracana77-SSCCOO`). Lorena es quien desarrolla y habla con Claude. El panel copia a propósito la **estructura del panel de CCOO** (el padre está acostumbrado a él): no cambiarla sin que lo pidan.

- Web: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/ (GitHub Pages desde `main`, raíz)
- Panel: `admin.html` (email + contraseña de Supabase)
- Versión actual: **1**

## Reglas (las mismas que en CCOO)
- No publicar en `main` sin que Lorena lo confirme. Trabajar en la rama indicada.
- Responder siempre en **español**, claro y sin tecnicismos.
- **Sin emojis** en la interfaz (iconos SVG de `comun.js`, función `icono()`).
- **Todo gratis**. **Sin datos personales** de trabajadores; teléfono/email de miembros solo con su permiso.
- **Nunca pedir ni aceptar claves/tokens en el chat**.
- El padre debe poder hacerlo todo **desde el panel, sin tocar código**.
- Móvil (320–412 px) y PC, letra muy grande y modo oscuro deben seguir funcionando.

## Marca
Kit visual HD del comité (CC metálico + camión + personas). Paleta: `#0B1E3C` azul noche, `#0E5FAE` azul, `#00C6FF` cian, `#E6EEF7` hielo, blanco. Letras: Montserrat (títulos) e Inter (texto), alojadas en `fuentes/` (`fuentes.css`). Imágenes en `img/`: `icon-192/512.png` (esquinas transparentes), `icon-maskable-512.png` y `apple-touch-icon.png` (a sangre), `favicon-32/64.png` (solo el CC), `cabecera-900/1600.webp` (banner de la portada y del cartel), `og.png`.

## Archivos
- `index.html` + `app.js`: web pública. Vistas `#actualidad` (portada), `#avisos`, `#reuniones`, `#actas` (con segmento «Documentos útiles», `#documentos`), `#buzon`, `#nosotros`, `#buscar`, `#privacidad`. Enlaces directos `#aviso-N`, `#noticia-N`, `#reunion-N`, `#acta-N`, `#consulta-N`, `#documento-N`. localStorage (todo con try/catch en `TEMA.lee/guarda`): `comite-tema`, `comite-letra`, `comite-avisos-vistos`, `comite-ultima-visita`, `comite-votos`, `comite-copia` (copia sin conexión), `comite-no-instalar`.
- `render.js`: tarjetas (`R.aviso`, `R.noticia`, `R.reunion`, `R.acta`, `R.documento`, `R.consulta`, `R.pregunta`, `R.miembro`) que usan la web **y la vista previa del panel**. Cambiar aquí para que las dos coincidan.
- `comun.js`: conexión Supabase, `esc`, `urlSegura`, `textoHTML` (párrafos, `- ` listas, `**negrita**`), fechas, adjuntos, iconos, tema/letra, `.ics`, compartir, aviso de versión nueva.
- `admin.html` + `admin.js` + `admin.css`: panel. `SECCIONES` define campos de cada tabla (tipos: texto, largo, fecha, hora, fechahora, si, opcion, numero, tel, email, url, archivos, nota). `MENU`/`BARRA`: menú lateral (PC) y barra de abajo (móvil). Páginas especiales: inicio, buzon, textos, papelera, cartel, accesos.
- `cartel.html` + `cartel.js`: cartel A4 con QR (`lib/qr.js`, MIT).
- `sw.js`: caché para instalar y usar sin conexión (los datos de Supabase siempre van a la red).
- `pruebas/`: `mock-supabase.js` (datos de prueba en memoria; `localStorage prueba-sesion = 1` entra al panel) y `humo.cjs`.

## Al publicar una versión nueva
Cambiar el número en: `?v=N` de los HTML, `VERSION_WEB` en `comun.js` y `VERSION` en `sw.js`. Añadir línea en «Versiones» del README. Pasar `pruebas/humo.cjs` antes.

## Seguridad
- CSP en los HTML: `script-src 'self'`. Prohibido `<script>` en línea, `onclick=""` y `eval`. Delegación de eventos.
- Siempre `esc()` al meter texto en HTML; enlaces con `urlSegura()`.
- Las consultas de supabase-js no se envían si no se esperan: usar `await` o `.then()`.

## Supabase
- Proyecto `ytxpubqyhnohhugpukdm` (`comite-calsina-carre`, eu-west-3). Clave publicable en `comun.js`.
- Tablas: `admins`, `actualidad` (publicado), `avisos` (urgente, publicar_en), `reuniones`, `actas`, `preguntas` (orden), `miembros` (orden), `encuestas` (opciones una por línea, publicada, cierra), `encuesta_votos` (solo por RPC), `documentos` (categoria, orden, enlace), `buzon` (solo admin lee), `paginas` (bienvenida, nosotros, privacidad), `papelera`.
- RLS en todas: lectura pública de lo publicado; escritura solo `is_admin()`. Trigger `solo_admins_registran` en `auth.users`.
- RPC públicas: `enviar_buzon` (anónimo, rechaza emails/teléfonos, tope 40/día), `votar_encuesta` (tope 3000). Admin: `recuperar_borrado`. Trigger `a_la_papelera` guarda lo borrado 90 días.
- Storage: bucket público `documentos` (20 MB); subir/borrar solo admin.
- En migraciones, la palabra `delete` puede pedir confirmación: montarla con `'del' || 'ete'`. Probar sin dejar rastro con un `do $$ … raise exception 'RESULTADO …' $$`.

## Pendiente / ideas
- Configurar en Supabase la «Site URL» del panel (lo hace Lorena; ver README).
- Avisos al móvil (notificaciones push) como en CCOO: necesita claves VAPID y una función en Supabase.
- Estadísticas de visitas en el Inicio del panel.
- Guía del panel para el padre.
