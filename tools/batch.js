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

function discoverInputs(inputDir) {
  return fs.readdirSync(inputDir)
    .filter((file) => ['.pdf', '.txt', '.md'].includes(path.extname(file).toLowerCase()))
    .map((file) => path.join(inputDir, file));
}

function nextJobs(inputDir) {
  return discoverInputs(inputDir).map((fullPath) => {
    const base = path.basename(fullPath, path.extname(fullPath));
    return {
      input: fullPath,
      docId: slugify(base),
      courseId: slugify(base),
      title: base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    };
  });
}

async function processJob(job, model) {
  const statePath = path.join('tools', 'jobState', `${job.docId}.json`);
  const state = fs.existsSync(statePath) ? readJson(statePath) : { completed: [] };
  const done = new Set(state.completed || []);

  if (!done.has('ingest')) {
    await runNode('tools/ingest.js', ['--input', job.input, '--docId', job.docId]);
    done.add('ingest');
    writeJson(statePath, { ...job, completed: [...done] });
  }
  if (!done.has('outline')) {
    await runNode('tools/build-outline.js', ['--docId', job.docId, '--courseId', job.courseId, '--title', job.title, '--lessons', '40', '--out', `artifacts/${job.docId}/outline.json`]);
    done.add('outline');
    writeJson(statePath, { ...job, completed: [...done] });
  }
  if (!done.has('generate')) {
    await runNode('tools/generate-course.js', ['--outline', `artifacts/${job.docId}/outline.json`, '--courseId', job.courseId, '--model', model, '--outDir', `content/courses/${job.courseId}/en`]);
    done.add('generate');
    writeJson(statePath, { ...job, completed: [...done] });
  }
  if (!done.has('validate')) {
    await runNode('tools/validateContent.js', ['--dir', `content/courses/${job.courseId}/en`]);
    done.add('validate');
    writeJson(statePath, { ...job, completed: [...done] });
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const input = args.input || 'sources';
  const concurrency = Number(args.concurrency || 2);
  const model = args.model || process.env.COURSE_MODEL || 'gpt-5';

  ensureDir(path.join('tools', 'jobState'));
  const jobs = nextJobs(input);
  if (!jobs.length) {
    console.log(`No source files found in ${input}`);
    return;
  }

  const queue = [...jobs];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      console.log(`\n== Processing ${job.docId} ==`);
      await processJob(job, model);
    }
  });

  await Promise.all(workers);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
