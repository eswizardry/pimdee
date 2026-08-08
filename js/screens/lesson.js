// Lesson detail — every part of one lesson, each directly playable.
//
// The journey map only ever exposed a whole lesson, and jumped you to the
// furthest part you had reached. That left no way to go back and redo part 3 of
// a lesson you had already finished, which is exactly what someone does when a
// drill did not stick. This screen is that way back.

import { el, stars as starRow } from '../ui.js';
import {
  chapter, drillCount, drillLabel, drillTip, drillText, lessonFingers, LESSON_COUNT, BOSS_ID,
} from '../content.js';
import { capGlyph } from '../layouts.js';
import * as store from '../store.js';
import { adSlot } from '../ads.js';

export function lessonScreen({ lang = 'th', id = 1 }, nav) {
  // BOSS_ID sits one past the last teaching lesson and is reachable from the map.
  const chId = Math.max(1, Math.min(BOSS_ID, Number(id) || 1));
  const isBoss = chId === BOSS_ID;
  const chap = chapter(lang, chId);
  const total = drillCount(lang, chId);
  const state = store.chapterState(lang, chId);
  const locked = state === 'locked';
  const cs = store.chapterStars(lang, chId);
  const prog = store.chapterProgress(lang, chId);

  const head = el('div.spread', { style: 'align-items:flex-end;padding:0 4px 20px' },
    el('div', {},
      el('div.eyebrow', {}, isBoss
        ? `${lang === 'th' ? 'ไทย' : 'ENGLISH'} · ด่านบอส · BOSS`
        : `${lang === 'th' ? 'ไทย' : 'ENGLISH'} · บทที่ ${chId} จาก ${LESSON_COUNT}`),
      el('div', { style: 'margin-top:9px;font:600 26px/1.2 var(--th)' }, chap.name),
      el('div', { style: 'margin-top:5px;font:400 13px/1.4 var(--en);color:var(--sub)' },
        `${chap.en} · เป้า ${chap.goalWpm} wpm`)),
    el('div.row', { style: 'gap:8px' },
      el('button.btn-ghost', {
        style: 'padding:8px 14px',
        disabled: chId <= 1,
        onClick: () => nav(`#/lessons/${lang}/${chId - 1}`),
      }, '← บทก่อน'),
      el('button.btn-ghost', {
        style: 'padding:8px 14px',
        disabled: chId >= BOSS_ID,
        onClick: () => nav(`#/lessons/${lang}/${chId + 1}`),
      }, 'บทถัดไป →'),
      el('button.btn-ghost', { style: 'padding:8px 14px', onClick: () => nav(`#/lessons/${lang}`) },
        'แผนที่ · Map')));

  const summary = el('div.card', { style: 'padding:20px 22px' },
    el('div.eyebrow', {}, 'ปุ่มใหม่ในบทนี้ · NEW KEYS'),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:7px;margin-top:14px' },
      newKeyChips(chap)),
    el('div', { style: 'margin-top:16px;font:400 12px/1.5 var(--th);color:var(--sub)' },
      fingerLine(lang, chId)),
    el('div', { style: 'height:1px;background:var(--line);margin:18px 0 14px' }),
    el('div.spread', { style: 'font:400 12px/1 var(--th);color:var(--sub)' },
      el('span', {}, 'ผ่านแล้ว'),
      el('span', { style: 'font:500 12px/1 var(--mono);color:var(--text)' }, `${prog.done}/${total}`)),
    el('div.spread', { style: 'margin-top:10px;font:400 12px/1 var(--th);color:var(--sub)' },
      el('span', {}, 'ดาวที่ได้'),
      el('span', { style: `font:500 12px/1 var(--mono);color:${cs.mastered ? 'var(--lime)' : 'var(--text)'}` },
        `★ ${cs.earned}/${cs.max}`)));

  const rows = [...Array(total)].map((_, i) => partRow(lang, chId, i, locked, nav));

  const list = el('div.card', { style: 'padding:0;overflow:hidden' },
    el('div', { style: 'padding:16px 20px;border-bottom:1px solid var(--line)' },
      el('div.eyebrow', {}, `ตอนทั้งหมด · ${total} PARTS`),
      el('div', { style: 'margin-top:6px;font:400 11.5px/1.4 var(--th);color:var(--dim)' },
        locked
          ? 'บทนี้ยังล็อกอยู่ — เรียนบทก่อนหน้าให้ถึงก่อน · finish the earlier lessons first'
          : 'เลือกตอนไหนก็ได้ ซ้อมซ้ำได้ไม่จำกัด · pick any part, replay it as often as you like')),
    ...rows);

  return el('div.wrap', {},
    head,
    el('div.lesson-grid', {}, list, summary),
    adSlot('journeyFooter'));
}

