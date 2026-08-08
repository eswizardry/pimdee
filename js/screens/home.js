// 1a — Home dashboard (one combined score, two languages underneath).
// 1b — the same data as a dense strip + two columns, behind the density toggle.

import { el, mascot, bar, stat, fmt, clamp } from '../ui.js';
import * as store from '../store.js';
import { chapter, drillCount, TRACKS } from '../content.js';
import { adSlot } from '../ads.js';
import { glyphForKey, layoutName } from '../layouts.js';

const LANG_COLOR = { th: 'var(--lime)', en: 'var(--sky)' };

export function homeScreen(_params, nav) {
  const s = store.get();
  return el('div.wrap', {},
    el('div.spread', { style: 'margin-bottom:16px' },
      el('div.eyebrow', {}, 'ภาพรวม · OVERVIEW'),
      el('button.btn-ghost', {
        onClick: (e) => {
          store.update((st) => { st.dense = !st.dense; });
          nav('#/home', true);
          e.stopPropagation();
        },
      }, s.dense ? 'มุมมองปกติ · Roomy' : 'มุมมองแน่น · Dense')),
    s.dense ? denseHome(nav) : roomyHome(nav),
    // Below the dashboard: the user has already seen their progress and is
    // choosing what to do next.
    adSlot('homeFooter'));
}

// ---------------------------------------------------------------- 1a --------
function roomyHome(nav) {
  const s = store.get();
  const t = store.tier();
  const week = store.weekPoints(null);
  const peak = Math.max(1, ...week);
  const thisWeek = week.reduce((a, b) => a + b, 0);

  const hero = el('div.card-hero', {},
    el('div.spread', { style: 'align-items:flex-start' },
      el('div', {},
        el('div.eyebrow', {}, 'คะแนนรวม · COMBINED SCORE'),
        el('div.row', { style: 'align-items:baseline;gap:12px;margin-top:12px' },
          el('div.score-big', {}, fmt(store.combinedScore())),
          el('div.stack', { style: 'gap:2px' },
            el('span', { style: 'font:500 13px/1 var(--mono);color:var(--green)' }, `+${thisWeek}`),
            el('span', { style: 'font:400 11px/1 var(--th);color:var(--dim)' }, 'สัปดาห์นี้'))),
        el('div', { style: 'margin-top:10px;font:400 12.5px/1.4 var(--th);color:var(--sub)' },
          'ระดับ ',
          el('span', { style: 'color:var(--lime);font-weight:600' }, t.th),
          ` · ${t.en}, tier ${t.index}`)),
      el('div.spark', { 'aria-hidden': 'true' }, week.map((v, i) =>
        el('i', { class: i === 6 ? 'hot' : '', style: `height:${clamp((v / peak) * 100, 6, 100)}%` })))),

    el('div', { style: 'height:1px;background:var(--line);margin:22px 0 18px' }),

    el('div.lang-cols', {}, langColumn('th'), langColumn('en')),

    el('div.note', { style: 'margin-top:18px' }, coachLine()));

  const tiles = el('div.tiles', {}, todayTile(), streakTile(), weakTile(nav));

  const cont = continueCard(nav);

  const side = el('div.stack', { style: 'gap:16px' }, ghostCard(), quickCard(nav), soundCard());

  return el('div.home-grid', {},
    el('div.stack', { style: 'gap:16px' }, hero, tiles, cont),
    side);
}

function langColumn(lang) {
  const p = store.progressOf(lang);
  const total = store.progressOf('th').points + store.progressOf('en').points || 1;
  const label = lang === 'th'
    ? [el('span', { style: "font:600 15px/1 var(--th)" }, 'ไทย'), el('span.eyebrow', { style: 'letter-spacing:.1em' }, `THAI · ${layoutName('th')}`)]
    : [el('span', { style: "font:600 15px/1 var(--en)" }, 'English'), el('span.eyebrow', { style: 'letter-spacing:.1em' }, 'QWERTY')];

  return el('div.stack', { style: 'gap:9px' },
    el('div.spread', { style: 'align-items:baseline' },
      el('div.row', { style: 'align-items:baseline;gap:8px' }, label),
      el('span', { style: `font:500 11px/1 var(--mono);color:${LANG_COLOR[lang]}` }, `${p.points} pts`)),
    bar((p.points / total) * 100, lang === 'en' ? 'sky' : ''),
    el('div.row', { style: 'gap:22px;margin-top:2px' },
      stat(store.avgOf(lang, 'wpm') || p.bestWpm, 'คำ/นาที'),
      stat(el('span', {}, store.avgOf(lang, 'acc') || 100, el('span', { style: 'font-size:13px;color:var(--dim)' }, '%')), 'ความแม่นยำ'),
      stat(p.cleared.length, 'บทที่ผ่าน')));
}

