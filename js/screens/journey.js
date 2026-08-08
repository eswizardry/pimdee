// 1e — Journey map. Two braided lanes (Thai above, English below) that meet at
// the bilingual boss drill. Nodes are clickable when unlocked, and open the
// lesson's part list rather than dropping you straight into a drill — picking a
// specific part is the whole point of having 27 lessons.

import { el } from '../ui.js';
import { chapter, LESSON_COUNT, BOSS_ID } from '../content.js';
import { isCombining } from '../layouts.js';
import { adSlot } from '../ads.js';
import * as store from '../store.js';

/**
 * A lesson's emblem. Thai tone marks and above/below vowels can't stand alone
 * (they render as a stray mark on a dotted circle), so skip to the first key
 * that has a shape of its own.
 */
const emblem = (chap) => [...chap.keys].find((c) => !isCombining(c) && c !== ' ') || String(chap.id);

const PAGE = 5; // lessons visible per screen
const PAGES = Math.ceil(LESSON_COUNT / PAGE);

const pageOf = (id) => Math.max(0, Math.min(PAGES - 1, Math.floor((id - 1) / PAGE)));
const idsOn = (page) => [...Array(PAGE)]
  .map((_, i) => page * PAGE + 1 + i)
  .filter((i) => i <= LESSON_COUNT);

export function journeyScreen(params, nav) {
  const focusLang = params.lang === 'en' ? 'en' : 'th';
  return renderPage(pageOf(store.progressOf(focusLang).chapter), focusLang, nav);
}

function renderPage(page, focusLang, nav) {
  const ids = idsOn(page);
  const last = page === PAGES - 1;

  const root = el('div.wrap', {});
  const head = el('div.spread', { style: 'align-items:flex-end;padding:0 4px 18px' },
    el('div', {},
      el('div.eyebrow', {}, `เส้นทางการเรียน · JOURNEY · ${LESSON_COUNT} บท`),
      el('div', { style: 'margin-top:9px;font:600 26px/1.2 var(--th)' },
        `บทที่ ${ids[0]}–${ids[ids.length - 1]}`),
      el('div', { style: 'margin-top:5px;font:400 12.5px/1.4 var(--en);color:var(--sub)' },
        `${chapter('th', ids[0]).name} → ${chapter('th', ids[ids.length - 1]).name}`)),
    el('div.row', { style: 'gap:18px;font:400 11px/1 var(--mono);color:var(--dim)' },
      legend('var(--lime)', 'ไทย TH', '50%'),
      legend('var(--sky)', 'อังกฤษ EN', '50%'),
      legend('var(--violet)', 'บอส BOSS', '2px')));

  // 27 lessons need a real pager, not the two buttons the 10-chapter map had.
  const pager = el('div.row', { style: 'gap:6px;flex-wrap:wrap;padding:0 4px 16px' },
    [...Array(PAGES)].map((_, p) => {
      const range = idsOn(p);
      return el('button.btn-ghost', {
        style: 'padding:6px 12px',
        class: p === page ? 'on' : '',
        disabled: p === page,
        onClick: () => swap(p),
      }, `${range[0]}–${range[range.length - 1]}`);
    }));

  function swap(p) {
    const next = renderPage(p, focusLang, nav);
    root.unmount?.();
    root.replaceChildren(...next.childNodes);
    root.mount = next.mount;
    root.unmount = next.unmount;
    requestAnimationFrame(() => next.mount?.());
  }

  const railTh = el('div.lane-line');
  const railEn = el('div.lane-line');
  const columns = ids.map((id) => column(id, nav));
  if (last) columns.push(bossColumn(nav));
  const grid = el('div.lane-grid', { style: `grid-template-columns:repeat(${columns.length},1fr)` },
    columns);
  const lanes = el('div.lanes', { style: 'padding:24px 6px 34px;position:relative' },
    railTh, railEn, grid);

  // Caption heights vary with the text, so measure the real node centres rather
  // than hard-coding rail offsets.
  const placeRails = () => {
    const base = lanes.getBoundingClientRect().top;
    const centre = (sel) => {
      const n = grid.querySelector(sel);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return r.top + r.height / 2 - base;
    };
    const th = centre('.node.big');
    const en = centre('.node.sm');
    if (th !== null) railTh.style.top = `${th}px`;
    if (en !== null) railEn.style.top = `${en}px`;
  };

  root.appendChild(head);
  root.appendChild(pager);
  root.appendChild(lanes);
  const ad = adSlot('journeyFooter');
  if (ad) root.appendChild(ad);
  root.mount = placeRails;
  requestAnimationFrame(placeRails);
  window.addEventListener('resize', placeRails);
  root.unmount = () => window.removeEventListener('resize', placeRails);
  return root;
}

const legend = (color, text, radius) =>
  el('span', { style: 'display:flex;align-items:center;gap:6px' },
    el('span', { style: `width:9px;height:9px;border-radius:${radius};background:${color}` }), text);

