#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs, ensureDir, writeJson } = require('./common');

async function extractTextFromPdf(inputPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (error) {
    throw new Error('pdf-parse dependency is required for PDF ingest. Install dependencies with npm install.');
  }

  const dataBuffer = fs.readFileSync(inputPath);
  const parsed = await pdfParse(dataBuffer);
  return String(parsed.text || '').trim();
}

function isHeading(line) {
  const clean = line.trim();
  if (!clean) return false;
  if (/^#{1,6}\s+/.test(clean)) return true;
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(clean)) return true;
  return clean.length <= 100 && /^[A-Z][A-Za-z0-9\s\-:/()]+$/.test(clean) && !/[.;:,]$/.test(clean);
}

function findCutPoint(blockText, targetLength) {
  const windowText = blockText.slice(0, targetLength + 200);
  const headingMatch = windowText.match(/\n(?=#{1,6}\s|\d+(?:\.\d+)*\s+[A-Z])/g);
  if (headingMatch && headingMatch.length) {
    const idx = windowText.lastIndexOf('\n', targetLength);
    if (idx > targetLength * 0.6) return idx;
  }

  const paragraphCut = windowText.lastIndexOf('\n\n', targetLength);
  if (paragraphCut > targetLength * 0.6) return paragraphCut + 2;

  const lineCut = windowText.lastIndexOf('\n', targetLength);
  if (lineCut > targetLength * 0.6) return lineCut + 1;

  const spaceCut = windowText.lastIndexOf(' ', targetLength);
  if (spaceCut > targetLength * 0.6) return spaceCut + 1;
  return Math.min(targetLength, blockText.length);
}

function splitIntoBlocks(rawText) {
  const lines = rawText.split(/\r?\n/);
  const blocks = [];
  let inFence = false;
  let current = [];

  const flush = () => {
    const text = current.join('\n').trimEnd();
    if (text) blocks.push(text);
    current = [];
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      current.push(line);
      if (!inFence) flush();
      continue;
    }

    if (inFence) {
      current.push(line);
      continue;
    }

    if (isHeading(line)) {
      flush();
      blocks.push(line.trim());
      continue;
    }

    if (/^\s{4,}\S/.test(line)) {
      current.push(line);
      continue;
    }

    current.push(line);
  }
  flush();
  return blocks;
}

function chunkText(rawText, chunkSize = 2500, overlap = 200) {
  const blocks = splitIntoBlocks(rawText);
  const full = blocks.join('\n\n');
  const chunks = [];
  let start = 0;

  while (start < full.length) {
    const remaining = full.slice(start);
    if (remaining.length <= chunkSize) {
      chunks.push({ start, end: full.length, text: remaining.trim() });
      break;
    }

    const cut = findCutPoint(remaining, chunkSize);
    const end = start + cut;
    chunks.push({ start, end, text: full.slice(start, end).trim() });
    start = Math.max(0, end - overlap);
  }

  return chunks
    .filter((c) => c.text)
    .map((chunk, i) => ({
      chunkId: `c${i + 1}`,
      text: chunk.text,
      start: chunk.start,
      end: chunk.end,
    }));
}

async function main() {
  const args = parseArgs(process.argv);
  const input = args.input;
  const docId = args.docId;

  if (!input || !docId) {
    throw new Error('Usage: node tools/ingest.js --input "sources/book.pdf" --docId linuxbook1');
  }

  const absInput = path.resolve(input);
  const ext = path.extname(absInput).toLowerCase();
  let rawText;

  if (ext === '.pdf') {
    rawText = await extractTextFromPdf(absInput);
  } else if (ext === '.txt' || ext === '.md') {
    rawText = fs.readFileSync(absInput, 'utf8');
  } else {
    throw new Error(`Unsupported input type: ${ext}. Expected .pdf, .txt, or .md`);
  }

  const outDir = path.join('artifacts', docId);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'raw.txt'), `${rawText.trim()}\n`);

  const chunks = chunkText(rawText);
  writeJson(path.join(outDir, 'chunks.json'), chunks);

  console.log(`Ingested ${input} into ${outDir} (${chunks.length} chunks)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
