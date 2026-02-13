#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs, readJson, writeJson, ensureDir, stableId } = require('./common');

async function callModel({ model, systemPrompt, userPrompt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required for hosted generation');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.output_text;
}

function extractJson(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON object found in model output');
  return JSON.parse(text.slice(first, last + 1));
}

function extractJsonArray(text) {
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first === -1 || last === -1) throw new Error('No JSON array found in model output');
  return JSON.parse(text.slice(first, last + 1));
}

async function main() {
  const args = parseArgs(process.argv);
  const outlinePath = args.outline;
  const courseId = args.courseId;
  const model = args.model;
  const outDir = args.outDir;
  if (!outlinePath || !courseId || !model || !outDir) {
    throw new Error('Usage: node tools/generate-course.js --outline artifacts/linuxbook1/outline.json --courseId linux-terminal --model gpt-5 --outDir content/courses/linux-terminal/en');
  }

  const outline = readJson(outlinePath);
  const chunks = readJson(path.join('artifacts', outline.docId, 'chunks.json'));
  const chunksById = new Map(chunks.map((c) => [c.id, c]));
  const systemCourse = fs.readFileSync(path.join('tools', 'prompts', 'generate_course.md'), 'utf8');
  const systemLesson = fs.readFileSync(path.join('tools', 'prompts', 'generate_lesson.md'), 'utf8');

  const lessons = [];
  for (const lesson of outline.lessons) {
    const sourceText = lesson.sourceChunkIds.map((id) => chunksById.get(id)?.text).filter(Boolean).join('\n\n');
    const userPrompt = `Course: ${outline.title}\nLesson blueprint: ${JSON.stringify(lesson)}\nSource context:\n${sourceText}`;
    const raw = await callModel({ model, systemPrompt: systemLesson, userPrompt });
    const generated = extractJson(raw);
    generated.id = lesson.id;
    generated.module = lesson.module;
    generated.title = lesson.title;
    generated.tags = Array.isArray(generated.tags) ? generated.tags : lesson.tags;
    lessons.push(generated);
    console.log(`Generated lesson ${lesson.id}`);
  }

  const glossaryPrompt = `Build a glossary array for this Linux course.\nLessons: ${JSON.stringify(lessons.map((l) => ({ id: l.id, title: l.title, content: l.content.slice(0, 400) })))}\nReturn JSON array only.`;
  const glossaryRaw = await callModel({ model, systemPrompt: systemCourse, userPrompt: glossaryPrompt });
  const glossary = extractJsonArray(glossaryRaw).map((item) => ({
    termId: item.termId || stableId('term', item.term || JSON.stringify(item)),
    term: item.term || item.termId,
    aliases: Array.isArray(item.aliases) ? item.aliases : [],
    short: item.short || '',
    long: item.long || '',
    examples: Array.isArray(item.examples) ? item.examples : [],
    seeAlso: Array.isArray(item.seeAlso) ? item.seeAlso : [],
  }));

  const courseJson = {
    id: courseId,
    title: outline.title,
    subtitle: 'Publisher-generated Linux curriculum',
    version: 3,
    files: {
      lessons: './lessons.json',
      glossary: './glossary.json',
    },
    drillTasks: [
      'Complete one command lab from today\'s module',
      'Review one troubleshooting checklist',
    ],
  };

  ensureDir(outDir);
  writeJson(path.join(outDir, 'course.json'), courseJson);
  writeJson(path.join(outDir, 'lessons.json'), lessons);
  writeJson(path.join(outDir, 'glossary.json'), glossary);

  const indexPath = path.join('content', 'courses', 'index.json');
  const index = fs.existsSync(indexPath) ? readJson(indexPath) : [];
  const entry = { id: courseId, path: `/content/courses/${courseId}/en/course.json` };
  const next = [...index.filter((i) => i.id !== courseId), entry];
  writeJson(indexPath, next);

  console.log(`Generated course JSON in ${outDir}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
