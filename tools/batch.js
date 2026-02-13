#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { parseArgs, ensureDir, readJson, writeJson, slugify } = require('./common');

function runNode(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [script, ...args], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed: node ${script} ${args.join(' ')}`));
    });
  });
}

function titleCase(text) {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function discoverInputs(inputDir) {
  if (!fs.existsSync(inputDir)) return [];
  return fs.readdirSync(inputDir)
    .filter((file) => ['.pdf', '.txt', '.md'].includes(path.extname(file).toLowerCase()))
    .map((file) => path.join(inputDir, file));
}

function stepList(only) {
  if (!only) return ['ingest', 'extract', 'outline', 'context'];
  if (only === 'ingest') return ['ingest'];
  if (only === 'extract') return ['extract'];
  if (only === 'outline') return ['outline'];
  throw new Error('Invalid --only value. Use ingest|extract|outline');
}

async function runStep(step, job, model) {
  if (step === 'ingest') {
    await runNode('tools/ingest.js', ['--input', job.input, '--docId', job.docId]);
  } else if (step === 'extract') {
    await runNode('tools/extract-concepts.js', ['--docId', job.docId, '--model', model]);
  } else if (step === 'outline') {
    await runNode('tools/build-outline.js', [
      '--docId', job.docId,
      '--courseId', job.courseId,
      '--title', job.title,
      '--lessons', String(job.lessons),
    ]);
  } else if (step === 'context') {
    await runNode('tools/build-lesson-context.js', ['--docId', job.docId]);
  }
}

async function processJob(job, steps, resume, model) {
  const statePath = path.join('tools', 'jobState', `${job.docId}.json`);
  const state = resume && fs.existsSync(statePath) ? readJson(statePath) : { completed: [] };
  const completed = new Set(state.completed || []);

  for (const step of steps) {
    if (resume && completed.has(step)) {
      console.log(`Skipping ${step} for ${job.docId} (--resume)`);
      continue;
    }

    await runStep(step, job, model);
    completed.add(step);
    writeJson(statePath, { ...job, completed: [...completed] });
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const inputDir = args.input || 'sources';
  const model = args.model || 'qwen2.5:3b';
  const resume = Boolean(args.resume);
  const only = args.only;
  const lessons = Number(args.lessons || 40);

  ensureDir(path.join('tools', 'jobState'));
  const steps = stepList(only);
  const files = discoverInputs(inputDir);

  if (!files.length) {
    console.log(`No source files found in ${inputDir}`);
    return;
  }

  for (const input of files) {
    const base = path.basename(input, path.extname(input));
    const docId = slugify(base);
    const job = {
      input,
      docId,
      courseId: slugify(base),
      title: titleCase(base),
      lessons,
    };

    console.log(`\n== Processing ${docId} ==`);
    await processJob(job, steps, resume, model);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
