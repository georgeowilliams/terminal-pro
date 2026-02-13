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
