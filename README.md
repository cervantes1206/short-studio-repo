# Shorts Studio

App con backend propio para crear guiones de YouTube Shorts con ayuda de IA, revisarlos, validarlos manualmente y — de forma opcional — publicarlos directamente en tu propio canal de YouTube. Es la base de un pipeline más grande (voz, imágenes y ensamblado de video con IA) que se irá construyendo por fases.

No es un bot de publicación automática. Cada video pasa por un checklist que marcas tú mismo y una confirmación explícita antes de subirse.

## Qué hace

1. **Generar** — describes el tema, tono, duración y audiencia; el backend le pide a Claude (Anthropic) que genere gancho, guion por bloques, opciones de título, descripción, hashtags y texto de miniatura.
2. **Revisar** — todos los campos quedan editables. El contenido generado es un punto de partida, no una versión final.
3. **Validar** — un checklist manual (guion revisado, sin derechos de autor, sin clickbait, cumple normas de YouTube) más un interruptor para declarar contenido sintético/alterado por IA.
4. **Exportar / Publicar** — copia los campos para subirlos tú mismo en YouTube Studio, o conecta tu canal y publica directamente desde la interfaz, con visibilidad privada por defecto y confirmación antes de cada subida.

Los proyectos se guardan en una base de datos propia (no en el navegador) para que puedas retomarlos desde cualquier sesión.

## Uso

Esta app ya **requiere el backend** (carpeta `server/`) — la generación con IA ya no corre en el navegador ni guarda ninguna clave ahí. Ver "Configurar el backend" abajo.

```bash
cd server
npm install
cp ../.env.example ../.env   # y pega tu ANTHROPIC_API_KEY real
npm start
# abre http://localhost:3001
```

El servidor sirve tanto la API (`/api/projects`) como el frontend estático (`index.html`, `manifest.json`, `sw.js`, `icons/`) — no hace falta levantar nada más aparte. Solo la publicación a YouTube necesita que esté servido por HTTP/HTTPS por el requisito de "Authorized JavaScript origin" de Google (ver abajo).

> Antes esta app era un solo archivo estático sin backend. Si desplegaste una versión anterior en GitHub Pages, **ya no funcionará la generación de guiones ahí** — GitHub Pages solo sirve archivos estáticos y no puede correr `server/`. Necesitas un hosting que ejecute Node.js (Render, Railway, Fly.io, un VPS propio, etc.) para desplegar la versión completa.

## Configurar el backend

1. `cd server && npm install`.
2. Copia `.env.example` a `.env` en la raíz del proyecto y pega tu clave real de Anthropic (`console.anthropic.com/settings/keys`) en `ANTHROPIC_API_KEY`. Esta clave **vive solo en el servidor** — nunca se envía al navegador.
3. `npm start` — arranca en el puerto de `PORT` (por defecto 3001).
4. Los proyectos se guardan en `server/shorts-studio.db` (SQLite), creada automáticamente en el primer arranque.

## Conectar tu canal de YouTube (opcional)

La publicación directa usa OAuth de Google desde el navegador — tus credenciales nunca pasan por ningún servidor intermedio. Necesitas tu propio proyecto de Google Cloud:

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita la **YouTube Data API v3** (menú "APIs y servicios" → "Biblioteca").
3. Crea una credencial OAuth 2.0 de tipo **Aplicación web**.
4. En **Authorized JavaScript origins**, agrega el origen exacto donde sirvas este archivo (por ejemplo `https://tuusuario.github.io` si usas GitHub Pages, o `http://localhost:8080` en local). La interfaz te muestra el origen exacto que necesita en el panel "Canales de YouTube".
5. Pega el Client ID en ese panel dentro de la app y autoriza tu canal.

**Limitaciones que impone Google, no esta herramienta:**
- Mientras tu proyecto esté en modo "Testing" (sin verificación de Google), solo puedes subir videos como **privados**, y hasta 100 cuentas de prueba pueden autorizarlo. Para uso personal es suficiente.
- Los tokens de acceso expiran cada hora; la app te pedirá reautorizar antes de publicar si el token venció.
- Publicar contenido público de forma permanente requiere pasar la verificación OAuth de Google, un proceso que ellos gestionan directamente.

## Estructura

```
shorts-studio/
├── index.html          # frontend: HTML, CSS y JS en un solo archivo
├── manifest.json       # metadata de la PWA (nombre, iconos, colores)
├── sw.js               # service worker: cachea el shell de la app para uso offline
├── icons/               # iconos de la app (192, 512, 180 apple-touch, 32 favicon)
├── .env.example         # plantilla de variables de entorno (ANTHROPIC_API_KEY, PORT)
├── server/
│   ├── index.js         # servidor Express: sirve la API y el frontend estático
│   ├── db.js             # conexión SQLite + creación de tablas (projects, beats, jobs)
│   ├── routes/projects.js   # endpoints /api/projects (crear, listar, ver, editar)
│   ├── providers/llm.js  # llamada a Claude (Anthropic), movida aquí desde el navegador
│   └── director/prompt.js  # el prompt que define cómo Claude planea cada guion
└── README.md
```

Las fuentes se cargan desde Google Fonts y la autenticación de YouTube desde Google Identity Services (`accounts.google.com/gsi/client`), ambas por CDN — eso sigue corriendo en el navegador. Solo la generación con IA se mudó al backend.

## Instalar como app (PWA)

La interfaz es una PWA instalable: en Chrome/Edge (Android o desktop) aparece un ícono de instalación en la barra de direcciones o en el menú ("Instalar app" / "Agregar a pantalla de inicio"); en Safari iOS es Compartir → "Agregar a pantalla de inicio".

Esto **requiere que la app esté servida por HTTP/HTTPS** (no funciona abriendo el archivo con `file://`), porque el service worker que la hace instalable y con soporte offline solo se registra en esos contextos. Con `npm start` (ver "Uso" arriba) ya queda servida en `http://localhost:3001`.

## Desplegar en producción

Como la app ahora tiene backend (Node/Express + SQLite), **GitHub Pages ya no sirve** para desplegarla completa — solo hostea archivos estáticos y no puede correr `server/`. Necesitas un hosting que ejecute Node.js, por ejemplo Render, Railway, Fly.io o un VPS propio: sube el repo, configura `ANTHROPIC_API_KEY` como variable de entorno del servicio (no como archivo `.env` versionado), y arranca con `npm start` dentro de `server/`. Usa la URL pública que te den como "Authorized JavaScript origin" en el paso anterior de YouTube.

## Licencia

MIT — úsalo, modifícalo y adáptalo libremente.
