# terminal-pro

## Local Development

```bash
npm install
npm run dev
```

Open: <http://localhost:5173>

## Canonical courses location

Terminal Pro only reads courses from:

- `content/courses` (canonical)

Guardrail: the dev server fails fast if both `content/courses` and legacy `courses` exist.

## Course discovery

The course dropdown is driven by `content/courses/index.json`.

Run this validation after syncing/generated content:

```bash
npm run check:courses
npm run check:courses -- <courseId>
```

Example:

```bash
npm run check:courses -- life-book
```

## Course generation

Generation tooling has been moved to the dedicated `course-generation` repository.
That repository outputs course files into this repo's canonical `content/courses` directory.
