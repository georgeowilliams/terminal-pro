# terminal-pro

## Local Development

```bash
npm install
npm run dev
```

Open: <http://localhost:5173>

## Local LLM (Ollama)

The extraction step uses a local LLM via Ollama to analyze textbook chunks and extract concepts and commands.

1. Install Ollama: <https://ollama.com/download>
2. Pull model (recommended for this laptop):

```bash
ollama pull qwen2.5:3b
```

Fallback:

```bash
ollama pull phi3:mini
```

3. Start Ollama before extraction:

```bash
ollama run qwen2.5:3b
```

By default tools target `http://127.0.0.1:11434` (IPv4). Override with:

```bash
OLLAMA_URL=http://127.0.0.1:11434
```

Windows tip: if local requests fail unexpectedly, set:

```bash
set NO_PROXY=127.0.0.1,localhost
```

## Available npm commands

Use these scripts from the project root:

- `npm run dev` (or `npm start`) — run the local server.
- `npm run ingest -- --input "sources/linux.pdf" --docId linuxbook1` — ingest source docs.
- `npm run extract -- --docId linuxbook1` — extract concepts from ingested sources (requires Ollama running).
- `npm run extract -- --docId lifebook1 --model phi3:mini` — fast extraction with a smaller local model.
- `npm run extract -- --docId lifebook1 --maxChars 1400 --maxPredict 192` — extraction with tighter prompt/response limits.
- `npm run outline -- --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40` — build deterministic course outline.
- `npm run outline -- --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40 --out artifacts/linuxbook1/outline-custom.json` — optional custom output path.
- `npm run context -- --docId linuxbook1` — build lesson context files for manual prompting.
- `npm run validate -- --dir content/courses/linux-terminal/en` — validate generated course JSON.
- `npm run batch -- --input sources --concurrency 1` — run ingest → extract → outline → context for all docs (default/conservative concurrency is 1 for Ollama stability).

## Workflow

`PDF → ingest → extract → outline → lesson context → manual Codex prompt → course JSON → platform`

During extraction, the CLI shows a live progress bar with chunk progress, per-chunk timing, average time, and ETA so long CPU runs are visibly active.

Place PDFs into `/sources/`.

Generated artifacts appear in `/artifacts/<docId>/`.
