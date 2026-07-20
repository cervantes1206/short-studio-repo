# Shorts Studio

App con backend propio para crear guiones de YouTube Shorts con ayuda de IA, revisarlos, validarlos manualmente y — de forma opcional — publicarlos directamente en tu propio canal de YouTube. Es la base de un pipeline más grande (voz, imágenes y ensamblado de video con IA) que se irá construyendo por fases.

No es un bot de publicación automática. Cada video pasa por un checklist que marcas tú mismo y una confirmación explícita antes de subirse.

## Qué hace

1. **Generar** — describes el tema, tono, duración y audiencia; el backend le pide a un modelo de IA (vía la API gratuita de NVIDIA) que genere gancho, guion por bloques, opciones de título, descripción, hashtags y texto de miniatura.
2. **Revisar** — todos los campos quedan editables. El contenido generado es un punto de partida, no una versión final. Desde aquí también puedes generar, para cada bloque del guion: una imagen relacionada (gratis, vía Pollinations.ai), la narración con voz IA (ElevenLabs), y finalmente armar el short completo (imágenes + voz + subtítulos incrustados) con ffmpeg para verlo antes de publicarlo.
3. **Validar** — un checklist manual (guion revisado, sin derechos de autor, sin clickbait, cumple normas de YouTube) más un interruptor para declarar contenido sintético/alterado por IA.
4. **Exportar / Publicar** — copia los campos para subirlos tú mismo en YouTube Studio, o conecta tu canal y publica directamente desde la interfaz, con visibilidad privada por defecto y confirmación antes de cada subida.

Los proyectos se guardan en una base de datos propia (no en el navegador) para que puedas retomarlos desde cualquier sesión.

## Uso

Esta app ya **requiere el backend** (carpeta `server/`) — la generación con IA ya no corre en el navegador ni guarda ninguna clave ahí. Ver "Configurar el backend" abajo.

```bash
cd server
npm install
cp ../.env.example ../.env   # y pega tu NVIDIA_API_KEY real
npm start
# abre http://localhost:3001
```

El servidor sirve tanto la API (`/api/projects`) como el frontend estático (`index.html`, `manifest.json`, `sw.js`, `icons/`) — no hace falta levantar nada más aparte. Solo la publicación a YouTube necesita que esté servido por HTTP/HTTPS por el requisito de "Authorized JavaScript origin" de Google (ver abajo).

> Antes esta app era un solo archivo estático sin backend. Si desplegaste una versión anterior en GitHub Pages, **ya no funcionará la generación de guiones ahí** — GitHub Pages solo sirve archivos estáticos y no puede correr `server/`. Necesitas un hosting que ejecute Node.js (Render, Railway, Fly.io, un VPS propio, etc.) para desplegar la versión completa.

## Configurar el backend

1. `cd server && npm install`.
2. Copia `.env.example` a `.env` en la raíz del proyecto y pega tu clave real de NVIDIA. Esta clave **vive solo en el servidor** — nunca se envía al navegador.
3. `npm start` — arranca en el puerto de `PORT` (por defecto 3001).
4. Los proyectos se guardan en `server/shorts-studio.db` (SQLite), creada automáticamente en el primer arranque.

### Generación con IA vía NVIDIA (gratis)

