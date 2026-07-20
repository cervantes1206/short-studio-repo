// ElevenLabs text-to-speech provider — needs your own API key (elevenlabs.io),
// has a limited free tier. Same swappable-interface pattern as llm.js/image.js.
// https://elevenlabs.io/docs/api-reference/text-to-speech/convert

// Premade ElevenLabs voice confirmed working from the account's own quickstart snippet.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

// generateSpeech(text) -> Buffer (mp3 bytes). Duration is measured later via
// ffprobe (server/providers/assembly.js), not derived here.
async function generateSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Falta ELEVENLABS_API_KEY en el entorno del servidor (.env).');
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: DEFAULT_MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    let msg = errBody;
    try { msg = JSON.parse(errBody).detail?.message || JSON.parse(errBody).detail || errBody; } catch (e) {}
    throw new Error(`La API de ElevenLabs respondió ${response.status}: ${msg}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { generateSpeech };
