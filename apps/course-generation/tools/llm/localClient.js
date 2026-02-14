const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_RETRIES = 2;
const DEFAULT_NUM_PREDICT = 256;
const DEFAULT_TEMPERATURE = 0.1;
const TRUNCATED_PROMPT_MAX = 1200;

function resolveBaseUrl() {
  const raw = String(process.env.OLLAMA_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '');
}

function endpoint(baseUrl, route) {
  return `${baseUrl}${route}`;
}

async function safeHealthCheck(tagsUrl, timeoutMs) {
  try {
    const response = await fetch(tagsUrl, { method: 'GET', signal: AbortSignal.timeout(Math.min(timeoutMs, 8000)) });
    return response.ok;
  } catch (_) {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestGenerate({ generateUrl, model, prompt, timeoutMs, numPredict, temperature }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_predict: numPredict,
          temperature,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return String(data.response || '').trim();
  } finally {
    clearTimeout(timer);
  }
}

function toConnectionError({ error, generateUrl, tagsUrl, timeoutMs }) {
  if (error.name === 'AbortError') {
    return new Error(`Ollama request timed out after ${timeoutMs}ms`);
  }

  if (error.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(error.message)) {
    return safeHealthCheck(tagsUrl, timeoutMs).then((healthy) => {
      const reason = healthy
        ? 'Ollama responded to /api/tags, but generation still failed.'
        : 'Ollama appears unreachable from this process.';
      return new Error([
        `${reason}`,
        `Tried generate endpoint: ${generateUrl}`,
        `Health-check endpoint: ${tagsUrl}`,
        `Underlying error: ${error.message}`,
      ].join(' '));
    });
  }

  return error;
}

async function generateLocal({
  prompt,
  model = 'qwen2.5:3b',
  timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  retries = DEFAULT_RETRIES,
  numPredict = DEFAULT_NUM_PREDICT,
  temperature = DEFAULT_TEMPERATURE,
}) {
  const baseUrl = resolveBaseUrl();
  const generateUrl = endpoint(baseUrl, '/api/generate');
  const tagsUrl = endpoint(baseUrl, '/api/tags');
  const maxAttempts = Number.isFinite(retries) ? Math.max(0, retries) + 1 : DEFAULT_RETRIES + 1;
  let currentPrompt = prompt;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestGenerate({ generateUrl, model, prompt: currentPrompt, timeoutMs, numPredict, temperature });
    } catch (error) {
      const mappedError = await toConnectionError({ error, generateUrl, tagsUrl, timeoutMs });
      const timedOut = error.name === 'AbortError';
      if (timedOut) {
        currentPrompt = String(prompt).slice(0, TRUNCATED_PROMPT_MAX);
      }

      const canRetry = attempt < maxAttempts;
      if (!canRetry) {
        lastError = mappedError;
        break;
      }

      const backoffMs = Math.min(1000 * (2 ** (attempt - 1)), 2000);
      await wait(backoffMs);
    }
  }

  const baseMessage = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown Ollama error');
  throw new Error([
    baseMessage,
    `Ollama URL: ${baseUrl}`,
    'Start a local model first: ollama run qwen2.5:3b or ollama run phi3:mini.',
  ].join(' '));
}

module.exports = {
  generateLocal,
};
