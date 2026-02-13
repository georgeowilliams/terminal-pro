#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs, ensureDir, readJson, writeJson } = require('./common');
const { generateLocal } = require('./llm/localClient');

const CACHE_DIR = path.join('tools', 'cache');

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

function hashInput(model, prompt) {
  return crypto.createHash('sha256').update(`${model}\n${prompt}`).digest('hex');
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

async function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;
  const model = args.model || 'qwen2.5:3b';

  if (!docId) {
    throw new Error('Usage: node tools/extract-concepts.js --docId linuxbook1 --model qwen2.5:3b');
  }

  const chunksPath = path.join('artifacts', docId, 'chunks.json');
  const chunks = readJson(chunksPath);
  ensureDir(CACHE_DIR);

  const aggregate = { concepts: [], commands: [], flags: [], tools: [], filePaths: [] };
  const perChunk = [];

  for (const chunk of chunks) {
    const prompt = promptForChunk(chunk.text);
    const key = hashInput(model, prompt);
    const cachePath = path.join(CACHE_DIR, `${key}.json`);

    let parsed;
    if (fs.existsSync(cachePath)) {
      parsed = readJson(cachePath);
    } else {
      const output = await generateLocal({ prompt, model, timeoutMs: 90000 });
      parsed = parseResponse(output);
      writeJson(cachePath, parsed);
    }

    perChunk.push({ chunkId: chunk.chunkId, ...parsed });

    aggregate.concepts.push(...parsed.concepts);
    aggregate.commands.push(...parsed.commands);
    aggregate.flags.push(...parsed.flags);
    aggregate.tools.push(...parsed.tools);
    aggregate.filePaths.push(...parsed.filePaths);
  }

  const concepts = {
    concepts: uniq(aggregate.concepts),
    commands: uniq(aggregate.commands),
    flags: uniq(aggregate.flags),
    tools: uniq(aggregate.tools),
    filePaths: uniq(aggregate.filePaths),
    perChunk,
  };

  const outPath = path.join('artifacts', docId, 'concepts.json');
  writeJson(outPath, concepts);
  console.log(`Wrote concepts: ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