function coachLine() {
  const th = store.avgOf('th', 'wpm');
  const en = store.avgOf('en', 'wpm');
  if (!th && !en) {
    return el('span', {}, 'ยังไม่มีสถิติ — ลองซ้อมสัก 1 รอบเพื่อให้ระบบวัดระดับได้ ',
      el('span.dim', {}, '· run one drill so TukType can calibrate you.'));
  }
  const gap = Math.abs(th - en);
  const behind = th < en ? 'ภาษาไทย' : 'ภาษาอังกฤษ';
  const behindEn = th < en ? 'Thai' : 'English';
  return el('span', {}, `${behind}ตามหลัง ${gap} คำ/นาที — ซ้อมแถวที่อ่อนสัก 5 นาทีวันนี้จะดึงคะแนนรวมขึ้นเร็วที่สุด `,
    el('span.dim', {}, `· ${behindEn} lags by ${gap} wpm; that's your fastest win.`));
}

function todayTile() {
  const s = store.get();
  const p = Math.min(100, (s.day.runs / s.dailyGoal) * 100);
  return el('div.card', {},
    el('div.eyebrow', {}, 'เป้าวันนี้ · TODAY'),
    el('div.row', { style: 'gap:14px;margin-top:14px' },
      el('div.dial', { style: `background:conic-gradient(var(--lime) 0 ${p}%,var(--key) ${p}% 100%)` },
        el('i', {}, `${s.day.runs}/${s.dailyGoal}`)),
      el('div', { style: 'font:400 12px/1.5 var(--th);color:var(--sub)' },
        s.day.runs >= s.dailyGoal ? 'ครบเป้าแล้ววันนี้' : `อีก ${s.dailyGoal - s.day.runs} รอบก็ครบเป้า`)));
}

function streakTile() {
  const s = store.get();
  const filled = Math.min(7, s.streak.count);
  return el('div.card', {},
    el('div.eyebrow', {}, 'สตรีค · STREAK'),
    el('div.dots', { style: 'margin-top:16px', 'aria-hidden': 'true' },
      [...Array(7)].map((_, i) => el('i', { class: i < filled ? '' : 'off' }))),
    el('div', { style: 'margin-top:14px;font:400 12px/1.4 var(--th);color:var(--sub)' },
      `${s.streak.count} วันติดกัน — สถิติสูงสุด ${s.streak.best}`));
}

function weakTile(nav) {
  const th = store.weakKeys('th', 3);
  const en = store.weakKeys('en', 2);
  const chips = [
    ...th.map((k) => el('div.chip.bad', {}, thaiGlyph(k.id))),
    ...en.map((k) => el('div.chip', {}, k.id)),
  ];
  return el('div.card', {},
    el('div.eyebrow', {}, 'ปุ่มที่ต้องซ้อม · WEAK KEYS'),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;min-height:28px' },
      chips.length ? chips : el('span.dim', { style: 'font:400 12px/1.4 var(--th)' }, 'ยังไม่มีข้อมูล — ซ้อมสัก 2 รอบ')),
    el('button', {
      style: `margin-top:12px;font:400 11.5px/1.4 var(--th);text-align:left;color:${chips.length ? 'var(--lime)' : 'var(--dim)'}`,
      onClick: () => nav(`#/practice/${th.length >= en.length ? 'th' : 'en'}/dynamic`),
    }, chips.length ? 'สร้างแบบฝึกเฉพาะปุ่มเหล่านี้ →' : 'แตะเพื่อสร้างแบบฝึกเฉพาะปุ่ม'));
}

const thaiGlyph = (keyId) => glyphForKey('th', keyId);

function continueCard(nav) {
  // Resume where you actually were. This used to pick whichever language was
  // further behind on points, which handed a learner four lessons into Thai an
  // English lesson 1 and called it "continue".
  const { lang, chapterId, drill } = store.resumePoint();
  const chap = chapter(lang, chapterId);
  const total = drillCount(lang, chapterId);
  const go = () => nav(`#/practice/${lang}/${chapterId}/${drill}`);

  const card = el('div.continue', {},
    mascot(66, 16),
    el('div', { style: 'flex:1' },
      el('div.eyebrow', {}, 'เล่นต่อ · CONTINUE'),
      el('div', { style: 'margin-top:8px;font:600 22px/1.2 var(--th)' },
        `บทที่ ${chap.id} — ${chap.name}`),
      el('div', { style: 'margin-top:5px;font:400 12.5px/1.4 var(--en);color:var(--sub)' },
        `Lesson ${chap.id} — ${chap.en} · part ${drill + 1} of ${total} · ${lang === 'th' ? 'ไทย' : 'English'}`)),
    el('div.stack', { style: 'gap:8px;align-items:flex-end' },
      el('button.btn', { onClick: go }, 'เล่นต่อ · Continue'),
      el('button.btn-ghost', {
        style: 'padding:8px 14px;font-size:12px',
        onClick: () => nav(`#/lessons/${lang}/${chapterId}`),
      }, 'เลือกตอน · Pick a part'),
      el('div', { style: 'font:400 11px/1 var(--mono);color:var(--dim)' }, '↵ ENTER')));

  card.enter = go;
  return card;
}

