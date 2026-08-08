// 1g — Results: you vs the ghost of your best run.

import { el, mascot, fmt, mmss, stars } from '../ui.js';
import * as store from '../store.js';
import { chapter, drillCount, LESSON_COUNT } from '../content.js';
import { glyphForKey } from '../layouts.js';
import { adSlot } from '../ads.js';
import { TIPS } from '../tips.js';

export function resultsScreen(_params, nav) {
  const r = store.get().lastRun;
  if (!r) {
    return el('div.wrap', {},
      el('div.card-hero', { style: 'text-align:center;padding:60px' },
        el('div', { style: 'font:600 20px/1.4 var(--th)' }, 'ยังไม่มีผลการซ้อม'),
        el('div', { style: 'margin-top:8px;font:400 13px/1.5 var(--en);color:var(--sub)' }, 'Finish a drill first.'),
        el('button.btn', { style: 'margin-top:20px', onClick: () => nav('#/practice/th') }, 'ไปซ้อม · Practice')));
  }

  // A Dynamic Practice run belongs to no chapter, so nothing here may assume one.
  const dyn = !!r.dynamic;
  const chap = dyn ? null : chapter(r.lang, r.chapterId);
  const total = dyn ? 0 : drillCount(r.lang, r.chapterId);
  const nextDrill = dyn ? 0 : r.drill + 1;
  const hasNext = !dyn && nextDrill < total;
  const delta = r.ghost ? r.wpm - r.ghost : 0;
  const peak = Math.max(1, ...r.samples.map((s) => s.wpm), r.ghost || 1);

  const banner = dyn
    ? (r.passed ? 'ซ้อมเฉพาะปุ่มเสร็จแล้ว · DYNAMIC PRACTICE DONE' : 'ยังไม่ผ่าน · TRY AGAIN')
    : r.stars === 5 ? 'เต็มห้าดาว! · MASTERED'
      : r.newBestStars ? 'ได้ดาวเพิ่ม · NEW BEST'
        : r.beatGhost ? 'สถิติใหม่ · NEW PERSONAL BEST'
          : r.passed ? 'ผ่านแล้ว · DRILL CLEARED' : 'ยังไม่ผ่าน · TRY AGAIN';

  const hero = el('div.card-hero', { style: 'padding:26px' },
    el('div.spread', {},
      el('div', {},
        el('div.eyebrow', {}, banner),
        !dyn ? el('div', { style: 'margin-top:12px' },
          (() => { const s = stars(r.stars, 26); s.classList.add('reveal'); return s; })(),
          el('span', { style: 'margin-left:12px;font:400 11.5px/1 var(--mono);color:var(--dim)' },
            r.stars === 5 ? 'เต็มแล้ว'
              : `ถัดไป ${starHint(r)}`)) : null,
        el('div.row', { style: 'align-items:baseline;gap:14px;margin-top:12px' },
          el('div', { style: `font:500 58px/1 var(--display);letter-spacing:-.03em;color:${r.passed ? 'var(--lime)' : 'var(--red)'}` }, r.wpm),
          el('div', { style: 'font:400 15px/1.3 var(--th);color:var(--sub)' }, 'คำ/นาที', el('br'),
            el('span', { style: `font:500 12px/1 var(--mono);color:${delta >= 0 ? 'var(--green)' : 'var(--red)'}` },
              r.ghost ? `${delta >= 0 ? '+' : ''}${delta} จากเงา` : 'รอบแรก · first run')))),
      el('div.row', { style: 'gap:26px;text-align:right;align-items:flex-start' },
        bigStat(`${r.acc}%`, 'ความแม่นยำ'),
        bigStat(`${r.combo}×`, 'คอมโบสูงสุด'),
        bigStat(mmss(r.seconds), 'เวลา'))),

    el('div.wpm-chart', {},
      r.ghost ? el('div.ghostline', { style: `bottom:${Math.min(96, (r.ghost / peak) * 100)}%` }) : null,
      r.samples.map((s) =>
        el('i', { class: s.err ? 'err' : '', style: `height:${Math.max(4, (s.wpm / peak) * 100)}%` }))),
    el('div.spread', { style: 'margin-top:8px;font:400 10.5px/1 var(--mono);color:var(--dim)' },
      el('span', {}, '0:00'),
      el('span', { style: 'color:var(--dim-3)' }, r.ghost ? `— — เงาสถิติเดิม ${r.ghost} wpm` : '— — ยังไม่มีเงา'),
      el('span', {}, mmss(r.seconds))));

  const slips = store.weakKeys(r.lang, 3);
  const slipCard = el('div.card', { style: 'padding:20px' },
    el('div.eyebrow', {}, 'พลาดที่ไหน · WHERE YOU SLIPPED'),
    el('div.stack', { style: 'gap:10px;margin-top:14px;min-height:60px' },
      slips.length ? slips.map((k) => slipRow(k, r.lang))
        : el('span.dim', { style: 'font:400 12px/1.5 var(--th)' }, 'ไม่มีปุ่มที่พลาดซ้ำ — สะอาดมาก')));

  const scoreCard = el('div.card', { style: 'padding:20px' },
    el('div.eyebrow', {}, 'คะแนนรวมขึ้น · SCORE MOVED'),
    el('div.row', { style: 'align-items:baseline;gap:10px;margin-top:16px' },
      el('span', { style: 'font:500 34px/1 var(--display)' }, fmt(store.combinedScore())),
      el('span', { style: 'font:500 13px/1 var(--mono);color:var(--green)' }, `+${r.points}`)),
    el('div.stack', { style: 'gap:8px;margin-top:14px' },
      scoreRow('ไทย TH', r.lang === 'th' ? r.points : 0, store.progressOf('th').points, 'var(--lime)'),
      scoreRow('English EN', r.lang === 'en' ? r.points : 0, store.progressOf('en').points, 'var(--sky)')));

  const tuk = mascot(84, 20);
  tuk.classList.add('happy');
  if (!r.passed) {
    tuk.parts.mouth.style.borderRadius = '14px 14px 0 0';
  }

  const side = el('div.stack', { style: 'gap:16px' },
    el('div.card', { style: 'padding:22px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center' },
      tuk,
      el('div', { style: 'font:600 17px/1.35 var(--th)' },
        r.stars === 5 ? 'เก่งมาก เต็มห้าดาว!'
          : r.beatGhost ? 'แซงเงาตัวเองได้แล้ว!'
            : r.passed ? 'ผ่านแบบฝึกนี้แล้ว' : 'ความแม่นยำยังไม่ถึง 85%'),
      el('div', { style: 'font:400 12px/1.5 var(--en);color:var(--sub)' },
        r.stars === 5 ? 'Five stars — this drill is mastered.'
          : r.beatGhost ? `You beat your own ghost by ${delta} wpm. New ghost saved.`
            : r.passed ? 'Cleared. Accuracy decides the stars, speed decides how many.'
              : 'Slow down: accuracy below 85% earns no stars and does not advance.'),
      el('div.row', { style: 'gap:9px;padding:8px 14px;border-radius:999px;background:rgba(200,247,90,.12)' },
        el('span.blip', {}),
        el('span', { style: 'font:500 12px/1 var(--mono);color:var(--lime)' }, `สตรีค ${store.get().streak.count} วัน`))),

    el('div.stack', { style: 'gap:8px' },
      el('button.btn', {
        style: 'width:100%',
        onClick: () => nav(dyn ? `#/practice/${r.lang}/dynamic` : `#/practice/${r.lang}/${r.chapterId}/${r.drill}`),
      }, r.passed ? 'ซ้อมซ้ำรอบนี้ · Run again' : 'ลองใหม่ · Try again'),
      dyn
        ? el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/practice/${r.lang}`) },
          'กลับไปบทเรียน · Back to lessons')
        : hasNext
          ? el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/practice/${r.lang}/${r.chapterId}/${nextDrill}`) },
            'ตอนถัดไป · Next part')
          : el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/practice/${r.lang}/${Math.min(LESSON_COUNT, r.chapterId + 1)}/0`) },
            'บทถัดไป · Next lesson'),
      !dyn && store.weakKeys(r.lang, 3).length
        ? el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/practice/${r.lang}/dynamic`) },
          'ซ้อมปุ่มที่พลาด · Drill my misses')
        : null,
      !dyn
        ? el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/lessons/${r.lang}/${r.chapterId}`) },
          'ตอนอื่นในบทนี้ · Other parts')
        : null,
      el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav(`#/lessons/${r.lang}`) }, 'แผนที่บทเรียน · Journey'),
      el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => nav('#/home') }, 'หน้าแรก · Home')));

  // After a long stretch, say so once — the break tip is the same text the
  // curriculum teaches, surfaced at the moment it actually applies.
  const breakPrompt = store.shouldSuggestBreak() ? (() => {
    store.breakSuggested();
    const t = TIPS.breaks;
    return el('div.card', { style: 'margin-bottom:14px;border-color:var(--lime)' },
      el('div.spread', {},
        el('div', { style: 'flex:1' },
          el('div.eyebrow', {}, 'พักสักครู่ · TIME FOR A BREAK'),
          el('div', { style: 'margin-top:8px;font:600 15px/1.3 var(--th)' }, t.th),
          el('div', { style: 'margin-top:6px;font:400 12.5px/1.5 var(--th);color:var(--sub);max-width:640px' }, t.bodyTh)),
        el('button.btn-ghost', { onClick: (e) => { store.ackBreak(); e.target.closest('.card').remove(); } },
          'พักแล้ว · Done')));
  })() : null;

  return el('div.wrap', {},
    breakPrompt,
    el('div.eyebrow', { style: 'margin-bottom:14px' },
      dyn
        ? `${r.lang === 'th' ? 'ไทย' : 'ENGLISH'} · ซ้อมเฉพาะปุ่มที่พลาด · DYNAMIC PRACTICE`
        : `${r.lang === 'th' ? 'ไทย' : 'ENGLISH'} · บทที่ ${chap.id} ${chap.name} · ตอนที่ ${r.drill + 1}/${total} · เป้า ${r.goal} WPM`),
    el('div.res-grid', {},
      el('div.stack', { style: 'gap:18px' },
        hero,
        el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:16px' }, slipCard, scoreCard)),
      side),
    // The natural pause between drills, and the one screen where the user is
    // reading rather than typing. Sits below the actions so it never competes
    // with "next drill".
    adSlot('resultsFooter'));
}

