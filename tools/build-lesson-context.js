#!/usr/bin/env node
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

function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;

  if (!docId) {
    throw new Error('Usage: node tools/build-lesson-context.js --docId linuxbook1');
  }

  const baseDir = path.join('artifacts', docId);
  const outline = readJson(path.join(baseDir, 'outline.json'));
  const chunks = readJson(path.join(baseDir, 'chunks.json'));
  const chunkMap = getChunkMap(chunks);

  const lessonDir = path.join(baseDir, 'lesson-context');
  ensureDir(lessonDir);

  outline.lessons.forEach((lesson, i) => {
    const relevantChunks = lesson.sourceChunkIds.map((id) => chunkMap.get(id)).filter(Boolean);
    const textbookExtracts = relevantChunks.map((chunk) => chunk.text.slice(0, 450));

    const pack = {
      lessonId: lesson.id,
      title: lesson.title,
      objectives: lesson.objectives,
      textbookExtracts,
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
