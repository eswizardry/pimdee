// 1h — Onboarding. A 30-second placement test that sets both language levels.

import { el, mascot, bar } from '../ui.js';
import { Engine, isTypingKey } from '../engine.js';
import * as store from '../store.js';
import { blip } from '../audio.js';
import { setThaiLayout } from '../layouts.js';

const PLACEMENT = {
  th: 'แมวนอนกลางบ้านทั้งวันไม่ยอมไปไหน ฝนตกอยู่ข้างนอกตั้งแต่เช้า',
  en: 'the quiet library floor caught the last of the afternoon light before the rain arrived',
};
const TEST_SECONDS = 30;

const STEP_LABELS = ['เลือกภาษา', 'แป้นพิมพ์', 'วัดระดับ 30 วินาที', 'เป้าหมาย'];

export function onboardingScreen(_params, nav) {
  let step = 1;
  let langs = ['th', 'en'];
  let layout = 'kedmanee';
  let estimate = { th: 0, en: 0 };
  let goal = 5;

  const root = el('div.wrap', {});

  const render = () => {
    root.replaceChildren(
      el('div', { style: 'border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg)' },
        steps(),
        body()));
  };

  const steps = () =>
    el('div.steps', {}, STEP_LABELS.flatMap((label, i) => {
      const n = i + 1;
      const cls = n < step ? 'step past' : n === step ? 'step on' : 'step';
      const node = el('div', { class: cls },
        el('div.n', {}, n < step ? '✓' : n),
        el('span', {}, label));
      return i < 3 ? [node, el('div', { class: `step-line${n < step ? ' past' : ''}` })] : [node];
    }));

  function body() {
    if (step === 1) return stepLang();
    if (step === 2) return stepLayout();
    if (step === 3) return stepTest();
    return stepGoal();
  }

  // -- step 1 --------------------------------------------------------------
  function stepLang() {
    const opts = [
      ['both', 'ไทย + English', 'Both languages, one combined score', ['th', 'en']],
      ['th', 'ไทยอย่างเดียว', 'Thai only — Kedmanee layout', ['th']],
      ['en', 'English only', 'QWERTY only', ['en']],
    ];
    return pane('ขั้นที่ 1 · เลือกภาษาที่จะฝึก',
      el('div.stack', { style: 'gap:12px' },
        opts.map(([id, th, en, value]) =>
          el('button.pick', {
            class: langs.join() === value.join() ? 'on' : '',
            onClick: () => { langs = value; render(); },
          },
            el('div', {},
              el('div', { style: 'font:600 14px/1.2 var(--th)' }, th),
              el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--sub);margin-top:4px' }, en)),
            langs.join() === value.join() ? el('div.tick', {}, '✓') : null))),
      nextBtn(() => { step = 2; render(); }));
  }

  // -- step 2 --------------------------------------------------------------
  function stepLayout() {
    const opts = [
      ['kedmanee', 'เกษมณี · Kedmanee', 'ค่ามาตรฐาน — ปุ่มบนคีย์บอร์ดไทยทั่วไป', false],
      ['pattachote', 'ปัตตะโชติ · Pattachote',
        'กระจายงานสองมือได้ดีกว่า — มีบทเรียนครบชุดของตัวเอง แต่หาคีย์บอร์ดยากกว่า', false],
    ];
    return pane('ขั้นที่ 2 · แป้นพิมพ์ไทย',
      el('div.stack', { style: 'gap:12px' },
        opts.map(([id, th, en, disabled]) =>
          el('button.pick', {
            class: `${layout === id ? 'on' : ''}${disabled ? ' soft' : ''}`,
            disabled,
            style: disabled ? 'opacity:.5;cursor:not-allowed' : '',
            onClick: disabled ? null : () => { layout = id; setThaiLayout(id); render(); },
          },
            el('div', {},
              el('div', { style: 'font:600 14px/1.2 var(--th)' }, th),
              el('div', { style: 'font:400 11px/1.3 var(--th);color:var(--sub);margin-top:4px' }, en)),
            layout === id ? el('div.tick', {}, '✓') : null))),
      el('div.note', { style: 'margin-top:20px' },
        'อายุผู้เรียนใช้กำหนดเนื้อหา ไม่ใช่หน้าตา — เด็กได้คำศัพท์ง่าย ผู้ใหญ่ได้ประโยคยาว ',
        el('span.dim', {}, '· age changes the word lists, never the UI')),
      nextBtn(() => { step = 3; render(); }));
  }

  // -- step 3: the actual 30s placement test -------------------------------
  function stepTest() {
    const testLangs = langs;
    let ix = 0;
    let lang = testLangs[0];
    const engine = new Engine(PLACEMENT[lang], lang);
    let timer = null, left = TEST_SECONDS, live = false;

    const clockEl = el('div', { style: 'font:500 20px/1 var(--mono);color:var(--lime)' }, `0:${TEST_SECONDS}`);
    const textEl = el('div', { style: `font:400 30px/1.6 var(--${lang === 'th' ? 'loop' : 'en'});min-height:100px` });
    const progEl = el('div', { style: 'margin-top:20px;height:5px;border-radius:999px;background:var(--key)' },
      el('div', { style: 'width:0;height:100%;border-radius:999px;background:var(--lime);transition:width .1s' }));

    const estRows = el('div.stack', { style: 'gap:14px;margin-top:16px' });
    let clusterEls = [];

    function mountText() {
      textEl.replaceChildren();
      textEl.style.fontFamily = lang === 'th' ? 'var(--loop)' : 'var(--en)';
      clusterEls = engine.clusters.map((c) => {
        const span = el('span.cl', {}, c.text === ' ' ? ' ' : c.text);
        textEl.appendChild(span);
        return span;
      });
    }

    function paint() {
      const cursor = engine.cursorCluster;
      clusterEls.forEach((span, i) => {
        const c = engine.clusters[i];
        const wrong = [...Array(c.end - c.start)].some((_, k) => engine.wrongAt.has(c.start + k));
        span.className = `cl${wrong ? ' bad' : c.end <= engine.done ? ' done' : ''}${i === cursor ? ' cur' : ''}`;
      });
      progEl.firstChild.style.width = `${engine.progress * 100}%`;
      estimate[lang] = engine.wpm;
      paintEstimates();
    }

    function paintEstimates() {
      estRows.replaceChildren(
        ...testLangs.map((l) => {
          const wpm = estimate[l];
          const ch = startChapter(wpm);
          return el('div', {},
            el('div.spread', { style: 'font:400 12px/1 var(--th);color:var(--sub);margin-bottom:6px' },
              el('span', {}, l === 'th' ? 'ไทย' : 'English'),
              el('span', { style: 'font:500 12px/1 var(--mono);color:var(--text)' },
                wpm ? `~${wpm} wpm · ${ch === 1 ? 'เริ่มบทที่ 1' : `ข้ามไปบทที่ ${ch}`}` : 'ยังไม่ได้วัด')),
            bar(Math.min(100, (wpm / 70) * 100), l === 'en' ? 'sky' : ''));
        }));
    }

    function tickClock() {
      left -= 1;
      clockEl.textContent = `0:${String(Math.max(0, left)).padStart(2, '0')}`;
      if (left <= 0) nextLang();
    }

    function nextLang() {
      clearInterval(timer); timer = null; live = false;
      estimate[lang] = engine.wpm;
      ix += 1;
      if (ix >= testLangs.length) { finish(); return; }
      lang = testLangs[ix];
      left = TEST_SECONDS;
      clockEl.textContent = `0:${TEST_SECONDS}`;
      engine.reset(PLACEMENT[lang], lang);
      mountText(); paint();
    }

    function finish() {
      store.update((st) => {
        st.onboarded = true;
        st.layout = setThaiLayout(layout);
        st.langs = langs;
        testLangs.forEach((l) => {
          const t = store.track(l);
          st.progress[t].chapter = startChapter(estimate[l]);
          st.progress[t].drill = 0;
        });
      });
      step = 4; render();
    }

    function onKey(e) {
      if (e.key === 'Backspace') { e.preventDefault(); engine.backspace(); return; }
      if (!isTypingKey(e)) return;
      e.preventDefault();
      if (!live) { live = true; timer = setInterval(tickClock, 1000); }
      const r = engine.press(e.key);
      if (r) blip(r.ok, engine.combo);
      if (r && r.finished) nextLang();
    }

    engine.addEventListener('change', paint);
    mountText(); paint();

    const testCard = el('div.card-hero', { tabindex: '0', style: 'outline:none;cursor:text' },
      el('div.spread', {},
        el('div.eyebrow', {}, `ขั้นที่ 3 · วัดระดับ (${lang === 'th' ? 'ไทย' : 'English'})`),
        clockEl),
      el('div', { style: 'margin-top:20px' }, textEl),
      progEl,
      el('div', { style: 'height:1px;background:var(--line);margin:24px 0 20px' }),
      el('div.eyebrow', {}, 'ผลที่กำลังประเมิน · LIVE ESTIMATE'),
      estRows,
      el('div.row', { style: 'gap:12px;margin-top:20px;padding:12px 14px;border-radius:8px;background:rgba(200,247,90,.10)' },
        mascot(38, 10),
        el('div', { style: 'font:400 12px/1.45 var(--th)' },
          'พิมพ์ไปเรื่อย ๆ ไม่ต้องรีบ — เราใช้ 30 วินาทีนี้ตั้งบทเริ่มต้นให้แต่ละภาษา')));

    testCard.addEventListener('keydown', onKey);
    testCard.addEventListener('mousedown', (e) => { e.preventDefault(); testCard.focus(); });
    requestAnimationFrame(() => testCard.focus());

    const summary = el('div.card', { style: 'padding:24px' },
      el('div.eyebrow', {}, 'ขั้นที่ 1–2 · ที่คุณเลือกไว้'),
      el('div.stack', { style: 'gap:12px;margin-top:18px' },
        el('div.pick.on', {},
          el('div', {},
            el('div', { style: 'font:600 14px/1.2 var(--th)' }, langs.length === 2 ? 'ไทย + English' : langs[0] === 'th' ? 'ไทยอย่างเดียว' : 'English only'),
            el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--sub);margin-top:4px' }, 'One combined score')),
          el('div.tick', {}, '✓')),
        el('div.pick', {},
          el('div', {},
            el('div', { style: 'font:600 14px/1.2 var(--th)' }, 'เกษมณี · Kedmanee'),
            el('div', { style: 'font:400 11px/1.3 var(--th);color:var(--sub);margin-top:4px' }, 'ค่ามาตรฐาน')),
          el('span', { style: 'font:400 11px/1 var(--mono);color:var(--dim)' }, 'เปลี่ยนได้')),
        el('button.btn-ghost', { style: 'width:100%;padding:14px', onClick: () => { clearInterval(timer); finish(); } },
          'ข้ามการวัดระดับ · Skip test')));

    return el('div', { style: 'padding:30px;display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start' },
      summary, testCard);
  }

  // -- step 4 --------------------------------------------------------------
  function stepGoal() {
    const opts = [[3, 'เบา ๆ', '3 drills a day'], [5, 'พอดี', '5 drills a day'], [10, 'จริงจัง', '10 drills a day']];
    return pane('ขั้นที่ 4 · เป้าหมายต่อวัน',
      el('div.row', { style: 'gap:12px' },
        opts.map(([n, th, en]) =>
          el('button.pick', {
            class: goal === n ? 'on' : '',
            style: 'flex:1',
            onClick: () => { goal = n; render(); },
          },
            el('div', {},
              el('div', { style: 'font:600 14px/1.2 var(--th)' }, `${th} — ${n} รอบ`),
              el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--sub);margin-top:4px' }, en)),
            goal === n ? el('div.tick', {}, '✓') : null))),
      el('div.row', { style: 'gap:14px;margin-top:24px;padding:16px;border-radius:8px;background:rgba(200,247,90,.10)' },
        mascot(48, 12),
        el('div', { style: 'font:400 13px/1.5 var(--th)' },
          `เริ่มที่ ไทย บทที่ ${store.progressOf('th').chapter} และ English chapter ${store.progressOf('en').chapter} — ปรับได้ทุกเมื่อจากแผนที่บทเรียน`)),
      el('button.btn', {
        style: 'margin-top:24px',
        onClick: () => {
          store.update((st) => { st.onboarded = true; st.dailyGoal = goal; });
          nav('#/home');
        },
      }, 'เริ่มเลย · Start typing'));
  }

  const pane = (title, ...children) =>
    el('div', { style: 'padding:30px;max-width:680px' },
      el('div', { style: 'font:600 20px/1.3 var(--th);margin-bottom:20px' }, title),
      ...children);

  const nextBtn = (go) => el('button.btn', { style: 'margin-top:24px', onClick: go }, 'ถัดไป · Next');

  render();
  return root;
}

/** Map a placement wpm onto a starting chapter. */
export function startChapter(wpm) {
  if (wpm >= 55) return 8;
  if (wpm >= 40) return 6;
  if (wpm >= 28) return 4;
  if (wpm >= 18) return 2;
  return 1;
}
