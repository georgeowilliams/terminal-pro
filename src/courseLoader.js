const listCache = { value: null };
const courseCache = new Map();
const metaCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.json();
}

function resolveJsonPath(basePath, relativePath) {
  return new URL(relativePath, new URL(basePath, window.location.origin)).pathname;
}

export async function loadCourseList() {
  if (listCache.value) return listCache.value;
  const list = await fetchJson('/courses/index.json');
  if (!Array.isArray(list)) {
    throw new Error('Invalid courses/index.json: expected an array');
  }
  listCache.value = list;
  return list;
}

export async function loadCourseMeta(courseId) {
  if (metaCache.has(courseId)) return metaCache.get(courseId);
  const list = await loadCourseList();
  const entry = list.find((item) => item.id === courseId) || list[0];
  if (!entry?.path) throw new Error(`Course not found: ${courseId}`);
  const meta = await fetchJson(entry.path);
  metaCache.set(entry.id, meta);
  return meta;
}

export async function loadCourse(courseId) {
  if (courseCache.has(courseId)) return courseCache.get(courseId);

  const list = await loadCourseList();
  const entry = list.find((item) => item.id === courseId) || list[0];
  if (!entry?.path) throw new Error(`Course not found: ${courseId}`);

  const meta = await loadCourseMeta(entry.id);
  const lessonsPath = resolveJsonPath(entry.path, meta?.files?.lessons || './lessons.json');
  const glossaryPath = resolveJsonPath(entry.path, meta?.files?.glossary || './glossary.json');

  const [lessons, glossary] = await Promise.all([fetchJson(lessonsPath), fetchJson(glossaryPath)]);

  const payload = { meta, lessons, glossary };
  courseCache.set(meta.id, payload);
  if (meta.id !== courseId) courseCache.set(courseId, payload);
  return payload;
}
