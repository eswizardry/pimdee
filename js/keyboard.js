// Live keyboard panel: next-key highlight, weak-key heatmap, shift indicator.

import { el } from './ui.js';
import { keyRows, layoutName, capGlyph } from './layouts.js';
import { handsPanel } from './hands.js';

export function keyboardPanel(initialLang) {
  let lang = initialLang;
  const caps = new Map();
  const rowsHost = el('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:center' });

  const buildRows = () => keyRows(lang).map((row) =>
    el('div.kb-row', {},
      row.keys.map((k) => {
        const cap = el('div.keycap', { dataset: { key: k.id } },
          el('span.glyph', {}, capGlyph(k.glyph)),
          el('span.sub', {}, k.sub));
        cap.style.borderBottomColor = k.finger;
        caps.set(k.id, cap);
        return cap;
      })));

  const space = el('div.keycap.space', { dataset: { key: 'space' } }, 'SPACE');
  caps.set('space', space);

  const nameEl = el('span', {}, layoutName(lang));
  const hint = el('span.dim', { style: 'font:400 10.5px/1 var(--mono)' }, '');

  // The next key is announced through the hands caption instead; 60-odd keycaps
  // read aloud on every keystroke would be unusable.
  const kb = el('div.kb', { 'aria-hidden': 'true' },
    rowsHost,
    el('div.kb-row', {},
      el('div.keycap.wide', {}, 'SHIFT'),
      space,
      el('div.keycap.wide', {}, 'SHIFT')));

  const mountRows = () => {
    caps.forEach((_, id) => { if (id !== 'space') caps.delete(id); });
    // Latin glyphs are set in the mono face; the class lets CSS size the two
    // scripts differently and still respond to the narrow-screen rules.
    kb.classList.toggle('en', lang === 'en');
    rowsHost.replaceChildren(...buildRows());
  };
  mountRows();

  const hands = handsPanel();

  const panel = el('div.card', { style: 'padding:20px' },
    el('div.spread', { style: 'margin-bottom:14px' },
      el('div.eyebrow', {}, 'แป้นพิมพ์ · ', nameEl),
      el('div.row', { style: 'gap:14px;font:400 10.5px/1 var(--mono);color:var(--dim)' },
        hint,
        legend('var(--lime)', 'ปุ่มถัดไป NEXT'),
        legend('var(--violet)', 'SHIFT'),
        legend('rgba(248,113,113,.6)', 'พลาดบ่อย MISSED'))),
    // The hands flank the keys: at 1280 the keyboard leaves ~190px of dead
    // space on each side, and side-by-side keeps hand and key in one glance.
    el('div.kb-area', {}, hands.left, kb, hands.right),
    hands.caption);

  panel.hands = hands;

  /**
   * Re-render for a different layout. Used mid-drill by the bilingual boss
   * chapter, where the script (and the learner's IME) flips inside a sentence.
   */
  panel.setLayout = (next) => {
    if (next === lang) return false;
    lang = next;
    nameEl.textContent = layoutName(lang);
    mountRows();
    return true;
  };
  panel.layout = () => lang;

  /**
   * @param {string|null} nextId  physical key for the next character
   * @param {boolean} shift  whether shift must be held
   * @param {Set<string>} weak  key ids to mark as weak
   * @param {number|null} finger  finger id for the hands panel
   */
  panel.paint = (nextId, shift, weak, finger = null) => {
    caps.forEach((cap, id) => {
      cap.classList.toggle('hot', id === nextId);
      cap.classList.toggle('weak', id !== nextId && weak.has(id));
    });
    kb.querySelectorAll('.keycap.wide').forEach((c) => c.classList.toggle('hot', shift && !!nextId));
    hint.textContent = shift ? 'ต้องกด SHIFT ค้างไว้' : '';
    hands.paint(nextId === null ? null : finger, shift);
  };

  return panel;
}

const legend = (color, text) =>
  el('span', { style: 'display:flex;align-items:center;gap:5px' },
    el('span', { style: `width:8px;height:8px;border-radius:2px;background:${color}` }),
    text);
