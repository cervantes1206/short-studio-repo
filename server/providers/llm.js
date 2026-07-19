// Anthropic (Claude) provider — moved server-side from index.html's callClaude().
// Same model and structured-output approach; the browser-only CORS header
// (anthropic-dangerous-direct-browser-access) is dropped since this now runs server-side.

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

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Falta ANTHROPIC_API_KEY en el entorno del servidor (.env).');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      output_config: { format: { type: 'json_schema', schema: SCRIPT_SCHEMA } },
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    let msg = errBody;
    try { msg = JSON.parse(errBody).error?.message || errBody; } catch (e) {}
    throw new Error(`La API respondió ${response.status}: ${msg}`);
  }

  const data = await response.json();
  if (data.stop_reason === 'refusal') {
    throw new Error('Claude no pudo generar este contenido (se activó un filtro de seguridad). Prueba con otro tema.');
  }

  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Respuesta vacía de la IA');
  return JSON.parse(textBlock.text);
}

module.exports = { callClaude, SCRIPT_SCHEMA };
