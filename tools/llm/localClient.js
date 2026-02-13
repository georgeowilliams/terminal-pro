const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';

async function generateLocal({ prompt, model = 'qwen2.5:3b', timeoutMs = 60000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OLLAMA_URL, {
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
      throw new Error('Unable to reach Ollama at http://localhost:11434. Please run: ollama run qwen2.5:3b');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generateLocal,
};
