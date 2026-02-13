terminal-pro
Local Development
npm install
npm run dev


Open: http://localhost:5173

Local LLM (Ollama)

The extraction step uses a local LLM via Ollama to analyze textbook chunks and extract concepts and commands.

Install Ollama

https://ollama.com/download

Pull model (recommended for this laptop)
ollama pull qwen2.5:3b


Fallback:

ollama pull phi3:mini

Start Ollama

Run before npm run extract:

ollama run qwen2.5:3b


Ollama runs locally at:

http://localhost:11434


Leave it running while using the pipeline.

Available npm commands

Use these scripts from the project root:

npm run dev (or npm start) — run the local server.

npm run ingest -- --input "sources/linux.pdf" --docId linuxbook1 — ingest source docs.

npm run extract -- --docId linuxbook1 — extract concepts from ingested sources (requires Ollama running).

npm run outline -- --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40 — build deterministic course outline.

npm run context -- --docId linuxbook1 — build lesson context files for manual prompting.

npm run validate -- --dir content/courses/linux-terminal/en — validate generated course JSON.

npm run batch -- --input sources --concurrency 1 — run ingest → extract → outline → context for all docs.

Workflow
PDF → ingest → extract → outline → lesson context → manual Codex prompt → course JSON → platform


Place PDFs into:

/sources/


Generated artifacts appear in:

/artifacts/<docId>/
