import { escapeHtml } from "./utils/text.js";

export function renderLayout(meta) {
  document.getElementById("brandTitle").textContent = meta.title;
  document.getElementById("brandSubtitle").textContent = meta.subtitle || "";
}

export function renderChips(tags, activeTag) {
  return tags.map((t) => `<button type="button" class="chip ${t===activeTag?"active":""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");
}

export function renderTOC(lessons, completionMap, currentId) {
  return lessons.map((l) => `<div class="toc-item ${l.id===currentId?"active":""}" data-id="${l.id}" tabindex="0"><div class="kicker">${escapeHtml(l.module)}</div><p class="title">${escapeHtml(l.title)}</p><div class="meta">${l.tags.map((t)=>`#${escapeHtml(t)}`).join(" ")} ${completionMap.has(l.id)?"✓":""}</div></div>`).join("");
}

export function renderLesson(lesson, bodyHtml, quizHtml) {
  return `${bodyHtml}${quizHtml}`;
}
