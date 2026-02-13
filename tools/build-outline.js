#!/usr/bin/env node
const path = require('path');
const { parseArgs, readJson, writeJson, stableId, slugify } = require('./common');

function pickModule(index, total) {
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.2) return '1. Foundations';
  if (ratio < 0.4) return '2. Navigation & Files';
  if (ratio < 0.6) return '3. Shell Power Tools';
  if (ratio < 0.8) return '4. Administration';
  return '5. Automation & Troubleshooting';
}

function lessonType(i) {
  if (i > 0 && i % 10 === 0) return 'review';
  if (i > 0 && i % 5 === 0) return 'lab';
  return 'core';
}

function titleFromChunk(chunk, type, i) {
  const basis = chunk.section && chunk.section !== 'Untitled' ? chunk.section : `Linux Topic ${i + 1}`;
  if (type === 'lab') return `Lab: ${basis}`;
  if (type === 'review') return `Review: ${basis}`;
  return basis;
}

function buildOutline({ docId, courseId, title, lessonCount, chunks }) {
  const lessons = [];
  for (let i = 0; i < lessonCount; i += 1) {
    const type = lessonType(i + 1);
    const baseChunk = chunks[i % chunks.length];
    const module = pickModule(i, lessonCount);
    const lessonTitle = titleFromChunk(baseChunk, type, i);
    const idSeed = `${courseId}|${module}|${lessonTitle}|${i + 1}`;
    const lessonId = stableId(slugify(courseId) || 'lesson', idSeed);
    const windowStart = (i * 2) % chunks.length;
    const sourceChunkIds = [chunks[windowStart]?.id, chunks[(windowStart + 1) % chunks.length]?.id].filter(Boolean);

    lessons.push({
      id: lessonId,
      module,
      title: lessonTitle,
      tags: ['linux', type === 'core' ? 'fundamentals' : type],
      objectives: [
        `Understand ${lessonTitle.toLowerCase()}`,
        'Apply commands safely in a terminal environment',
      ],
      requiredTerms: [],
      sourceChunkIds,
      difficulty: i < lessonCount * 0.33 ? 'beginner' : i < lessonCount * 0.66 ? 'intermediate' : 'advanced',
      type,
    });
  }

  return {
    docId,
    courseId,
    title,
    modules: Array.from(new Set(lessons.map((l) => l.module))),
    lessons,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const docId = args.docId;
  const courseId = args.courseId;
  const title = args.title;
  const lessonCount = Number(args.lessons || 40);
  const out = args.out || path.join('artifacts', docId, 'outline.json');

  if (!docId || !courseId || !title) {
    throw new Error('Usage: node tools/build-outline.js --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40 --out artifacts/linuxbook1/outline.json');
  }

  const chunks = readJson(path.join('artifacts', docId, 'chunks.json'));
  if (!Array.isArray(chunks) || chunks.length === 0) throw new Error('No chunks found. Run ingest first.');

  const outline = buildOutline({ docId, courseId, title, lessonCount, chunks });
  writeJson(out, outline);
  console.log(`Wrote outline: ${out}`);
}

main();
