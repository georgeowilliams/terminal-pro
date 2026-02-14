import { escapeHtml, seededPick } from "./utils/text.js";

export function createDailyDrillsHTML({ seed, glossary, allQuizQuestions, drillTasks }) {
  const term = seededPick(glossary, `${seed}:term`);
  const quizPick = seededPick(allQuizQuestions, `${seed}:quiz`);
  const task = seededPick(drillTasks, `${seed}:task`);
  return `<h2>Daily Drills</h2>
  <p>Seed for today: <code>${escapeHtml(seed)}</code></p>
  <div class="drill-task"><b>Glossary drill:</b> <span>${escapeHtml(term.term)}</span> — ${escapeHtml(term.short)}<br/>Use it in a command of your own.</div>
  <div class="drill-task"><b>Quiz drill:</b> ${escapeHtml(quizPick.lessonTitle)} — ${escapeHtml(quizPick.q.prompt)}</div>
  <div class="drill-task"><b>Tiny task:</b> ${escapeHtml(task)}</div>
  <button type="button" id="newDrillBtn">New set</button>`;
}
