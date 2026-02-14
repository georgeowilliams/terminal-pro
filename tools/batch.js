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


async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const runners = [];

  async function next() {
    const item = queue.shift();
    if (!item) return;
    await worker(item);
    await next();
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) {
    runners.push(next());
  }

  await Promise.all(runners);
}

async function main() {
  const args = parseArgs(process.argv);
  const inputDir = args.input || 'sources';
  const model = args.model || 'qwen2.5:3b';
  const resume = Boolean(args.resume);
  const only = args.only;
  const lessons = Number(args.lessons || 40);
  const requestedConcurrency = Number(args.concurrency || 1);
  const concurrency = Number.isFinite(requestedConcurrency) ? Math.max(1, Math.min(requestedConcurrency, 4)) : 1;

  ensureDir(path.join('tools', 'jobState'));
  const steps = stepList(only);
  const files = discoverInputs(inputDir);

  if (!files.length) {
    console.log(`No source files found in ${inputDir}`);
    return;
  }

  const jobs = files.map((input) => {
    const base = path.basename(input, path.extname(input));
    const docId = slugify(base);
    return {
      input,
      docId,
      courseId: slugify(base),
      title: titleCase(base),
      lessons,
    };
  });

  if (requestedConcurrency !== concurrency) {
    console.log(`Concurrency capped at ${concurrency} for local Ollama stability.`);
  }

  await runWithConcurrency(jobs, concurrency, async (job) => {
    console.log(`\n== Processing ${job.docId} ==`);
    await processJob(job, steps, resume, model);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
