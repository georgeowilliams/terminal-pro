import { loadCourse, loadCourseIndex } from './courseLoader.js';
import { createState } from './state.js';
import { LANGUAGE_KEY, keyFor, migrateV2ToV3, readJson, writeJson } from './storage.js';
import { getRoute, setCourse, setLanguage, setLessonHash } from './router.js';
import { renderLayout, renderChips, renderTOC, renderLesson } from './render.js';
import { annotateTerms } from './annotate.js';
import { createTooltipController } from './tooltip.js';
import { renderQuizSection, attachQuizHandlers } from './quiz.js';
import { createDailyDrillsHTML } from './drills.js';
import { $ } from './utils/dom.js';
import { escapeHtml, stripHtml } from './utils/text.js';

const els = ['toc', 'title', 'kicker', 'content', 'prevBtn', 'nextBtn', 'bar', 'footerLeft', 'footerRight', 'search', 'chiprow', 'count', 'practiceToggle', 'resetProgressBtn', 'completeBtn', 'courseSelect', 'languageSelect'].reduce((acc, id) => ((acc[id] = $(id)), acc), {});

let state;
let glossary = [];
let aliasIndex = new Map();
let tooltip;
let courseEntries = [];
let currentLocale = 'en';

const specialLessons = [
  { id: 'daily-drills', module: '15. Reference', title: 'Daily Drills', tags: ['reference', 'practice'], content: '' },
  { id: 'glossary', module: '16. Reference', title: 'Glossary', tags: ['reference', 'fundamentals'], content: '' },
];

function uniqueTags(allLessons) {
  const s = new Set();
  allLessons.forEach((l) => l.tags.forEach((t) => s.add(t)));
  return ['All', ...Array.from(s).sort()];
}
function normalizeTermId(raw) {
  return aliasIndex.get(String(raw || '').toLowerCase()) || null;
}
function lessonStorageKey(lessonId) {
  return `${state.keys.lessonPrefix}${lessonId}.quizState`;
}
function readQuizState(lessonId) {
  return readJson(lessonStorageKey(lessonId), {});
}
function writeQuizState(lessonId, payload) {
  writeJson(lessonStorageKey(lessonId), payload);
}
function saveCompleted() {
  writeJson(state.keys.complete, Array.from(state.completedLessons));
}
function allLessons() {
  return [...state.course.lessons, ...specialLessons];
}
function currentLesson() {
  return state.visible[state.currentIndex] || state.visible[0] || null;
}

function setPracticeMode(on) {
  state.practiceMode = !!on;
  localStorage.setItem(state.keys.practiceMode, on ? '1' : '0');
  document.body.classList.toggle('practice-on', state.practiceMode);
  els.practiceToggle.textContent = `Practice Mode: ${state.practiceMode ? 'ON' : 'OFF'}`;
}

function createGlossaryPageHTML() {
  return '<h2>Glossary</h2><p>Search terms and open mini wiki cards.</p><div class="glossary-wrap"><input id="glossarySearch" class="glossary-search" placeholder="Search glossary terms..." /><div id="glossaryList" class="glossary-list"></div><div id="glossaryEmpty" class="glossary-empty" style="display:none;">No matching terms.</div></div>';
}

function bindGlossaryPage() {
  const box = $('glossarySearch');
  const list = $('glossaryList');
  const empty = $('glossaryEmpty');
  if (!box || !list) return;
  const render = () => {
    const q = box.value.trim().toLowerCase();
    const filtered = glossary.filter((item) => [item.display, ...(item.aliases || []), item.short, item.long].join(' ').toLowerCase().includes(q) || !q);
    list.innerHTML = '';
    empty.style.display = filtered.length ? 'none' : 'block';
    filtered.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'glossary-item';
      btn.type = 'button';
      btn.textContent = item.display;
      btn.addEventListener('click', () => tooltip.open(item.termId, btn, { centered: true }));
      list.appendChild(btn);
    });
  };
  box.addEventListener('input', render);
  render();
}

function applyFilters() {
  const q = state.search.trim().toLowerCase();
  const currentId = currentLesson()?.id;
  state.visible = allLessons().filter((l) => {
    const mt = state.filterTag === 'All' || l.tags.includes(state.filterTag);
    const base =
      l.id === 'glossary'
        ? createGlossaryPageHTML()
        : l.id === 'daily-drills'
          ? createDailyDrillsHTML({ seed: state.drillSeed || new Date().toISOString().slice(0, 10), glossary, allQuizQuestions: state.course.lessons.flatMap((lesson) => (lesson.quiz || []).map((qq) => ({ lessonTitle: lesson.title, q: qq }))), drillTasks: state.drillTasks })
          : l.content;
    const ms = !q || [l.module, l.title, l.tags.join(' '), stripHtml(base)].join(' ').toLowerCase().includes(q);
    return mt && ms;
  });
  const fallbackIndex = Math.max(0, state.visible.findIndex((l) => l.id === currentId));
  state.currentIndex = fallbackIndex >= 0 ? fallbackIndex : 0;
  renderAll();
}

