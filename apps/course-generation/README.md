# course-generation

Course generation pipeline extracted into its own folder.

## Install

```bash
npm install
```

## Commands

- `npm run ingest -- --input "sources/linux.pdf" --docId linuxbook1`
- `npm run extract -- --docId linuxbook1`
- `npm run outline -- --docId linuxbook1 --courseId linux-terminal --title "Linux Terminal Expert" --lessons 40`
- `npm run context -- --docId linuxbook1`
- `npm run batch -- --input sources`
- `npm run generate -- --outline artifacts/linuxbook1/outline.json --courseId linux-terminal --model gpt-5 --outDir ../terminal-pro/content/courses/linux-terminal/en`
