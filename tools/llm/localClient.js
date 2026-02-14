const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';

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

async function generateLocal({ prompt, model = 'qwen2.5:3b', timeoutMs = 60000 }) {
  const baseUrl = resolveBaseUrl();
  const generateUrl = endpoint(baseUrl, '/api/generate');
  const tagsUrl = endpoint(baseUrl, '/api/tags');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return String(data.response || '').trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms`);
    }

    if (error.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(error.message)) {
      const healthy = await safeHealthCheck(tagsUrl, timeoutMs);
      const reason = healthy
        ? 'Ollama responded to /api/tags, but generation still failed.'
        : 'Ollama appears unreachable from this process.';
      throw new Error([
        `${reason}`,
        `Tried generate endpoint: ${generateUrl}`,
        `Health-check endpoint: ${tagsUrl}`,
        `Underlying error: ${error.message}`,
        'If you are on Windows, set NO_PROXY=127.0.0.1,localhost and try OLLAMA_URL=http://127.0.0.1:11434.',
      ].join(' '));
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generateLocal,
};
