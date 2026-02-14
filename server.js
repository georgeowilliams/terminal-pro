const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5173;
const rootDir = __dirname;
const canonicalCoursesDir = path.join(rootDir, 'content', 'courses');
const legacyCoursesDir = path.join(rootDir, 'courses');

function assertCourseDirectoryLayout() {
  const hasCanonical = fs.existsSync(canonicalCoursesDir);
  const hasLegacy = fs.existsSync(legacyCoursesDir);

  if (hasCanonical && hasLegacy) {
    throw new Error(
      'Ambiguous course directories: both content/courses (canonical) and courses (legacy) exist. Remove the legacy /courses directory.',
    );
  }

  if (!hasCanonical) {
    throw new Error('Missing canonical courses directory: content/courses');
  }
}

assertCourseDirectoryLayout();

app.use(express.static(rootDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Terminal Pro dev server running at http://localhost:${port}`);
});