function renderAll() {
  const l = currentLesson();
  if (!l) {
    els.toc.innerHTML = '<div class="muted">No lessons match your filters.</div>';
    els.content.innerHTML = '';
    return;
  }
  els.toc.innerHTML = renderTOC(state.visible, state.completedLessons, l.id);
  els.count.textContent = `${state.visible.length} lessons`;
  els.kicker.textContent = l.module;
  els.title.textContent = l.title;
  const done = state.completedLessons.size;
  const pct = Math.round((done / Math.max(1, state.course.lessons.length)) * 100);
  els.bar.style.width = `${pct}%`;

  const raw = l.id === 'glossary' ? createGlossaryPageHTML() : l.id === 'daily-drills' ? createDailyDrillsHTML({ seed: state.drillSeed || new Date().toISOString().slice(0, 10), glossary, allQuizQuestions: state.course.lessons.flatMap((lesson) => (lesson.quiz || []).map((q) => ({ lessonTitle: lesson.title, q }))), drillTasks: state.drillTasks }) : l.content;
  const annotated = annotateTerms(raw, glossary, { lessonId: l.id, courseId: state.course.meta.id, normalizeTermId });
  const quizHtml = l.quiz ? renderQuizSection(l.id, l.quiz, readQuizState(l.id), (h, suf) => annotateTerms(h, glossary, { lessonId: `${l.id}-${suf}`, courseId: state.course.meta.id, normalizeTermId })) : '';
  els.content.innerHTML = renderLesson(l, annotated, quizHtml);
  els.footerLeft.textContent = `${state.currentIndex + 1} / ${state.visible.length}`;
  els.footerRight.innerHTML = `${l.tags.map((t) => `<span class="pill">#${escapeHtml(t)}</span>`).join(' ')}`;
  els.completeBtn.textContent = state.completedLessons.has(l.id) ? 'Completed ✓' : 'Mark complete ✓';
  if (l.id === 'glossary') bindGlossaryPage();
  setLessonHash(l.id);
}

function selectPreferredLocale(entry, routeLocale) {
  if (routeLocale && entry.locales.includes(routeLocale)) return routeLocale;
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored && entry.locales.includes(stored)) return stored;
  return entry.defaultLocale;
}

async function loadAndRenderCourse(courseId, locale, lessonToKeep = null) {
  const payload = await loadCourse(courseId, locale);
  const course = { meta: payload.meta, lessons: payload.lessons };
  glossary = payload.glossary;
  currentLocale = payload.requestedLocale;

  aliasIndex = new Map();
  glossary.forEach((item) => [item.display, ...(item.aliases || []), item.termId].forEach((a) => aliasIndex.set(String(a).toLowerCase(), item.termId)));

  migrateV2ToV3(course.meta.id, course.lessons);
  state = createState(course);
  state.keys = keyFor(course.meta.id);
  state.drillTasks = course.meta.drillTasks || [];

  renderLayout(course.meta);
  setPracticeMode(state.practiceMode);
  tooltip = createTooltipController({ glossary, normalizeTermId });
  state.visible = allLessons();
  const targetLessonId = lessonToKeep || getRoute(course.meta.id).lessonId;
  if (targetLessonId) {
    const idx = state.visible.findIndex((l) => l.id === targetLessonId);
    state.currentIndex = idx >= 0 ? idx : 0;
  }
  els.courseSelect.value = payload.courseId;
  els.languageSelect.value = currentLocale;
  applyFilters();
}

