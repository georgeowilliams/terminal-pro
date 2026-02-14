# Monorepo layout

This repository is now split into two projects:

- `apps/terminal-pro` — the runtime web app
- `apps/course-generation` — the course generation pipeline/tooling

## Quick start

### Terminal Pro app

```bash
cd apps/terminal-pro
npm install
npm run dev
```

### Course generation

```bash
cd apps/course-generation
npm install
npm run batch -- --input sources
```
