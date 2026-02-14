#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs, readJson, writeJson, stableId, slugify } = require('./common');

function detectTopic(chunkText, chunkTerms, index) {
  if (chunkTerms.length) return chunkTerms.slice(0, 4).join(' · ');
  const firstLine = String(chunkText || '').split('\n').map((l) => l.trim()).find(Boolean) || `Topic ${index + 1}`;
  return firstLine.replace(/^#{1,6}\s*/, '').slice(0, 80);
}

function lessonKind(n) {
  if (n % 10 === 0) return 'review';
  if (n % 5 === 0) return 'lab';
  return 'core';
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function sanitizeTerms(values, max = 8) {
  return [...new Set((values || []).map((v) => String(v).trim()).filter(Boolean))].slice(0, max);
}

function buildChunkInsights(chunks, conceptData) {
  const perChunk = new Map((conceptData.perChunk || []).map((c) => [c.chunkId, c]));
  return chunks.map((chunk, index) => {
    const extracted = perChunk.get(chunk.chunkId) || {};
    const terms = sanitizeTerms([
      ...(extracted.concepts || []),
      ...(extracted.commands || []),
      ...(extracted.tools || []),
      ...(extracted.flags || []),
    ]);

    return {
      ...chunk,
      index,
      terms,
      termSet: new Set(terms.map((t) => t.toLowerCase())),
    };
  });
}

function chooseChunkForLesson(chunkInsights, lessonIndex, lessonCount) {
  if (!chunkInsights.length) return null;
  if (lessonCount <= chunkInsights.length) {
    const spreadIndex = Math.floor((lessonIndex / lessonCount) * chunkInsights.length);
    return chunkInsights[Math.min(spreadIndex, chunkInsights.length - 1)];
  }
  return chunkInsights[lessonIndex % chunkInsights.length];
}

function similarChunkIds(baseChunk, chunkInsights, count = 3) {
  if (!baseChunk) return [];
  return chunkInsights
    .map((candidate) => ({
      chunkId: candidate.chunkId,
      score: candidate.chunkId === baseChunk.chunkId ? 1 : jaccard(baseChunk.termSet, candidate.termSet),
      distance: Math.abs(candidate.index - baseChunk.index),
    }))
    .sort((a, b) => (b.score - a.score) || (a.distance - b.distance))
    .slice(0, count)
    .map((row) => row.chunkId);
}

function moduleName(index, lessonCount, chunk) {
  const moduleCount = Math.max(4, Math.ceil(lessonCount / 8));
  const labelTerm = chunk?.terms?.[0];
  const seqName = `Module ${String(Math.floor((index / lessonCount) * moduleCount) + 1).padStart(2, '0')}`;
  if (!labelTerm) return seqName;
  return `${seqName}: ${labelTerm.slice(0, 36)}`;
}

function buildOutline({ docId, courseId, title, lessonCount, chunks, conceptData }) {
  const chunkInsights = buildChunkInsights(chunks, conceptData);
  const lessons = [];

  for (let i = 0; i < lessonCount; i += 1) {
    const n = i + 1;
    const kind = lessonKind(n);
    const chunk = chooseChunkForLesson(chunkInsights, i, lessonCount);
    const topic = detectTopic(chunk?.text, chunk?.terms || [], i);

    let lessonTitle = topic;
    if (kind === 'lab') lessonTitle = `Lab: ${topic}`;
    if (kind === 'review') lessonTitle = `Review: ${topic}`;

    const module = moduleName(i, lessonCount, chunk);
    const lessonId = stableId(slugify(courseId) || 'lesson', `${courseId}|${module}|${lessonTitle}|${n}`);
    const requiredTerms = sanitizeTerms(chunk?.terms || [], 6);
    const sourceChunkIds = similarChunkIds(chunk, chunkInsights);

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
    throw new Error('Usage: node tools/build-outline.js --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40 [--out artifacts/linuxbook1/outline.json]');
  }

  const chunks = readJson(path.join('artifacts', docId, 'chunks.json'));
  if (!chunks.length) throw new Error('No chunks found. Run ingest first.');

  const conceptsPath = path.join('artifacts', docId, 'concepts.json');
  const conceptData = fs.existsSync(conceptsPath) ? readJson(conceptsPath) : { concepts: [], perChunk: [] };

  const outline = buildOutline({
    docId,
    courseId,
    title,
    lessonCount,
    chunks,
    conceptData,
  });

  const outPath = args.out || path.join('artifacts', docId, 'outline.json');
  writeJson(outPath, outline);
  console.log(`Wrote outline: ${outPath}`);
}

main();
