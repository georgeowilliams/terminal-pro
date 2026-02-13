import { escapeHtml } from "./utils/text.js";

export function renderQuizSection(lessonId, quizData, quizState, annotate) {
  if (!quizData?.length) return "";
  const cards = quizData.map((q, idx) => {
    const st = quizState[idx] || {};
    const prompt = annotate(`<span>${escapeHtml(q.prompt)}</span>`, `${lessonId}-q-${idx}-p`);
    const explanation = (st.revealed || st.checked) ? `<div class="quiz-answer">${annotate(`<span>${escapeHtml(q.explanation || "")}</span>`, `${lessonId}-q-${idx}-e`)}</div>` : "";
    if (q.type === "mcq") {
      const options = q.choices.map((choice, cidx) => `<label><input type="radio" name="${lessonId}-q-${idx}" data-quiz-choice="${cidx}" ${String(st.selectedIndex)===String(cidx)?"checked":""}/> ${escapeHtml(choice)}</label>`).join("");
      const feedback = st.checked ? `<div class="quiz-feedback ${st.correct ? "ok" : "bad"}">${st.correct ? "Correct" : "Not yet"}</div>` : "";
      return `<div class="quiz-card" data-quiz-index="${idx}"><h4>Question ${idx+1}</h4><p>${prompt}</p><div class="quiz-choices">${options}</div><button type="button" data-quiz-action="check">Check answer</button>${feedback}${explanation}</div>`;
    }
    if (q.type === "output") {
      return `<div class="quiz-card" data-quiz-index="${idx}"><h4>Question ${idx+1}</h4><p>${prompt}</p><textarea data-quiz-input="output" rows="4" style="width:100%; font-family:var(--mono);">${escapeHtml(st.userAnswer || "")}</textarea><div><button type="button" data-quiz-action="compare">Compare</button> <button type="button" data-quiz-action="reveal">Reveal answer</button></div>${(st.revealed && st.userAnswer) ? `<pre>${escapeHtml(String(q.answer))}</pre>` : ""}${explanation}</div>`;
    }
    return `<div class="quiz-card" data-quiz-index="${idx}"><h4>Question ${idx+1}</h4><p>${prompt}</p><input data-quiz-input="short" value="${escapeHtml(st.userAnswer || "")}" style="width:100%;"/><div><button type="button" data-quiz-action="reveal">Reveal answer</button></div>${st.revealed ? `<div class="quiz-answer"><code>${escapeHtml(q.answer)}</code></div>` : ""}${explanation}</div>`;
  }).join("");
  return `<section class="quiz-wrap"><h2>Lesson Quiz</h2>${cards}</section>`;
}

export function attachQuizHandlers(container, { getLesson, readQuizState, writeQuizState, onStateChange }) {
  container.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("[data-quiz-action]");
    const lesson = getLesson();
    if (!actionBtn || !lesson?.quiz?.length) return;
    const card = actionBtn.closest(".quiz-card"); if (!card) return;
    const qIndex = Number(card.dataset.quizIndex); const question = lesson.quiz[qIndex];
    const state = readQuizState(lesson.id); const qState = state[qIndex] || {};
    if (question.type === "mcq") qState.selectedIndex = Number(card.querySelector("input[type='radio']:checked")?.dataset.quizChoice ?? qState.selectedIndex);
    else qState.userAnswer = card.querySelector("[data-quiz-input]")?.value || qState.userAnswer || "";
    const action = actionBtn.dataset.quizAction;
    if (action === "check" && question.type === "mcq") { qState.checked = true; qState.correct = Number(qState.selectedIndex) === Number(question.answerIndex); qState.revealed = true; }
    if (action === "reveal" || action === "compare") qState.revealed = true;
    state[qIndex] = qState; writeQuizState(lesson.id, state); onStateChange();
  });
}
