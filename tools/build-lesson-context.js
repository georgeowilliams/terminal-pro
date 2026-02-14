#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs, ensureDir, readJson, writeJson } = require('./common');

function getChunkMap(chunks) {
  const map = new Map();
  for (const chunk of chunks) map.set(chunk.chunkId, chunk);
  return map;
}

function pickQuizIdeas(title, terms) {
  return [
    `Short-answer: explain ${terms[0] || 'the core concept'} in your own words.`,
    `Command challenge tied to: ${title}.`,
  ];
}

function inferCommands(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim());
  const commandLike = lines.filter((line) => /^(\$\s+)?[a-z][\w-]*(\s+[-\w./:=]+)*$/.test(line));
  return [...new Set(commandLike.map((line) => line.replace(/^\$\s+/, '')))].slice(0, 6);
}

function buildExcerpt(text, maxLength = 420) {
  const content = String(text || '').trim();
  if (content.length <= maxLength) return content;

  const fenceStart = content.indexOf('```');
  if (fenceStart >= 0) {
    const fenceEnd = content.indexOf('```', fenceStart + 3);
    if (fenceEnd > fenceStart) {
      const block = content.slice(fenceStart, fenceEnd + 3);
      if (block.length <= maxLength + 100) return block;
    }
  }

  const breakAt = Math.max(
    content.lastIndexOf('\n\n', maxLength),
    content.lastIndexOf('\n', maxLength),
    content.lastIndexOf(' ', maxLength),
  );
  const cut = breakAt > maxLength * 0.6 ? breakAt : maxLength;
  return `${content.slice(0, cut).trim()}…`;
}

function summarizeRelevance(lessonTitle, chunk, termsFound) {
  const termPreview = termsFound.slice(0, 3).join(', ');
  if (termPreview) return `Supports "${lessonTitle}" via terms: ${termPreview}.`;
  return `Provides primary source text for "${lessonTitle}" (chunk ${chunk.chunkId}).`;
}

function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;

  if (!docId) {
    throw new Error('Usage: node tools/build-lesson-context.js --docId linuxbook1');
  }

  const baseDir = path.join('artifacts', docId);
  const outline = readJson(path.join(baseDir, 'outline.json'));
  const chunks = readJson(path.join(baseDir, 'chunks.json'));
  const conceptsPath = path.join(baseDir, 'concepts.json');
  const concepts = fs.existsSync(conceptsPath) ? readJson(conceptsPath) : { perChunk: [] };
  const chunkMap = getChunkMap(chunks);
  const conceptMap = new Map((concepts.perChunk || []).map((row) => [row.chunkId, row]));

  const lessonDir = path.join(baseDir, 'lesson-context');
  ensureDir(lessonDir);

  outline.lessons.forEach((lesson, i) => {
    const relevantChunks = lesson.sourceChunkIds
      .map((id) => {
        const chunk = chunkMap.get(id);
        if (!chunk) return null;

        const extracted = conceptMap.get(id) || {};
        const termsFound = [...new Set([...(extracted.concepts || []), ...(extracted.tools || [])])].slice(0, 8);
        const commandsFound = (extracted.commands || []).length ? extracted.commands.slice(0, 8) : inferCommands(chunk.text);

        return {
          chunkId: chunk.chunkId,
          start: chunk.start,
          end: chunk.end,
          termsFound,
          commandsFound,
          whyItMatters: summarizeRelevance(lesson.title, chunk, termsFound),
          text: chunk.text,
        };
      })
      .filter(Boolean);

    const extracts = relevantChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      excerpt: buildExcerpt(chunk.text),
      commandsFound: chunk.commandsFound,
      termsFound: chunk.termsFound,
    }));

    const pack = {
      lessonId: lesson.id,
      title: lesson.title,
      objectives: lesson.objectives,
      extracts,
      relevantChunks,
      glossaryTerms: lesson.requiredTerms,
      quizIdeas: pickQuizIdeas(lesson.title, lesson.requiredTerms),
    };

    const fileName = `lesson${String(i + 1).padStart(2, '0')}.json`;
    writeJson(path.join(lessonDir, fileName), pack);
  });

  console.log(`Wrote lesson context packs to ${lessonDir}`);
}

main();
