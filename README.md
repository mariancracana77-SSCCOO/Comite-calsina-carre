# Comité de Empresa Calsina Carré

Web gratuita que **se instala como app** (PWA) para informar a toda la plantilla de Calsina Carré desde el **comité de empresa**. No es la web del sindicato: el comité representa a todos los trabajadores, sean del sindicato que sean. (La web de la Sección Sindical CCOO está en el repositorio `SSCCOO`).

- Web: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/
- Panel para publicar: https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/admin.html

## Qué tiene la web

| Apartado | Qué hay |
|---|---|
| **Actualidad** (portada) | Cabecera con el logo, aviso urgente, próxima reunión con los días que faltan, «novedades desde tu última visita», consultas abiertas, accesos rápidos y noticias |
| **Avisos** | Comunicados cortos; los urgentes en rojo; contador de avisos sin leer en la pestaña |
| **Calendario de reuniones** | Calendario del mes, próximas reuniones (con botón «Añadir a mi calendario») y reuniones pasadas |
| **Actas** | Resumen y acuerdos con buscador y filtro por año; y **Documentos útiles** (convenio, calendario laboral, tablas salariales…) |
| **Sugerencias y preguntas** | Buzón **anónimo** y preguntas frecuentes |
| **Nosotros** | Qué es el comité y quién lo forma (con teléfono o email solo si la persona quiere) |

Además: lupa para buscar en toda la web, botón fijo «Contactar con el comité», compartir por WhatsApp, letra más grande (botón «Aa»), modo oscuro, funciona sin conexión con lo último guardado, y página de privacidad.

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
- **Accesos**: quién puede entrar en el panel.

### Entrar por primera vez
1. Abre el panel, despliega «¿Problemas para entrar?» y pulsa **«Primera vez: crear la cuenta»** (con el email autorizado y la contraseña que quieras).
2. Llega un email: pulsa el botón para confirmar. Después ya se entra con email y contraseña.

Emails autorizados al principio: los mismos dos administradores del panel de CCOO. Se cambian desde **Accesos**.

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

- **v1**: primera versión: web con los 6 apartados, consultas, documentos, buscador, panel como el de CCOO, papelera, cartel con QR, marca del comité (kit HD).
