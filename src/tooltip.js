import { escapeHtml } from './utils/text.js';

export function createTooltipController({ glossary, normalizeTermId }) {
  const glossaryById = new Map(glossary.map((g) => [g.termId, g]));
  const el = document.getElementById('termTooltip');

  const close = () => el.classList.remove('open');
  const position = (anchor, centered = false) => {
    const pad = 10;
    const r = el.getBoundingClientRect();
    if (centered) {
      el.style.left = `${Math.max(pad, (window.innerWidth - r.width) / 2)}px`;
      el.style.top = `${Math.max(pad, (window.innerHeight - r.height) / 2)}px`;
      return;
    }
    const a = anchor.getBoundingClientRect();
    let left = a.right + 8;
    let top = a.top - r.height - 8;
    if (left + r.width > window.innerWidth - pad) left = a.left - r.width - 8;
    if (top < pad) top = a.bottom + 8;
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
  };

  const open = (termId, anchor, opts = {}) => {
    const item = glossaryById.get(termId);
    if (!item) return;
    el.innerHTML = `<div class="tooltip-head"><h3 class="tooltip-title">${escapeHtml(item.display)}</h3><button class="tooltip-close" type="button">✕</button></div>
    <p class="tooltip-short">${escapeHtml(item.short || '')}</p>
    ${item.long ? `<button class="tooltip-more-btn" type="button">More...</button><div class="tooltip-more">${escapeHtml(item.long)}</div>` : ''}
    ${item.examples?.length ? `<pre>${escapeHtml(item.examples.join('\n'))}</pre>` : ''}
    ${item.seeAlso?.length ? `<div class="tooltip-see">${item.seeAlso.map((x) => `<button type="button" class="see-chip" data-term-id="${escapeHtml(x)}">${escapeHtml(glossaryById.get(x)?.display || x)}</button>`).join('')}</div>` : ''}`;
    el.classList.add('open');
    el.querySelector('.tooltip-close')?.addEventListener('click', close);
    el.querySelectorAll('.see-chip').forEach((btn) =>
      btn.addEventListener('click', () => {
        const k = normalizeTermId(btn.dataset.termId);
        if (k) open(k, anchor || btn, opts);
      }),
    );
    el.querySelector('.tooltip-more-btn')?.addEventListener('click', (e) => {
      const more = el.querySelector('.tooltip-more');
      more?.classList.toggle('open');
      e.target.textContent = more?.classList.contains('open') ? 'Less' : 'More...';
      position(anchor || el, !!opts.centered);
    });
    position(anchor || el, !!opts.centered);
  };

  document.addEventListener('click', (e) => {
    if (!el.classList.contains('open')) return;
    if (el.contains(e.target) || e.target.closest('.term') || e.target.closest('.glossary-item')) return;
    close();
  });

  return { open, close, glossaryById };
}
