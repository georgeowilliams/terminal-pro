#!/usr/bin/env node
const path = require('path');
const { parseArgs, readJson, writeJson, stableId, slugify } = require('./common');

function detectTopic(chunkText, index) {
  const firstLine = String(chunkText || '').split('\n').map((l) => l.trim()).find(Boolean) || `Topic ${index + 1}`;
  return firstLine.replace(/^#{1,6}\s*/, '').slice(0, 80);
}

function pickTerms(concepts, offset, count = 4) {
  if (!concepts.length) return [];
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(concepts[(offset + i) % concepts.length]);
  }
  return [...new Set(picked)];
}

function lessonKind(n) {
  if (n % 10 === 0) return 'review';
  if (n % 5 === 0) return 'lab';
  return 'core';
}

function moduleName(index, total) {
  const moduleCount = Math.max(4, Math.ceil(total / 8));
  const moduleIndex = Math.floor((index / total) * moduleCount) + 1;
  return `Module ${String(moduleIndex).padStart(2, '0')}`;
}

function buildOutline({ docId, courseId, title, lessonCount, chunks, concepts }) {
  const lessons = [];

  for (let i = 0; i < lessonCount; i += 1) {
    const n = i + 1;
    const kind = lessonKind(n);
    const chunk = chunks[i % chunks.length];
    const topic = detectTopic(chunk.text, i);

    let lessonTitle = topic;
    if (kind === 'lab') lessonTitle = `Lab: ${topic}`;
    if (kind === 'review') lessonTitle = `Review: ${topic}`;

    const module = moduleName(i, lessonCount);
    const lessonId = stableId(slugify(courseId) || 'lesson', `${courseId}|${module}|${lessonTitle}|${n}`);
    const requiredTerms = pickTerms(concepts, i * 3);

    const sourceChunkIds = [
      chunks[i % chunks.length].chunkId,
      chunks[(i + 1) % chunks.length].chunkId,
      chunks[(i + 2) % chunks.length].chunkId,
    ];

    lessons.push({
      id: lessonId,
      module,
      title: lessonTitle,
      objectives: [
        `Explain ${topic.toLowerCase()}`,
        kind === 'lab' ? 'Complete a guided terminal exercise' : 'Apply the topic in realistic terminal workflows',
      ],
      requiredTerms,
      sourceChunkIds,
    });
  }

  return {
    courseId,
    title,
    docId,
    modules: [...new Set(lessons.map((l) => l.module))],
    lessons,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;
  const courseId = args.courseId;
  const title = args.title;
  const lessonCount = Number(args.lessons || 40);

  if (!docId || !courseId || !title) {
    throw new Error('Usage: node tools/build-outline.js --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40');
  }

  const chunks = readJson(path.join('artifacts', docId, 'chunks.json'));
  if (!chunks.length) throw new Error('No chunks found. Run ingest first.');

  const conceptsPath = path.join('artifacts', docId, 'concepts.json');
  const conceptData = require('fs').existsSync(conceptsPath) ? readJson(conceptsPath) : { concepts: [] };

  const outline = buildOutline({
    docId,
    courseId,
    title,
    lessonCount,
    chunks,
    concepts: conceptData.concepts || [],
  });

  const outPath = path.join('artifacts', docId, 'outline.json');
  writeJson(outPath, outline);
  console.log(`Wrote outline: ${outPath}`);
}

main();