function column(id, nav) {
  const thChap = chapter('th', id);
  const enChap = chapter('en', id);

  return el('div.stack', { style: 'gap:10px' },
    el('div', { style: 'height:60px;display:flex;align-items:center;justify-content:center' },
      pill(id)),
    laneNode('th', id, thChap, nav),
    caption('th', thChap),
    el('div', { style: 'height:26px' }),
    laneNode('en', id, enChap, nav),
    caption('en', enChap));
}

function pill(id) {
  const thState = store.chapterState('th', id);
  const active = thState === 'current';
  return el('div', {
    style: `padding:6px 10px;border-radius:5px;font:500 10.5px/1 var(--mono);${active
      ? 'background:rgba(200,247,90,.14);border:1px solid var(--lime);color:var(--lime)'
      : 'background:var(--raised);border:1px solid var(--line);color:var(--dim)'}`,
  }, active ? `บทที่ ${id} · ตอนนี้` : `บทที่ ${id}`);
}

function laneNode(lang, id, chap, nav) {
  const state = store.chapterState(lang, id);
  const prog = store.chapterProgress(lang, id);
  const unlocked = state !== 'locked';
  const big = lang === 'th';

  let cls = `node ${big ? 'big' : 'sm'}`;
  let glyph = emblem(chap);
  if (state === 'done') { cls += ` done${lang === 'en' ? ' en' : ''}`; glyph = '✓'; }
  else if (state === 'current' || state === 'partial') { cls += ` cur${lang === 'en' ? ' en' : ''}`; }
  else if (state === 'next') { cls += ' next'; glyph = String(id); }
  else { cls += ' lock'; }
  if (unlocked) cls += ' click';

  const node = el('div', {
    class: cls,
    style: lang === 'en' ? 'font-family:var(--mono)' : '',
    title: `${chap.name} — ${prog.done}/${prog.total}`,
    // Opens the part list, so any single part can be replayed. Going straight
    // into a drill is what made it impossible to revisit one.
    onClick: unlocked ? () => nav(`#/lessons/${lang}/${id}`) : null,
  }, glyph);

  if (state === 'current' || state === 'partial') {
    node.appendChild(el('span.badge', {
      style: lang === 'en' ? 'background:var(--sky)' : '',
    }, `${prog.done}/${prog.total}`));
  }

  // Mastery, not just completion: how many of the lesson's stars are earned.
  const cs = store.chapterStars(lang, id);
  if (unlocked && cs.earned > 0) {
    node.appendChild(el('span.node-stars', {
      style: `color:${cs.mastered ? 'var(--lime)' : 'var(--dim)'}`,
      title: `${cs.earned}/${cs.max} ดาว`,
    }, `★ ${cs.earned}/${cs.max}`));
  }

  return el('div', { style: `height:${big ? 76 : 60}px;display:grid;place-items:center` }, node);
}

function caption(lang, chap) {
  const state = store.chapterState(lang, chap.id);
  const dim = state === 'locked' || state === 'next';
  const color = state === 'current' ? (lang === 'th' ? 'var(--lime)' : 'var(--sky)') : dim ? 'var(--dim)' : 'var(--text)';
  return el('div', { style: `text-align:center;font:${state === 'current' ? 600 : 500} 12.5px/1.35 var(--${lang === 'th' ? 'th' : 'en'});color:${color}` },
    chap.name,
    el('div', { style: 'font:400 10.5px/1.3 var(--en);color:var(--dim);margin-top:4px' },
      chap.en));
}

function bossColumn(nav) {
  const thDone = store.chapterState('th', LESSON_COUNT) === 'done';
  const enDone = store.chapterState('en', LESSON_COUNT) === 'done';
  const unlocked = thDone && enDone;

  return el('div.stack', { style: 'gap:10px' },
    el('div', { style: 'height:60px;display:flex;align-items:center;justify-content:center' },
      el('div', { style: 'padding:6px 10px;border-radius:5px;background:var(--raised);border:1px solid var(--line);font:500 10.5px/1 var(--mono);color:var(--dim)' }, 'บอส · BOSS')),
    el('div.boss', { style: 'height:238px' },
      el('div', { style: 'width:44px;height:44px;border-radius:10px;background:var(--violet);color:var(--bg);display:grid;place-items:center;font:700 18px/1 var(--display)' },
        'TH', el('span', { style: 'font-size:11px' }, '/'), 'EN'),
      el('div', { style: 'font:600 14px/1.35 var(--th)' }, 'ด่านผสมสองภาษา'),
      el('div', { style: 'font:400 11px/1.4 var(--en);color:var(--sub)' },
        `Switch languages mid-sentence. Unlocks after lesson ${LESSON_COUNT} in both.`),
      unlocked
        ? el('button.btn', { style: 'padding:8px 16px;font-size:12px', onClick: () => nav(`#/lessons/th/${BOSS_ID}`) }, 'เข้าด่าน · Enter')
        : el('div', { style: 'padding:7px 14px;border-radius:6px;border:1px solid var(--dim-3);font:500 11px/1 var(--mono);color:var(--dim)' }, 'ล็อก LOCKED')));
}
