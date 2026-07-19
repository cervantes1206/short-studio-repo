// Pollinations.ai image-generation provider — free, no API key/account needed.
// Anonymous tier is rate-limited to ~1 request every 15s, so we throttle calls
// at the module level rather than pushing that constraint onto callers.
// https://github.com/pollinations/pollinations/blob/master/APIDOCS.md

const ENDPOINT = 'https://image.pollinations.ai/prompt/';
const MIN_INTERVAL_MS = 15500; // a bit over the documented 15s anonymous limit
const RETRY_DELAYS_MS = [3000, 6000, 10000];

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function requestImage(prompt) {
  const model = process.env.POLLINATIONS_MODEL || 'flux';
  const url = `${ENDPOINT}${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=768&height=1024&nologo=true`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Pollinations respondió ${response.status} al generar la imagen.`);
    error.status = response.status;
    throw error;
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// generateImage(prompt) -> Buffer (image bytes). Same interface as any other
// image provider, so swapping vendors later is a one-file change.
async function generateImage(prompt) {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    try {
      return await requestImage(prompt);
    } catch (e) {
      const canRetry = attempt < RETRY_DELAYS_MS.length;
      if (!canRetry) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

module.exports = { generateImage };
