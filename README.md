# Comité Calsina Carré

Web del comité que **se puede instalar como app** en el móvil (Android e iPhone) y en el ordenador. Es una PWA (Progressive Web App): no hace falta Play Store ni App Store, y funciona también sin conexión.

Tiene cuatro secciones: **Inicio**, **Avisos**, **Agenda** y **Contacto**.

## Cómo cambiar el contenido

Todos los textos están en **`contenido.js`**: nombre, bienvenida, avisos, eventos y datos de contacto.
Se puede editar directamente desde la web de GitHub (abrir el archivo → icono del lápiz → «Commit changes»).

Después de cambiar algo, abre **`sw.js`** y sube el número de `VERSION` (`"v1"` → `"v2"`…) para que los móviles que ya tienen la app instalada descarguen la versión nueva.

## Cómo publicarla (gratis, con GitHub Pages)

1. En GitHub, ve a **Settings → Pages**.
2. En «Source» elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
3. En un par de minutos la web estará en
   `https://mariancracana77-ssccoo.github.io/Comite-calsina-carre/`
4. Comparte ese enlace con los socios.

## Cómo instalar la app

- **Android (Chrome):** abre el enlace y pulsa el botón **Instalar** que aparece arriba (o menú ⋮ → «Instalar aplicación»).
- **iPhone (Safari):** abre el enlace, pulsa **Compartir** y luego **«Añadir a pantalla de inicio»**.
- **Ordenador (Chrome/Edge):** icono de instalar en la barra de direcciones.

## Cambiar el icono

El icono actual es provisional (las letras «CC»). Para poner el logo del comité, sustituye estos archivos de la carpeta `icons/` por versiones con el logo y **del mismo tamaño**:

| Archivo | Tamaño |
|---|---|
| `icon.svg` (o bórralo y usa un PNG) | cualquiera |
| `icon-192.png` | 192 × 192 |
| `icon-512.png` | 512 × 512 |
| `icon-maskable-512.png` | 512 × 512, con el logo centrado y margen alrededor |
| `apple-touch-icon.png` | 180 × 180 |

Y sube la `VERSION` en `sw.js`.

## Archivos

- `index.html` — estructura de la página
- `contenido.js` — **los textos (lo que se edita normalmente)**
- `app.js` — funcionamiento
- `styles.css` — colores y diseño
- `manifest.webmanifest` — datos de la app (nombre, icono, colores)
- `sw.js` — permite instalarla y usarla sin conexión
