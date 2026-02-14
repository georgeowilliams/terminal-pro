const indexCache = { value: null };
const courseCache = new Map();

async function fetchJson(url, { optional = false } = {}) {
  const response = await fetch(url);
  if (!response.ok) {
    if (optional && response.status === 404) return null;
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

function resolveJsonPath(basePath, relativePath) {
  return new URL(relativePath, new URL(basePath, window.location.origin)).pathname;
}

function normalizeIndexEntry(item) {
  if (!item || typeof item !== 'object') return null;

  if (item.courseId && item.defaultLocale) {
    return {
      courseId: item.courseId,
      defaultLocale: item.defaultLocale,
      locales: Array.isArray(item.locales) && item.locales.length ? item.locales : [item.defaultLocale],
      paths: item.paths || {},
      path: item.path,
    };
  }

  if (item.id && item.path) {
    return {
      courseId: item.id,
      defaultLocale: 'en',
      locales: ['en'],
      path: item.path,
      paths: { en: item.path },
    };
  }

  return null;
}

function resolveCourseJsonPath(entry, locale) {
  if (entry.paths && entry.paths[locale]) return entry.paths[locale];
  if (entry.path) return entry.path;
  return `/content/courses/${entry.courseId}/${locale}/course.json`;
}

export async function loadCourseIndex() {
  if (indexCache.value) return indexCache.value;

  let list;
  try {
    list = await fetchJson('/content/courses/index.json');
  } catch (error) {
    list = await fetchJson('/courses/index.json');
  }

  if (!Array.isArray(list)) {
    throw new Error('Invalid content/courses/index.json: expected an array');
  }

  const normalized = list.map(normalizeIndexEntry).filter(Boolean);
  if (!normalized.length) {
    throw new Error('Invalid content/courses/index.json: no usable course entries');
  }

  indexCache.value = normalized;
  return normalized;
}

export const loadCourseList = loadCourseIndex;

async function loadCourseMeta(entry, locale) {
  const courseJsonPath = resolveCourseJsonPath(entry, locale);
  const meta = await fetchJson(courseJsonPath, { optional: locale !== entry.defaultLocale });
  if (meta) {
    return { meta, localeUsed: locale, basePath: courseJsonPath };
  }
  const fallbackPath = resolveCourseJsonPath(entry, entry.defaultLocale);
  const fallbackMeta = await fetchJson(fallbackPath);
  return { meta: fallbackMeta, localeUsed: entry.defaultLocale, basePath: fallbackPath };
}

export async function loadCourse(courseId, locale) {
  const cacheKey = `${courseId}:${locale}`;
  if (courseCache.has(cacheKey)) return courseCache.get(cacheKey);

  const index = await loadCourseIndex();
  const entry = index.find((item) => item.courseId === courseId) || index[0];
  if (!entry) throw new Error('No courses found in content/courses/index.json');

  const requestedLocale = locale || entry.defaultLocale;
  const { meta, localeUsed, basePath } = await loadCourseMeta(entry, requestedLocale);
  const lessonsPath = resolveJsonPath(basePath, meta?.files?.lessons || './lessons.json');
  const glossaryPath = resolveJsonPath(basePath, meta?.files?.glossary || './glossary.json');

  let lessons = await fetchJson(lessonsPath, { optional: localeUsed !== entry.defaultLocale });
  let glossary = await fetchJson(glossaryPath, { optional: localeUsed !== entry.defaultLocale });

  const fallbacks = { lessons: localeUsed, glossary: localeUsed };
  if (!lessons || !glossary) {
    const fallbackBasePath = resolveCourseJsonPath(entry, entry.defaultLocale);
    if (!lessons) {
      lessons = await fetchJson(resolveJsonPath(fallbackBasePath, meta?.files?.lessons || './lessons.json'));
      fallbacks.lessons = entry.defaultLocale;
    }
    if (!glossary) {
      glossary = await fetchJson(resolveJsonPath(fallbackBasePath, meta?.files?.glossary || './glossary.json'));
      fallbacks.glossary = entry.defaultLocale;
    }
  }

  const payload = {
    meta,
    lessons,
    glossary,
    courseId: entry.courseId,
    defaultLocale: entry.defaultLocale,
    availableLocales: entry.locales || [entry.defaultLocale],
    locale: localeUsed,
    requestedLocale,
    fallbacks,
  };

  courseCache.set(cacheKey, payload);
  return payload;
}
