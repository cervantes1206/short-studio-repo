// NVIDIA NIM provider (build.nvidia.com) — OpenAI-compatible chat completions.
// Free-tier API key, no credit card. Model is configurable via NVIDIA_MODEL
// since NVIDIA's catalog renames/rotates model slugs over time.

const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    hook: { type: 'string', description: 'Frase de gancho para los primeros 2 segundos' },
    beats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tiempo: { type: 'string' },
          texto: { type: 'string' },
          visual: { type: 'string', description: 'Nota de qué mostrar en pantalla' }
        },
        required: ['tiempo', 'texto', 'visual'],
        additionalProperties: false
      }
    },
    titulos: { type: 'array', items: { type: 'string' } },
    descripcion: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    miniaturaTexto: { type: 'string' }
  },
  required: ['hook', 'beats', 'titulos', 'descripcion', 'hashtags', 'miniaturaTexto'],
  additionalProperties: false
};

const DEFAULT_MODEL = 'deepseek-ai/deepseek-v4-pro';

// NVIDIA's free-tier endpoints run on serverless GPU functions (NVCF) that cold-start —
// the first call after idle time can 404/5xx even with a valid request. Retry a couple times.
const COLD_START_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [800, 1500, 2500, 4000];

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('La IA no devolvió un JSON reconocible.');
  return JSON.parse(candidate.slice(start, end + 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestCompletion(apiKey, model, prompt) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Respondes ÚNICAMENTE con un objeto JSON válido (sin texto adicional, sin markdown) que cumpla exactamente este schema: ' +
            JSON.stringify(SCRIPT_SCHEMA)
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      stream: false
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    let msg = errBody;
    try { msg = JSON.parse(errBody).error?.message || errBody; } catch (e) {}
    const error = new Error(`La API de NVIDIA respondió ${response.status}: ${msg}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function callNvidia(prompt) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('Falta NVIDIA_API_KEY en el entorno del servidor (.env).');
  }
  const model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;

  let data;
  for (let attempt = 0; ; attempt++) {
    try {
      data = await requestCompletion(apiKey, model, prompt);
      break;
    } catch (e) {
      const canRetry = COLD_START_STATUSES.has(e.status) && attempt < RETRY_DELAYS_MS.length;
      if (!canRetry) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respuesta vacía de la IA');
  return extractJson(content);
}

module.exports = { callNvidia, SCRIPT_SCHEMA };