async function initSelectors() {
  courseEntries = await loadCourseIndex();
  els.courseSelect.innerHTML = courseEntries.map((entry) => `<option value="${entry.courseId}">${escapeHtml(entry.courseId)}</option>`).join('');

  const route = getRoute(courseEntries[0]?.courseId || 'linux-terminal');
  const activeCourseId = courseEntries.find((item) => item.courseId === route.courseId)?.courseId || courseEntries[0]?.courseId;
  const activeEntry = courseEntries.find((item) => item.courseId === activeCourseId);
  const preferredLocale = selectPreferredLocale(activeEntry, route.locale);

  els.languageSelect.innerHTML = activeEntry.locales.map((loc) => `<option value="${loc}">${loc.toUpperCase()}</option>`).join('');

  els.courseSelect.addEventListener('change', async (e) => {
    const selectedCourseId = e.target.value;
    const selectedEntry = courseEntries.find((item) => item.courseId === selectedCourseId);
    const nextLocale = selectPreferredLocale(selectedEntry, null);
    els.languageSelect.innerHTML = selectedEntry.locales.map((loc) => `<option value="${loc}">${loc.toUpperCase()}</option>`).join('');
    els.languageSelect.value = nextLocale;
    setCourse(selectedCourseId);
    setLanguage(nextLocale);
    localStorage.setItem(LANGUAGE_KEY, nextLocale);
    await loadAndRenderCourse(selectedCourseId, nextLocale);
    els.chiprow.innerHTML = renderChips(uniqueTags(allLessons()), state.filterTag);
  });

  els.languageSelect.addEventListener('change', async (e) => {
    const nextLocale = e.target.value;
    localStorage.setItem(LANGUAGE_KEY, nextLocale);
    setLanguage(nextLocale);
    await loadAndRenderCourse(state.course.meta.id, nextLocale, currentLesson()?.id);
    els.chiprow.innerHTML = renderChips(uniqueTags(allLessons()), state.filterTag);
  });

  return { activeCourseId, preferredLocale };
}

function bindEvents() {
  els.chiprow.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filterTag = chip.dataset.tag;
    els.chiprow.innerHTML = renderChips(uniqueTags(allLessons()), state.filterTag);
    applyFilters();
  });
  els.search.addEventListener('input', (e) => {
    state.search = e.target.value;
    applyFilters();
  });
  els.toc.addEventListener('click', (e) => {
    const item = e.target.closest('.toc-item');
    if (!item) return;
    const idx = state.visible.findIndex((l) => l.id === item.dataset.id);
    if (idx >= 0) {
      state.currentIndex = idx;
      renderAll();
    }
  });
  els.prevBtn.addEventListener('click', () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderAll();
    }
  });
  els.nextBtn.addEventListener('click', () => {
    if (state.currentIndex < state.visible.length - 1) {
      state.currentIndex += 1;
      renderAll();
    }
  });
  els.completeBtn.addEventListener('click', () => {
    const l = currentLesson();
    if (!l) return;
    state.completedLessons.add(l.id);
    saveCompleted();
    renderAll();
  });
  els.practiceToggle.addEventListener('click', () => {
    setPracticeMode(!state.practiceMode);
    renderAll();
  });
  els.resetProgressBtn.addEventListener('click', () => {
    if (!confirm('Reset all completion and quiz progress?')) return;
    state.completedLessons = new Set();
    saveCompleted();
    state.course.lessons.forEach((l) => localStorage.removeItem(lessonStorageKey(l.id)));
    renderAll();
  });
  els.content.addEventListener('click', (e) => {
    const term = e.target.closest('.term');
    if (term) tooltip.open(term.dataset.termId, term);
    if (e.target.id === 'newDrillBtn') {
      state.drillSeed = `${Date.now()}`;
      renderAll();
    }
  });
  els.content.addEventListener('mouseover', (e) => {
    const term = e.target.closest('.term');
    if (term && matchMedia('(hover: hover)').matches) tooltip.open(term.dataset.termId, term);
  });
  els.content.addEventListener('keydown', (e) => {
    const term = e.target.closest('.term');
    if (term && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      tooltip.open(term.dataset.termId, term);
    }
  });
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (!typing && e.key === '/') {
      e.preventDefault();
      els.search.focus();
    }
    if (e.key === 'Escape') tooltip?.close();
    if (typing) return;
    if (e.key === 'ArrowLeft') els.prevBtn.click();
    if (e.key === 'ArrowRight') els.nextBtn.click();
    if (e.key.toLowerCase() === 'j') els.nextBtn.click();
    if (e.key.toLowerCase() === 'k') els.prevBtn.click();
  });

  attachQuizHandlers(els.content, {
    getLesson: () => currentLesson(),
    readQuizState,
    writeQuizState,
    onStateChange: () => {
      const l = currentLesson();
      if (l?.quiz?.length) {
        const s = readQuizState(l.id);
        if (l.quiz.every((q, i) => (q.type === 'mcq' ? s[i]?.checked : s[i]?.revealed))) state.completedLessons.add(l.id);
        saveCompleted();
      }
      renderAll();
    },
  });
}

async function boot() {
  bindEvents();
  const { activeCourseId, preferredLocale } = await initSelectors();
  const route = getRoute(activeCourseId || 'linux-terminal');
  try {
    await loadAndRenderCourse(route.courseId || activeCourseId, preferredLocale);
    els.chiprow.innerHTML = renderChips(uniqueTags(allLessons()), state.filterTag);
  } catch (error) {
    console.error(error);
    els.content.innerHTML = `<p>Could not load course data. ${escapeHtml(String(error.message || error))}</p>`;
  }
}

boot();