function ghostCard() {
  const lang = store.resumeLang();
  const p = store.progressOf(lang);
  const you = store.avgOf(lang, 'wpm');
  const best = p.bestWpm;
  const top = Math.max(1, you, best);
  return el('div.card', {},
    el('div.spread', {},
      el('div.eyebrow', {}, 'แข่งกับเงาตัวเอง · GHOST'),
      el('span.blip', {})),
    el('div.stack', { style: 'gap:11px;margin-top:16px' },
      ghostRow('คุณ YOU', `${you} wpm`, (you / top) * 100, 'var(--lime)', 'var(--lime)'),
      ghostRow('เงา BEST', `${best} wpm`, (best / top) * 100, 'var(--dim)', 'var(--dim-3)')),
    el('div', { style: 'margin-top:14px;font:400 12px/1.45 var(--th);color:var(--sub)' },
      best > you ? `ตามหลังเงา ${best - you} คำ/นาที ลองอีกรอบไหม` : 'คุณคือเงาตัวเองตอนนี้ — รักษาไว้'));
}

const ghostRow = (label, value, pct, labelColor, fillColor) =>
  el('div', {},
    el('div.spread', { style: 'font:500 11px/1 var(--mono);margin-bottom:5px' },
      el('span', { style: `color:${labelColor}` }, label),
      el('span', { style: labelColor === 'var(--dim)' ? 'color:var(--dim)' : '' }, value)),
    el('div', { style: 'height:6px;border-radius:999px;background:var(--key)' },
      el('div', { style: `width:${Math.min(100, pct)}%;height:100%;border-radius:999px;background:${fillColor}` })));

function quickCard(nav) {
  const s = store.get();
  const items = [
    ['ซ้อมพิมพ์ 2 นาที', `Drill · ${store.resumeLang() === 'th' ? 'Thai' : 'English'}`, '1',
      () => nav(`#/practice/${store.resumeLang()}`)],
    ['อาร์เคด: คำร่วง', `Falling words · high score ${fmt(s.arcade.high)}`, '2', () => nav('#/arcade')],
    ['พิมพ์ตามเนื้อเพลง', `Lyrics mode · ${TRACKS.length} tracks`, '3', () => nav('#/lyrics')],
  ];
  return el('div.card', {},
    el('div.eyebrow', {}, 'เริ่มเลย · QUICK START'),
    el('div.stack', { style: 'gap:8px;margin-top:14px' },
      items.map(([th, en, key, go]) =>
        el('button.quick', { onClick: go },
          el('div', {},
            el('div', { style: 'font:500 13.5px/1.2 var(--th)' }, th),
            el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--dim);margin-top:3px' }, en)),
          el('span', { style: 'font:500 11px/1 var(--mono);color:var(--dim)' }, key)))));
}

function soundCard() {
  const s = store.get();
  const knob = el('div.toggle', { class: s.sound ? 'on' : '', 'aria-hidden': 'true' }, el('i', {}));
  // A real <button>: a div with onClick cannot be reached or fired from the
  // keyboard, which is a poor look in a typing tutor.
  return el('button.card', {
    type: 'button',
    role: 'switch',
    'aria-checked': String(s.sound),
    style: 'padding:16px 18px;display:flex;align-items:center;justify-content:space-between;'
      + 'cursor:pointer;width:100%;text-align:left',
    onClick: (e) => {
      store.update((st) => { st.sound = !st.sound; st.haptics = st.sound; });
      const on = store.get().sound;
      knob.classList.toggle('on', on);
      e.currentTarget.setAttribute('aria-checked', String(on));
    },
  },
    el('div', { style: 'font:400 12.5px/1.3 var(--th);color:var(--sub)' }, 'เสียงคีย์ & การสั่น',
      el('div', { style: 'font:400 10.5px/1.3 var(--mono);color:var(--dim);margin-top:3px' }, 'SOUND & HAPTICS')),
    knob);
}