La generación de guiones usa la [API gratuita de NVIDIA](https://build.nvidia.com) (NIM), compatible con el formato de OpenAI, sin necesidad de tarjeta de crédito:

1. Crea una cuenta gratuita en [build.nvidia.com](https://build.nvidia.com) (NVIDIA Developer Program).
2. Abre cualquier modelo del catálogo (por ejemplo, busca "deepseek") y haz clic en **Get API Key** — obtienes una key `nvapi-...` con ~1.000 créditos de prueba gratis (hasta 5.000 verificando una cuenta con correo empresarial) y un límite de 40 solicitudes/minuto.
3. Pega esa key en `NVIDIA_API_KEY` dentro de `.env`.
4. `NVIDIA_MODEL` controla qué modelo se usa (por defecto `deepseek-ai/deepseek-v4-pro`). El catálogo de NVIDIA renombra sus modelos de vez en cuando — si ves un error 400/404 al generar, entra a build.nvidia.com, abre el modelo que quieras usar y copia el valor exacto de `"model"` del snippet de código que te muestra ahí.

> Nota: los créditos gratuitos de NVIDIA son para desarrollo/pruebas, no para uso en producción con usuarios reales a gran escala (eso requiere licencia NVIDIA AI Enterprise). Para el uso personal de esta app, el tier gratuito alcanza sobra.

> Nota sobre velocidad: los modelos gratuitos corren en funciones serverless que "duermen" cuando no se usan. La primera generación después de un rato inactivo puede tardar bastante (se vieron casos de +30s) mientras la función arranca — el backend reintenta automáticamente esos fallos iniciales. Generaciones seguidas son mucho más rápidas.

### Generación de imágenes vía Pollinations.ai (gratis, sin cuenta)

Cada bloque del guion trae una nota de "qué mostrar en pantalla" — el botón **"Generar imágenes relacionadas"** (paso 02, Revisar) le pasa esa nota a [Pollinations.ai](https://pollinations.ai) para generar una imagen por bloque. No necesita clave de API ni cuenta.

- `POLLINATIONS_MODEL` en `.env` controla el modelo de imagen (por defecto `flux`). No hace falta tocarlo salvo que quieras probar otro (`turbo`, `stable-diffusion`, etc.).
- El servicio anónimo limita a **una petición cada 15 segundos aproximadamente** — generar las imágenes de un short de 4-6 bloques toma 1-2 minutos. El backend ya espacia las peticiones automáticamente, no hace falta hacer nada.
- Las imágenes gratuitas pueden traer una marca de agua pequeña — si eso te molesta para el resultado final, esta es la primera pieza candidata a cambiar por un proveedor de pago (ver `server/providers/image.js`, tiene la misma interfaz intercambiable que `llm.js`).
- Las imágenes se guardan en `server/storage/<id-del-proyecto>/` (no se suben al repo — están en `.gitignore`).

> Nota importante ya aprendida en este proyecto: los modelos de imagen que aparecen en el catálogo de build.nvidia.com (FLUX, Stable Diffusion, Qwen-Image) **no tienen versión gratuita alojada** — solo existen como contenedor Docker que corres tú mismo en tu propia GPU. Por eso esta app usa Pollinations para imágenes y NVIDIA solo para texto.

### Narración con voz IA vía ElevenLabs

El botón **"Generar narración (voz IA)"** (paso 02, Revisar) genera un audio por bloque a partir del texto de ese bloque, usando la [API de ElevenLabs](https://elevenlabs.io):

1. Crea una cuenta gratuita en [elevenlabs.io](https://elevenlabs.io) (el plan gratuito incluye un límite mensual de caracteres, suficiente para probar).
2. Copia tu API key desde el panel de tu cuenta y pégala en `ELEVENLABS_API_KEY` dentro de `.env`.
3. `ELEVENLABS_VOICE_ID` controla qué voz se usa (por defecto una voz "premade" de la cuenta). Puedes cambiarla por el ID de cualquier otra voz de tu biblioteca de ElevenLabs.
4. La duración real de cada audio (medida con `ffprobe`) se guarda junto al bloque — esa duración es la que luego define cuánto tiempo se muestra la imagen de ese bloque en el video final.

### Armar el video final vía ffmpeg

El botón **"Armar y ver el short"** (paso 02, Revisar) junta, para cada bloque, su imagen + su audio narrado + su texto como subtítulo incrustado, y concatena todos los bloques en un solo MP4 vertical (720x1280) que se puede previsualizar ahí mismo antes de pasar a Validar/Publicar. Requiere que **todos** los bloques ya tengan imagen y narración generadas.

- Necesitas `ffmpeg`/`ffprobe` con soporte para el filtro `drawtext` (subtítulos incrustados). El `ffmpeg` normal de Homebrew (`brew install ffmpeg`) **no trae ese soporte** — instala la variante completa:
  ```bash
  brew install ffmpeg-full
  ```
- `FFMPEG_PATH` y `FFPROBE_PATH` en `.env` deben apuntar a los binarios de `ffmpeg-full` (por ejemplo `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` y `.../ffprobe` en macOS con Homebrew Apple Silicon), porque `ffmpeg-full` es "keg-only" y no se agrega solo al PATH.
- El video final se guarda en `server/storage/<id-del-proyecto>/short.mp4` (tampoco se sube al repo).

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
├── .env.example         # plantilla de variables de entorno (NVIDIA_API_KEY, ELEVENLABS_API_KEY, FFMPEG_PATH, PORT...)
├── server/
│   ├── index.js         # servidor Express: sirve la API, el frontend y /storage
│   ├── db.js             # conexión SQLite + creación de tablas (projects, beats, jobs)
│   ├── storage.js        # guarda imágenes, audios y el video final en server/storage/<id>/
│   ├── routes/projects.js   # endpoints /api/projects (crear, listar, ver, editar, imágenes, voz, video)
│   ├── providers/llm.js  # llamada a la API gratuita de NVIDIA (NIM) para el guion
│   ├── providers/image.js  # llamada a Pollinations.ai para las imágenes por bloque
│   ├── providers/tts.js   # llamada a ElevenLabs para la narración con voz IA por bloque
│   ├── providers/assembly.js  # ensamblado ffmpeg: imagen + audio + subtítulo incrustado por bloque → MP4 final
│   └── director/prompt.js  # el prompt que define cómo la IA planea cada guion
└── README.md
```

Las fuentes se cargan desde Google Fonts y la autenticación de YouTube desde Google Identity Services (`accounts.google.com/gsi/client`), ambas por CDN — eso sigue corriendo en el navegador. Solo la generación con IA se mudó al backend.

## Instalar como app (PWA)

La interfaz es una PWA instalable: en Chrome/Edge (Android o desktop) aparece un ícono de instalación en la barra de direcciones o en el menú ("Instalar app" / "Agregar a pantalla de inicio"); en Safari iOS es Compartir → "Agregar a pantalla de inicio".

Esto **requiere que la app esté servida por HTTP/HTTPS** (no funciona abriendo el archivo con `file://`), porque el service worker que la hace instalable y con soporte offline solo se registra en esos contextos. Con `npm start` (ver "Uso" arriba) ya queda servida en `http://localhost:3001`.

## Desplegar en producción

Como la app ahora tiene backend (Node/Express + SQLite), **GitHub Pages ya no sirve** para desplegarla completa — solo hostea archivos estáticos y no puede correr `server/`. Necesitas un hosting que ejecute Node.js, por ejemplo Render, Railway, Fly.io o un VPS propio: sube el repo, configura `NVIDIA_API_KEY` (y opcionalmente `NVIDIA_MODEL`) como variable de entorno del servicio (no como archivo `.env` versionado), y arranca con `npm start` dentro de `server/`. Usa la URL pública que te den como "Authorized JavaScript origin" en el paso anterior de YouTube.

## Licencia

MIT — úsalo, modifícalo y adáptalo libremente.
