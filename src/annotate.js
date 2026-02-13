function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const cache = new Map();

export function annotateTerms(htmlString, glossary, { lessonId, courseId, normalizeTermId }) {
  const key = `${courseId}:${lessonId}`;
  if (cache.has(key)) return cache.get(key);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${htmlString}</div>`, 'text/html');
  const root = doc.getElementById('root');
  const entries = [];
  glossary.forEach((item) => [item.display, ...(item.aliases || [])].forEach((alias) => entries.push({ alias, termId: item.termId })));
  entries.sort((a, b) => b.alias.length - a.alias.length);
  const regex = new RegExp(`\\b(${entries.map((e) => escapeRegex(e.alias)).join('|')})\\b`, 'gi');

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.nodeValue?.trim()) continue;
    if (n.parentElement?.closest('pre, code, a, button, input, textarea, .term')) continue;
    nodes.push(n);
  }

  nodes.forEach((node) => {
    const text = node.nodeValue;
    regex.lastIndex = 0;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text))) {
      const before = text.slice(last, m.index);
      if (before) frag.appendChild(doc.createTextNode(before));
      const match = m[0];
      const termId = normalizeTermId(match);
      if (termId) {
        const span = doc.createElement('span');
        span.className = 'term';
        span.dataset.termId = termId;
        span.tabIndex = 0;
        span.setAttribute('role', 'button');
        span.textContent = match;
        frag.appendChild(span);
      } else {
        frag.appendChild(doc.createTextNode(match));
      }
      last = regex.lastIndex;
    }
    const after = text.slice(last);
    if (after) frag.appendChild(doc.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
  });

  const out = root.innerHTML;
  cache.set(key, out);
  return out;
}
