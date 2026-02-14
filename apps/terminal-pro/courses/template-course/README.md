# New course authoring

1. Copy `courses/template-course` to a new folder (for example `courses/my-course`).
2. Edit `course.json`, `lessons.json`, and `glossary.json` with your course data.
3. Add a new entry to `courses/index.json`:

```json
{
  "id": "my-course",
  "path": "/courses/my-course/course.json"
}
```

4. Open the app with `?course=my-course` to verify loading and routing.
