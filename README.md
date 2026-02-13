# terminal-pro

## Local Development

```bash
npm install
npm run dev
```

Open: http://localhost:5173

### Why not `file://`?

This project uses JavaScript ES modules (`type="module"`). Browsers enforce stricter security rules for modules, so opening `index.html` directly with `file://` can block imports and cause CORS-related loading errors.

Running the app through a local server provides the required `http://` origin, so modules, styles, and deep links all load correctly.

## Local course generation pipeline

Publisher-controlled pipeline scripts are available under `tools/`:

1. Ingest source docs:
   - `node tools/ingest.js --input "sources/linux.pdf" --docId linuxbook1`
2. Build deterministic outline:
   - `node tools/build-outline.js --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40 --out artifacts/linuxbook1/outline.json`
3. Generate JSON course content via hosted model:
   - `OPENAI_API_KEY=... node tools/generate-course.js --outline artifacts/linuxbook1/outline.json --courseId linux-terminal --model gpt-5 --outDir content/courses/linux-terminal/en`
4. Validate generated JSON:
   - `node tools/validateContent.js --dir content/courses/linux-terminal/en`
5. Batch all docs in `sources/`:
   - `OPENAI_API_KEY=... node tools/batch.js --input sources --concurrency 2`