/** The lesson's new keys as keycaps. Combining marks ride a dotted circle. */
function newKeyChips(chap) {
  const keys = [...(chap.keys || '')];
  // The authored tail lessons and the boss list the whole layout as their "keys",
  // which is true but useless as a chip row.
  if (keys.length > 12) {
    return [el('span', { style: 'font:400 12.5px/1.4 var(--th);color:var(--sub)' },
      'ทั้งแป้นพิมพ์ · the whole keyboard')];
  }
  return keys.map((g) => el('div.chip', { style: 'font-family:var(--loop);font-size:15px' }, capGlyph(g)));
}

function fingerLine(lang, chId) {
  const fingers = lessonFingers(lang, chId);
  if (!fingers.length || fingers.length > 4) return 'ใช้ทุกนิ้ว · every finger';
  return `นิ้วที่ใช้: ${fingers.map((f) => f.th).join(', ')} · ${fingers.map((f) => f.en).join(', ')}`;
}

function partRow(lang, chId, ix, locked, nav) {
  const label = drillLabel(lang, chId, ix);
  const isTip = !!drillTip(lang, chId, ix);
  const cleared = store.isCleared(lang, chId, ix);
  const n = store.starsAt(lang, chId, ix);
  const ghost = store.ghostWpm(lang, chId, ix);
  const text = drillText(lang, chId, ix);

  const go = () => nav(`#/practice/${lang}/${chId}/${ix}`);

  const badge = el('div', {
    style: `width:32px;height:32px;border-radius:7px;flex:none;display:grid;place-items:center;
      font:500 12px/1 var(--mono);
      background:${cleared ? 'rgba(200,247,90,.14)' : 'var(--raised)'};
      border:1px solid ${cleared ? 'var(--lime)' : 'var(--line)'};
      color:${cleared ? 'var(--lime)' : 'var(--dim)'}`,
  }, cleared ? '✓' : String(ix + 1));

  // A preview of the actual text, so you can recognise the part you are looking
  // for without playing it. Teaching cards have no text to show.
  const preview = isTip
    ? el('span', { style: 'font:400 11.5px/1.4 var(--th);color:var(--dim)' }, 'การ์ดสอน — อ่านแล้วกดต่อ')
    : el('span', {
      style: 'font:400 11.5px/1.5 var(--loop);color:var(--dim);display:block;overflow:hidden;'
        + 'text-overflow:ellipsis;white-space:nowrap;max-width:100%',
    }, text || '');

  return el('button', {
    class: 'part-row',
    disabled: locked,
    onClick: locked ? null : go,
    'aria-label': `${label.th} ${ix + 1} — ${cleared ? `ผ่านแล้ว ${n} ดาว` : 'ยังไม่ผ่าน'}`,
  },
    badge,
    el('div', { style: 'flex:1;min-width:0;text-align:left' },
      el('div', { style: 'font:500 13.5px/1.3 var(--th)' }, label.th,
        label.en ? el('span.dim', { style: 'font-size:.8em;margin-left:6px' }, label.en) : null),
      el('div', { style: 'margin-top:5px' }, preview)),
    el('div.row', { style: 'gap:14px;flex:none' },
      isTip ? null : starRow(n, 13),
      el('span', { style: 'font:500 11px/1 var(--mono);color:var(--dim);min-width:52px;text-align:right' },
        ghost ? `${ghost} wpm` : '—'),
      el('span', { style: 'font:400 11px/1 var(--mono);color:var(--lime)' }, locked ? '' : '▶')));
}
