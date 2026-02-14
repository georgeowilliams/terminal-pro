const V2 = {
  practiceMode: "terminalCourse.v2.practiceMode",
  complete: "terminalCourse.v2.completedLessons",
  lessonPrefix: "terminalCourse.v2.lesson.",
};

export const keyFor = (courseId) => ({
  practiceMode: `terminalCourse.v3.${courseId}.practiceMode`,
  complete: `terminalCourse.v3.${courseId}.completedLessons`,
  lessonPrefix: `terminalCourse.v3.${courseId}.lesson.`,
});

export const LANGUAGE_KEY = 'terminalCourse.v3.lang';

export function migrateV2ToV3(courseId, lessons) {
  const v3 = keyFor(courseId);
  if (localStorage.getItem(v3.complete) || localStorage.getItem(v3.practiceMode)) return;
  const practice = localStorage.getItem(V2.practiceMode);
  const complete = localStorage.getItem(V2.complete);
  if (practice != null) localStorage.setItem(v3.practiceMode, practice);
  if (complete) localStorage.setItem(v3.complete, complete);
  lessons.forEach((l) => {
    const oldK = `${V2.lessonPrefix}${l.id}.quizState`;
    const oldVal = localStorage.getItem(oldK);
    if (oldVal != null) localStorage.setItem(`${v3.lessonPrefix}${l.id}.quizState`, oldVal);
  });
}

export const readJson = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); } catch { return fallback; } };
export const writeJson = (k, v) => localStorage.setItem(k, JSON.stringify(v));
