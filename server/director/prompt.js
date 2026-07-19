// Director prompt — Phase 1: carries over the original client-side prompt verbatim.
// Phase 2 will expand this into a versioned, explicit retention-rules rubric
// (hook timing, beat cadence, target duration, captions, loop/CTA ending).
const VERSION = 'v1-baseline';

function buildScriptPrompt({ tema, tono, duracion, audiencia }) {
  return `Eres guionista de YouTube Shorts. Tema: "${tema}". Tono: ${tono}. Duración objetivo: ${duracion}. Audiencia: ${audiencia || 'general'}.
Genera un gancho para los primeros 2 segundos, entre 4 y 6 bloques de guion ("beats") que cubran toda la duración con su tiempo y una nota de qué mostrar en pantalla, 3 opciones de título, una descripción de 2-3 frases para YouTube, 3 hashtags y un texto corto para la miniatura.`;
}

module.exports = { buildScriptPrompt, VERSION };
