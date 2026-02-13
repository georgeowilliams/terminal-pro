#!/usr/bin/env node
const path = require('path');
const { parseArgs, readJson } = require('./common');

function fail(msg) {
  console.error(`Validation failed: ${msg}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv);
  const dir = args.dir;
  if (!dir) fail('Usage: node tools/validateContent.js --dir content/courses/<courseId>/en');

  const course = readJson(path.join(dir, 'course.json'));
  const lessons = readJson(path.join(dir, 'lessons.json'));
  const glossary = readJson(path.join(dir, 'glossary.json'));

  if (!course.id || !course.title || !course.files?.lessons || !course.files?.glossary) fail('course.json missing required fields');
  if (!Array.isArray(lessons) || lessons.length === 0) fail('lessons.json must be a non-empty array');
  if (!Array.isArray(glossary)) fail('glossary.json must be an array');

  const lessonIds = new Set();
  lessons.forEach((lesson, idx) => {
    if (!lesson.id || !lesson.module || !lesson.title || !lesson.content) fail(`lesson ${idx} missing required fields`);
    if (lessonIds.has(lesson.id)) fail(`duplicate lesson id: ${lesson.id}`);
    lessonIds.add(lesson.id);
    if (!Array.isArray(lesson.quiz) || lesson.quiz.length === 0) fail(`lesson ${lesson.id} must include quiz questions`);
    lesson.quiz.forEach((q, qIdx) => {
      if (!q.type) fail(`lesson ${lesson.id} quiz ${qIdx} missing type`);
      if (q.type === 'mcq') {
        if (!Array.isArray(q.choices) || q.choices.length < 2) fail(`lesson ${lesson.id} quiz ${qIdx} requires >= 2 choices`);
        if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= q.choices.length) fail(`lesson ${lesson.id} quiz ${qIdx} invalid answerIndex`);
      }
      if (q.type === 'short' && typeof q.answer !== 'string') fail(`lesson ${lesson.id} quiz ${qIdx} short answer must be a string`);
      if (q.type === 'output' && typeof q.answer !== 'string') fail(`lesson ${lesson.id} quiz ${qIdx} output answer must be a string`);
    });
  });

  const termIds = new Set();
  glossary.forEach((term, idx) => {
    const termId = term.termId || term.term;
    if (!termId) fail(`glossary item ${idx} requires termId or term`);
    if (termIds.has(termId)) fail(`duplicate glossary term id: ${termId}`);
    termIds.add(termId);
  });

  console.log(`Validation passed for ${dir}`);
}

main();
