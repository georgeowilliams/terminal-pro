Generate ONE lesson JSON object with this shape:
{
  "id": "...",
  "module": "...",
  "title": "...",
  "tags": ["..."],
  "content": "<h2>...</h2>...",
  "quiz": [
    {
      "type": "mcq",
      "prompt": "...",
      "choices": ["...", "...", "..."],
      "answerIndex": 0,
      "explanation": "..."
    }
  ]
}
Constraints:
- JSON only.
- Original wording.
- Include one ASCII diagram in <pre>.
- Include safe command usage guidance.
