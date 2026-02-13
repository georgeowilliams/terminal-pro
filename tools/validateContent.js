const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function unique(list) {
  return new Set(list).size === list.length;
}

function validateCourse(entry, errors, warnings) {
  const defaultCoursePath = entry.pathPattern.replace('{locale}', entry.defaultLocale).replace(/^\//, '');
  const defaultCourse = readJson(defaultCoursePath);
  const defaultBaseDir = path.dirname(defaultCoursePath);
  const defaultLessonsPath = path.join(defaultBaseDir, defaultCourse.files?.lessons || 'lessons.json');
  const defaultGlossaryPath = path.join(defaultBaseDir, defaultCourse.files?.glossary || 'glossary.json');

  const defaultLessons = readJson(defaultLessonsPath);
  const defaultGlossary = readJson(defaultGlossaryPath);
  const defaultLessonIds = defaultLessons.map((lesson) => lesson.id);
  const defaultTermIds = defaultGlossary.map((term) => term.termId);

  if (!unique(defaultLessonIds)) errors.push(`[${entry.courseId}] Duplicate lesson ids in default locale ${entry.defaultLocale}`);
  if (!unique(defaultTermIds)) errors.push(`[${entry.courseId}] Duplicate glossary termIds in default locale ${entry.defaultLocale}`);

  const defaultTermSet = new Set(defaultTermIds);
  defaultGlossary.forEach((term) => {
    (term.seeAlso || []).forEach((related) => {
      if (!defaultTermSet.has(related)) {
        errors.push(`[${entry.courseId}] Invalid seeAlso reference '${related}' in default locale term '${term.termId}'`);
      }
    });
  });

  entry.locales.forEach((locale) => {
    const coursePath = entry.pathPattern.replace('{locale}', locale).replace(/^\//, '');
    if (!exists(coursePath)) {
      warnings.push(`[${entry.courseId}] Missing locale file: ${coursePath}`);
      return;
    }

    const course = readJson(coursePath);
    const baseDir = path.dirname(coursePath);
    const lessonsPath = path.join(baseDir, course.files?.lessons || 'lessons.json');
    const glossaryPath = path.join(baseDir, course.files?.glossary || 'glossary.json');

    if (!exists(lessonsPath)) {
      warnings.push(`[${entry.courseId}] Missing lessons file for locale '${locale}': ${lessonsPath}`);
      return;
    }
    if (!exists(glossaryPath)) {
      warnings.push(`[${entry.courseId}] Missing glossary file for locale '${locale}': ${glossaryPath}`);
      return;
    }

    const lessons = readJson(lessonsPath);
    const glossary = readJson(glossaryPath);

    const lessonIds = lessons.map((lesson) => lesson.id);
    const termIds = glossary.map((term) => term.termId);

    if (!unique(lessonIds)) errors.push(`[${entry.courseId}] Duplicate lesson ids in locale '${locale}'`);
    if (!unique(termIds)) errors.push(`[${entry.courseId}] Duplicate termIds in locale '${locale}'`);

    const lessonSet = new Set(lessonIds);
    const termSet = new Set(termIds);

    const missingLessons = defaultLessonIds.filter((id) => !lessonSet.has(id));
    const extraLessons = lessonIds.filter((id) => !defaultLessonIds.includes(id));
    if (missingLessons.length) warnings.push(`[${entry.courseId}] Locale '${locale}' missing lesson IDs: ${missingLessons.join(', ')}`);
    if (extraLessons.length) errors.push(`[${entry.courseId}] Locale '${locale}' has extra lesson IDs not in default locale: ${extraLessons.join(', ')}`);

    const missingTerms = defaultTermIds.filter((id) => !termSet.has(id));
    const extraTerms = termIds.filter((id) => !defaultTermIds.includes(id));
    if (missingTerms.length) warnings.push(`[${entry.courseId}] Locale '${locale}' missing glossary termIds: ${missingTerms.join(', ')}`);
    if (extraTerms.length) errors.push(`[${entry.courseId}] Locale '${locale}' has extra glossary termIds not in default locale: ${extraTerms.join(', ')}`);

    glossary.forEach((term) => {
      (term.seeAlso || []).forEach((related) => {
        if (!termSet.has(related) && !defaultTermSet.has(related)) {
          errors.push(`[${entry.courseId}] Invalid seeAlso reference '${related}' in locale '${locale}' term '${term.termId}'`);
        }
      });
    });
  });
}

function main() {
  const errors = [];
  const warnings = [];
  const indexPath = 'content/courses/index.json';

  if (!exists(indexPath)) {
    console.error(`Missing ${indexPath}`);
    process.exit(1);
  }

  const index = readJson(indexPath);
  if (!Array.isArray(index)) {
    console.error('content/courses/index.json must be an array.');
    process.exit(1);
  }

  index.forEach((entry) => validateCourse(entry, errors, warnings));

  warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
  errors.forEach((error) => console.error(`ERROR: ${error}`));

  if (errors.length) {
    console.error(`\nValidation failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  console.log(`Validation passed with ${warnings.length} warning(s).`);
}

main();
