#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs, ensureDir, writeJson } = require('./common');

async function extractPdfPages(inputPath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (error) {
    throw new Error('pdf-parse dependency is required for PDF ingest. Install dependencies with npm install.');
  }

  const dataBuffer = fs.readFileSync(inputPath);
  const parsed = await pdfParse(dataBuffer);
  const pagesText = String(parsed.text || '').split(/\f+/g).map((text, i) => ({ page: i + 1, text: text.trim() })).filter((p) => p.text);
  if (pagesText.length) return pagesText;
  return [{ page: 1, text: String(parsed.text || '').trim() }];
}

function splitSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = { heading: 'Untitled', body: [] };
  const isHeading = (line) => {
    const clean = line.trim();
    if (!clean) return false;
    if (/^#{1,6}\s+/.test(clean)) return true;
    if (clean.length <= 80 && /^[A-Z][A-Za-z0-9\s\-/:()]+$/.test(clean) && !/[.;]$/.test(clean)) return true;
    return false;
  };

  for (const line of lines) {
    if (isHeading(line) && current.body.length) {
      sections.push(current);
      current = { heading: line.replace(/^#{1,6}\s+/, '').trim(), body: [] };
    } else if (isHeading(line) && !current.body.length) {
      current.heading = line.replace(/^#{1,6}\s+/, '').trim();
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push(current);
  return sections;
}

function chunkSection(sectionText, min = 2000, max = 3000, overlap = 200) {
  const blocks = sectionText.match(/```[\s\S]*?```|[^\n]+(?:\n|$)/g) || [sectionText];
  const chunks = [];
  let cursor = '';
  for (const block of blocks) {
    if ((cursor + block).length > max && cursor.length >= min) {
      chunks.push(cursor.trim());
      const tail = cursor.slice(Math.max(0, cursor.length - overlap));
      cursor = `${tail}\n${block}`;
    } else {
      cursor += block;
    }
  }
  if (cursor.trim()) chunks.push(cursor.trim());
  return chunks;
}

async function main() {
  const args = parseArgs(process.argv);
  const input = args.input;
  const docId = args.docId;
  if (!input || !docId) {
    throw new Error('Usage: node tools/ingest.js --input "sources/linux.pdf" --docId linuxbook1');
  }

  const absInput = path.resolve(input);
  const ext = path.extname(absInput).toLowerCase();
  let pages = [];

  if (ext === '.pdf') {
    pages = await extractPdfPages(absInput);
  } else if (ext === '.txt' || ext === '.md') {
    const text = fs.readFileSync(absInput, 'utf8');
    pages = [{ page: 1, text }];
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  const rawText = pages.map((p) => p.text).join('\n\n');
  const sections = splitSections(rawText);
  const chunks = [];
  let idx = 1;

  sections.forEach((section, sectionIndex) => {
    const scoped = `${section.heading}\n${section.body.join('\n')}`.trim();
    const pieceList = chunkSection(scoped);
    pieceList.forEach((piece) => {
      chunks.push({
        id: `${docId}-c${String(idx).padStart(4, '0')}`,
        section: section.heading,
        sectionIndex,
        text: piece,
      });
      idx += 1;
    });
  });

  const outDir = path.join('artifacts', docId);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'raw.txt'), rawText);
  writeJson(path.join(outDir, 'pages.json'), pages);
  writeJson(path.join(outDir, 'chunks.json'), chunks);

  console.log(`Ingested ${input} -> ${outDir} (${chunks.length} chunks)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
