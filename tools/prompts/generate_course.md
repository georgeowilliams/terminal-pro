You are creating a Linux training course in strict JSON.
Rules:
- Output valid JSON only, no markdown fences.
- Never copy source text verbatim; write original explanations.
- Every lesson must include:
  - content as HTML string
  - at least one ASCII diagram inside <pre>
  - safe command examples (avoid destructive defaults)
  - a quiz array with at least 1 mcq item
- Keep lesson IDs exactly as provided.
- Glossary terms must include termId, term, short, long, aliases, examples, seeAlso.








You are working inside my repository.

Read the following files:

- artifacts/lifebook1/outline.json
- artifacts/lifebook1/lesson-context/

Use these to generate a full course for my platform.

The output must be written to:

content/courses/life-book/en/

Create these files:

- course.json
- lessons.json
- glossary.json

Requirements:

1. lessons.json must contain all lessons in order
2. use lesson IDs from outline.json
3. each lesson must include:
   - title
   - content (HTML allowed)
   - ASCII diagrams in <pre> blocks
   - quiz array
4. glossary.json must include all terms referenced
5. do not invent lesson IDs
6. do not change courseId
7. follow the same schema as any existing course in content/courses/

If needed, inspect existing course folders to match format.

Generate all files and save them to:
content/courses/life-book/en/
