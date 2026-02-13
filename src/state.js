import { keyFor, readJson } from "./storage.js";

export function createState(course) {
  const keys = keyFor(course.meta.id);
  return {
    course,
    keys,
    filterTag: "All",
    search: "",
    visible: [],
    currentIndex: 0,
    practiceMode: localStorage.getItem(keys.practiceMode) === "1",
    completedLessons: new Set(readJson(keys.complete, [])),
    drillSeed: null,
  };
}