/** What the learner needs for the next star up. */
function starHint(r) {
  const next = [
    { stars: 1, acc: 85, speed: 0 },
    { stars: 2, acc: 88, speed: 0.4 },
    { stars: 3, acc: 92, speed: 0.6 },
    { stars: 4, acc: 95, speed: 0.8 },
    { stars: 5, acc: 98, speed: 1.0 },
  ].find((t) => t.stars === r.stars + 1);
  if (!next) return '';
  const needWpm = Math.ceil(next.speed * (r.goal || 25));
  const missAcc = r.acc < next.acc;
  const missWpm = r.wpm < needWpm;
  if (missAcc && missWpm) return `แม่นยำ ${next.acc}% + ${needWpm} wpm`;
  if (missAcc) return `แม่นยำ ${next.acc}%`;
  return `${needWpm} wpm`;
}

const bigStat = (n, label) =>
  el('div', {},
    el('div', { style: 'font:500 30px/1 var(--mono)' }, n),
    el('div', { style: 'font:400 10.5px/1 var(--th);color:var(--dim);margin-top:6px' }, label));

function slipRow(k, lang) {
  const glyph = lang === 'th' ? thaiGlyph(k.id) : k.id;
  return el('div.row', { style: 'gap:12px' },
    el('div', { style: 'width:34px;height:34px;border-radius:6px;background:rgba(248,113,113,.14);border:1px solid rgba(248,113,113,.4);display:grid;place-items:center;font:600 17px/1 var(--loop);color:var(--red);flex:none' }, glyph),
    el('div', { style: 'flex:1' },
      el('div', { style: 'font:400 12px/1.3 var(--th)' }, `พลาด ${k.miss} ครั้งจาก ${k.total} — ${Math.round(k.rate * 100)}%`),
      el('div', { style: 'height:4px;margin-top:6px;border-radius:999px;background:var(--key)' },
        el('div', { style: `width:${Math.round(k.rate * 100)}%;height:100%;border-radius:999px;background:var(--red)` }))));
}

const scoreRow = (label, gain, total, color) =>
  el('div', {},
    el('div.spread', { style: 'font:400 11px/1 var(--mono);color:var(--dim);margin-bottom:4px' },
      el('span', {}, label), el('span', {}, `+${gain}`)),
    el('div', { style: 'height:6px;border-radius:999px;background:var(--key)' },
      el('div', { style: `width:${Math.min(100, (total / Math.max(1, store.combinedScore())) * 100)}%;height:100%;border-radius:999px;background:${color}` })));

const thaiGlyph = (keyId) => glyphForKey('th', keyId);
