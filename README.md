# Shorts Studio

Interfaz de un solo archivo (`index.html`) para crear guiones de YouTube Shorts con ayuda de IA, revisarlos, validarlos manualmente y — de forma opcional — publicarlos directamente en tu propio canal de YouTube.

No es un bot de publicación automática. Cada video pasa por un checklist que marcas tú mismo y una confirmación explícita antes de subirse.

## Qué hace

1. **Generar** — describes el tema, tono, duración y audiencia; una IA genera gancho, guion por bloques, opciones de título, descripción, hashtags y texto de miniatura.
2. **Revisar** — todos los campos quedan editables. El contenido generado es un punto de partida, no una versión final.
3. **Validar** — un checklist manual (guion revisado, sin derechos de autor, sin clickbait, cumple normas de YouTube) más un interruptor para declarar contenido sintético/alterado por IA.
4. **Exportar / Publicar** — copia los campos para subirlos tú mismo en YouTube Studio, o conecta tu canal y publica directamente desde la interfaz, con visibilidad privada por defecto y confirmación antes de cada subida.

Los borradores se guardan automáticamente para que puedas retomarlos.

## Uso

Abre `index.html` en un navegador. Funciona como página estática, sin backend ni instalación:

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

O simplemente ábrelo con doble clic (`file://`); solo la publicación a YouTube necesita que esté servido por HTTP/HTTPS por el requisito de "Authorized JavaScript origin" de Google (ver abajo).

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
├── index.html   # toda la interfaz: HTML, CSS y JS en un solo archivo
└── README.md
```

No hay dependencias que instalar. Las fuentes se cargan desde Google Fonts y la autenticación desde Google Identity Services (`accounts.google.com/gsi/client`), ambas por CDN.

## Publicar con GitHub Pages

```bash
git add .
git commit -m "Shorts Studio"
git push
```

Luego, en el repositorio en GitHub: **Settings → Pages → Deploy from a branch**, elige `main` y la carpeta raíz. La app quedará disponible en `https://tuusuario.github.io/nombre-repo/`. Usa esa URL exacta como "Authorized JavaScript origin" en el paso anterior.

## Licencia

MIT — úsalo, modifícalo y adáptalo libremente.
