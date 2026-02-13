export function getRoute(defaultCourseId) {
  const p = new URLSearchParams(location.search);
  return {
    courseId: p.get('course') || defaultCourseId,
    locale: p.get('lang') || null,
    lessonId: decodeURIComponent((location.hash || '').replace('#', '')).trim() || null,
  };
}

export function setCourse(courseId) {
  const p = new URLSearchParams(location.search);
  p.set('course', courseId);
  history.replaceState(null, '', `?${p.toString()}${location.hash}`);
}

export function setLanguage(locale) {
  const p = new URLSearchParams(location.search);
  p.set('lang', locale);
  history.replaceState(null, '', `?${p.toString()}${location.hash}`);
}

export function setLessonHash(lessonId) {
  history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(lessonId)}`);
}
