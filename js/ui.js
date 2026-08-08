// Minimal DOM helpers. No framework: every screen returns a detached element
// and the router swaps it into #app.

export function el(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'style') node.style.cssText = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const frag = (...children) => append(document.createDocumentFragment(), children);
export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

/** A bilingual label: Thai large, English small and grey — the doc's copy rule. */
export const bi = (th, en, cls = '') =>
  el('div', { class: cls }, th, en ? el('span.dim', { style: 'font-size:.82em;margin-left:6px' }, en) : null);

export const eyebrow = (text) => el('div.eyebrow', {}, text);

export const stat = (n, label, color) =>
  el('div', {},
    el('div.stat-n', { style: color ? `color:${color}` : '' }, n),
    el('div.stat-l', {}, label));

export const bar = (pct, cls = '') =>
  el('div.bar', { class: cls }, el('i', { style: `width:${Math.max(0, Math.min(100, pct))}%` }));

/** The น้องดี mascot, sized to `size`px. Returns the element with .parts refs. */
export function mascot(size = 66, radius = 16) {
  const s = size / 66;
  const eyeL = el('i.eye', { style: `top:${20 * s}px;left:${14 * s}px;width:${10 * s}px;height:${14 * s}px` });
  const eyeR = el('i.eye', { style: `top:${20 * s}px;left:${38 * s}px;width:${10 * s}px;height:${14 * s}px` });
  const mouth = el('i.mouth', { style: `top:${44 * s}px;left:${22 * s}px;width:${20 * s}px;height:${8 * s}px` });
  const node = el('div.mascot', {
    'aria-hidden': 'true',
    style: `width:${size}px;height:${size}px;border-radius:${radius}px`,
  }, eyeL, eyeR, mouth);
  node.parts = { eyeL, eyeR, mouth, scale: s };
  return node;
}

/** Drive the mascot's face from run state. */
export function faceMascot(m, { bad, combo, done }) {
  if (!m || !m.parts) return;
  const { eyeL, eyeR, mouth, scale } = m.parts;
  const eyeH = bad ? 5 : combo > 12 ? 13 : 11;
  eyeL.style.height = `${eyeH * scale}px`;
  eyeR.style.height = `${eyeH * scale}px`;
  mouth.style.borderRadius = bad ? `${8 * scale}px ${8 * scale}px 0 0` : `0 0 ${10 * scale}px ${10 * scale}px`;
  mouth.style.height = `${(done ? 14 : combo > 12 ? 11 : 8) * scale}px`;
  m.classList.toggle('happy', combo > 12 || !!done);
}

/** A row of five stars, `n` of them earned. */
export function stars(n, size = 18) {
  const row = el('div.stars', {
    role: 'img',
    'aria-label': `${n} จาก 5 ดาว · ${n} of 5 stars`,
    style: `font-size:${size}px`,
  });
  for (let i = 1; i <= 5; i++) {
    row.appendChild(el('span', { class: i <= n ? 'star on' : 'star', 'aria-hidden': 'true' }, '★'));
  }
  return row;
}

export function toast(msg, ms = 2200) {
  const t = el('div.toast', {}, msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export const fmt = (n) => n.toLocaleString('en-US');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mmss = (s) => {
  const t = Math.max(1, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
