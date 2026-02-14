#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs, ensureDir, readJson, writeJson, slugify } = require('./common');
const { generateLocal } = require('./llm/localClient');
const { createProgress } = require('./utils/progressBar');

const CACHE_DIR = path.join('tools', 'cache');
const PROMPT_VERSION = 'v2';
const GENERATE_ENDPOINT = '/api/generate';

function promptForChunk(chunkText) {
  return [
    'Extract key technical entities from this textbook chunk.',
    'Return strict compact JSON with keys: concepts, commands, flags, tools, filePaths.',
    'Each key must map to an array of short strings. No prose.',
    '',
    'TEXT:',
    chunkText,
  ].join('\n');
}

function hashInput({ model, prompt, baseUrl }) {
  return crypto
    .createHash('sha256')
    .update([PROMPT_VERSION, baseUrl, GENERATE_ENDPOINT, model, prompt].join('\n'))
    .digest('hex');
}

function parseResponse(text) {
  const blank = { concepts: [], commands: [], flags: [], tools: [], filePaths: [] };
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return blank;
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));

    return {
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      filePaths: Array.isArray(parsed.filePaths) ? parsed.filePaths : [],
    };
  } catch (_) {
    return blank;
  }
}

function uniq(values) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === true) return true;
  if (value === false) return false;
  if (value == null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(text)) return true;
  if (['0', 'false', 'no', 'n'].includes(text)) return false;
  return fallback;
}

async function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;
  const model = args.model || 'qwen2.5:3b';
  const maxChars = parseNumber(args.maxChars, 1600);
  const maxPredict = parseNumber(args.maxPredict, 256);
  const timeoutMs = parseNumber(args.timeoutMs, 180000);
  const retries = parseNumber(args.retries, 2);
  const skipFailed = parseBoolean(args.skipFailed, true);
  const ollamaBaseUrl = String(process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');

  if (!docId) {
    throw new Error('Usage: node tools/extract-concepts.js --docId linuxbook1 [--model qwen2.5:3b] [--maxChars 1600]');
  }

  const chunksPath = path.join('artifacts', docId, 'chunks.json');
  const chunks = readJson(chunksPath);

  const modelCacheDir = path.join(CACHE_DIR, slugify(model) || 'model');
  ensureDir(modelCacheDir);

  const aggregate = { concepts: [], commands: [], flags: [], tools: [], filePaths: [] };
  const perChunk = [];
  const failedChunks = [];
  const progress = createProgress(chunks.length);

  for (const chunk of chunks) {
    const startedAt = Date.now();
    const truncatedText = String(chunk.text || '').slice(0, maxChars);
    const prompt = promptForChunk(truncatedText);
    const key = hashInput({ model, prompt, baseUrl: ollamaBaseUrl });
    const cachePath = path.join(modelCacheDir, `${key}.json`);

    let parsed;
    let cached = false;
    if (fs.existsSync(cachePath)) {
      parsed = readJson(cachePath);
      cached = true;
    } else {
      try {
        const output = await generateLocal({
          prompt,
          model,
          timeoutMs,
          retries,
          numPredict: maxPredict,
          temperature: 0.1,
        });
        parsed = parseResponse(output);
        writeJson(cachePath, parsed);
      } catch (error) {
        if (!skipFailed) {
          throw error;
        }
        failedChunks.push({ chunkId: chunk.chunkId, error: String(error.message || error) });
        progress.tick(Date.now() - startedAt, { cached: false });
        continue;
      }
    }

    perChunk.push({ chunkId: chunk.chunkId, ...parsed });

    aggregate.concepts.push(...parsed.concepts);
    aggregate.commands.push(...parsed.commands);
    aggregate.flags.push(...parsed.flags);
    aggregate.tools.push(...parsed.tools);
    aggregate.filePaths.push(...parsed.filePaths);

    progress.tick(Date.now() - startedAt, { cached });
  }

  const concepts = {
    concepts: uniq(aggregate.concepts),
    commands: uniq(aggregate.commands),
    flags: uniq(aggregate.flags),
    tools: uniq(aggregate.tools),
    filePaths: uniq(aggregate.filePaths),
    perChunk,
    failedChunks,
  };

  const outPath = path.join('artifacts', docId, 'concepts.json');
  writeJson(outPath, concepts);
  console.log(`Wrote concepts: ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