// ---------------------------------------------------------------- 1b --------
function denseHome(nav) {
  const s = store.get();
  const week = store.weekPoints(null);
  const thisWeek = week.reduce((a, b) => a + b, 0);

  const head = el('div.dense-head', {},
    el('div', { style: 'padding:20px 26px;border-right:1px solid var(--line);min-width:280px' },
      el('div.eyebrow', {}, 'คะแนนรวม · COMBINED'),
      el('div.row', { style: 'align-items:baseline;gap:10px;margin-top:10px' },
        el('div', { style: 'font:500 44px/1 var(--display);letter-spacing:-.03em' }, fmt(store.combinedScore())),
        el('span', { style: 'font:500 12px/1 var(--mono);color:var(--green)' }, `+${thisWeek}`))),
    el('div.dense-cells', {},
      denseCell('สตรีค STREAK', s.streak.count, ' วัน'),
      denseCell('เป้าวันนี้ TODAY', s.day.runs, `/${s.dailyGoal}`),
      denseCell('เวลาซ้อม TIME', `${Math.floor(s.day.seconds / 60)}:${String(s.day.seconds % 60).padStart(2, '0')}`, ''),
      el('div', { style: 'padding:20px 22px;display:flex;align-items:center;justify-content:flex-end' },
        el('button.btn', { style: 'padding:12px 22px;font-size:13.5px', onClick: () => nav(`#/practice/${store.resumeLang()}`) }, 'เริ่มซ้อม · Practice'))));

  const body = el('div.dense-body', {},
    denseColumn('th'),
    el('div', { style: 'background:var(--line)' }),
    denseColumn('en'));

  const th = store.avgOf('th', 'wpm');
  const en = store.avgOf('en', 'wpm');
  const foot = el('div', { style: 'padding:16px 26px;border-top:1px solid var(--line);background:var(--panel);display:flex;align-items:center;gap:12px' },
    el('span.blip', {}),
    el('div', { style: 'font:400 12.5px/1.4 var(--th);color:var(--sub)' },
      'ช่องว่างระหว่างสองภาษา ',
      el('b', { style: 'color:var(--text)' }, `${Math.abs(th - en)} คำ/นาที`),
      ' ',
      el('span.dim', {}, '· gap between languages')));

  return el('div', { style: 'border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg)' },
    head, body, foot);
}

const denseCell = (label, value, suffix) =>
  el('div', { style: 'padding:20px 22px;border-right:1px solid var(--line)' },
    el('div.eyebrow', {}, label),
    el('div', { style: 'font:500 26px/1 var(--mono);margin-top:12px' }, value,
      el('span', { style: 'font-size:12px;color:var(--dim)' }, suffix)));

function denseColumn(lang) {
  const p = store.progressOf(lang);
  const hist = p.history.slice(-12);
  const peak = Math.max(1, ...hist.map((h) => h.wpm), 1);
  const weak = store.weakKeys(lang, 3);
  const chap = chapter(lang, p.chapter);
  const color = LANG_COLOR[lang];

  return el('div', { style: 'padding:22px 26px' },
    el('div.spread', {},
      el('div.row', { style: 'align-items:baseline;gap:9px' },
        el('span', { style: `font:600 19px/1 var(--${lang === 'th' ? 'th' : 'en'})` }, lang === 'th' ? 'ไทย' : 'English'),
        el('span.eyebrow', { style: 'letter-spacing:.1em' }, layoutName(lang))),
      el('span', {
        style: `padding:4px 9px;border-radius:4px;background:${lang === 'th' ? 'rgba(200,247,90,.12)' : 'rgba(125,211,252,.12)'};font:500 10.5px/1 var(--mono);color:${color}`,
      }, `${p.points} PTS`)),
    el('div.hbars', { 'aria-hidden': 'true' }, [...Array(12)].map((_, i) => {
      const h = hist[i];
      const last = i === 11 && h;
      return el('i', {
        style: `height:${h ? Math.max(6, (h.wpm / peak) * 100) : 4}%;${last ? `background:${color}` : ''}`,
      });
    })),
    el('div.stack', { style: 'margin-top:18px;border-top:1px solid var(--line)' },
      kvRow('ความเร็ว', `${store.avgOf(lang, 'wpm')} wpm`),
      kvRow('ความแม่นยำ', `${store.avgOf(lang, 'acc') || 100}%`),
      kvRow('ปุ่มที่อ่อนที่สุด', weak.length ? weak.map((k) => lang === 'th' ? thaiGlyph(k.id) : k.id).join(' ') : '—', 'var(--red)'),
      kvRow('บทที่กำลังเรียน', `${chap.id} · ${chap.name}`, color)));
}

const kvRow = (label, value, color) =>
  el('div.kv', {}, label,
    el('span', { style: `font:500 13px/1 var(--mono);color:${color || 'var(--text)'}` }, value));
