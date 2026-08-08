// 1h — Onboarding. A 30-second placement test that sets both language levels.

import { el, mascot, bar } from '../ui.js';
import { Engine, isTypingKey } from '../engine.js';
import * as store from '../store.js';
import { blip } from '../audio.js';
import { setThaiLayout, wrongInputMethod } from '../layouts.js';
import { setAgeBand } from '../content.js';

const PLACEMENT = {
  th: 'แมวนอนกลางบ้านทั้งวันไม่ยอมไปไหน ฝนตกอยู่ข้างนอกตั้งแต่เช้า',
  en: 'the quiet library floor caught the last of the afternoon light before the rain arrived',
};
const TEST_SECONDS = 30;

const STEP_LABELS = ['เลือกภาษา', 'แป้นพิมพ์', 'วัดระดับ 30 วินาที', 'เป้าหมาย'];

export function onboardingScreen(_params, nav) {
  let step = 1;
  let langs = ['th', 'en'];
  let ageBand = 'adult';
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
    const ages = [
      ['child', 'เด็ก (อายุ 7–12 ปี)', 'Child — familiar words and short sentences'],
      ['adult', 'วัยรุ่นและผู้ใหญ่ (13 ปีขึ้นไป)', 'Teen or adult — longer sentences and paragraphs'],
    ];
    return pane('ขั้นที่ 1 · ใครเรียน และเรียนภาษาอะไร',
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
      el('div.eyebrow', { style: 'margin-top:24px' }, 'ผู้เรียน · WHO IS LEARNING'),
      el('div.stack', { style: 'gap:12px;margin-top:12px' },
        ages.map(([id, th, en]) =>
          el('button.pick', {
            class: ageBand === id ? 'on' : '',
            onClick: () => { ageBand = id; setAgeBand(id); render(); },
          },
            el('div', {},
              el('div', { style: 'font:600 14px/1.2 var(--th)' }, th),
              el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--sub);margin-top:4px' }, en)),
            ageBand === id ? el('div.tick', {}, '✓') : null))),
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
        'อายุผู้เรียนใช้กำหนดเนื้อหา ไม่ใช่หน้าตา — เด็กได้คำศัพท์ง่ายในบทที่ 25–27 ผู้ใหญ่ได้ประโยคยาว เปลี่ยนได้ทีหลังในหน้าสถิติ ',
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
        st.ageBand = setAgeBand(ageBand);
        st.langs = langs;
        testLangs.forEach((l) => {
          const t = store.track(l);
          st.progress[t].chapter = startChapter(estimate[l]);
          st.progress[t].drill = 0;
        });
      });
      step = 4; render();
    }

    let wrongRun = 0;
    let wrongBanner = null;

    function onKey(e) {
      if (e.key === 'Backspace') { e.preventDefault(); engine.backspace(); return; }
      if (!isTypingKey(e)) return;
      e.preventDefault();
      if (!live) { live = true; timer = setInterval(tickClock, 1000); }
      const expected = engine.nextChar;
      const r = engine.press(e.key);
      if (r) blip(r.ok, engine.combo);

      // The placement test is the very first thing anyone types, so it is where
      // a wrong input method is most likely and most confusing. Space is neutral
      // — it is the same key under every layout.
      if (r && !(expected === ' ' || e.key === ' ')) {
        const mismatch = r.ok ? null : wrongInputMethod(expected, e.key);
        wrongRun = mismatch ? wrongRun + 1 : 0;
        if (wrongRun >= 3 && !wrongBanner) {
          wrongBanner = inputHint(mismatch);
          testCard.parentNode.insertBefore(wrongBanner, testCard);
        } else if (wrongRun === 0 && wrongBanner) {
          wrongBanner.remove(); wrongBanner = null;
        }
      }
      if (r && r.finished) nextLang();
    }

    engine.addEventListener('change', paint);
    mountText(); paint();

    const testCard = el('div.card-hero', {
      tabindex: '0',
      role: 'group',
      'aria-label': 'แบบทดสอบวัดระดับ · placement test — click and type',
      style: 'outline:none;cursor:text',
    },
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

    // Without this the card looks identical whether or not it is listening, so
    // a lost focus reads as "the test is broken".
    const overlay = el('div.overlay', {},
      el('div.msg', {}, 'คลิกที่การ์ดนี้แล้วเริ่มพิมพ์',
        el('br'), el('span.dim', {}, 'click here, then type')));
    const testWrap = el('div', { style: 'position:relative' }, testCard, overlay);
    testCard.addEventListener('focus', () => { overlay.style.display = 'none'; });
    testCard.addEventListener('blur', () => { overlay.style.display = ''; });

    testCard.addEventListener('keydown', onKey);
    testWrap.addEventListener('mousedown', (e) => { e.preventDefault(); testCard.focus(); });
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
      summary, testWrap);
  }

  /** Shown when the OS input method is on the wrong script for this test. */
  function inputHint(want) {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const combo = mac ? 'Control + Space' : 'Windows + Space';
    const th = want === 'th';
    return el('div.card', {
      role: 'alert',
      style: 'margin-bottom:14px;border-color:var(--red);background:rgba(248,113,113,.08)',
    },
      el('div.eyebrow', { style: 'color:var(--red)' },
        th ? 'สลับแป้นพิมพ์เป็นภาษาไทย · SWITCH TO THAI' : 'สลับแป้นพิมพ์เป็นภาษาอังกฤษ · SWITCH TO ENGLISH'),
      el('div', { style: 'margin-top:8px;font:500 14px/1.4 var(--th)' },
        th ? `ตอนนี้เครื่องยังพิมพ์ภาษาอังกฤษอยู่ — กด ${combo} เพื่อสลับเป็นไทย`
           : `ตอนนี้เครื่องยังพิมพ์ภาษาไทยอยู่ — กด ${combo} เพื่อสลับเป็นอังกฤษ`),
      el('div', { style: 'margin-top:6px;font:400 12px/1.5 var(--en);color:var(--sub)' },
        th ? `Press ${combo} to switch to Thai. If Thai is not in the list, add it in your language settings — or press Skip and start with English.`
           : `Press ${combo} to switch back to English.`));
  }

  // -- step 4 --------------------------------------------------------------
  function stepGoal() {
    const opts = [[3, 'เบา ๆ', '3 drills a day'], [5, 'พอดี', '5 drills a day'], [10, 'จริงจัง', '10 drills a day']];
    const placed = Math.max(store.progressOf('th').chapter, store.progressOf('en').chapter);
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
          `เริ่มที่ ไทย บทที่ ${store.progressOf('th').chapter} และ English lesson ${store.progressOf('en').chapter} — ปรับได้ทุกเมื่อจากแผนที่บทเรียน`)),
      // The placement test is a convenience, not a verdict. Someone who wants to
      // relearn from the beginning — the whole point of resetting — must be able
      // to say so, rather than be measured back into the middle of the course.
      placed > 1
        ? el('button.btn-ghost', {
          style: 'width:100%;margin-top:12px;padding:14px',
          onClick: () => {
            store.update((st) => {
              ['th', 'th_pat', 'en'].forEach((t) => { st.progress[t].chapter = 1; st.progress[t].drill = 0; });
            });
            step = 4; render();
          },
        }, 'ไม่เป็นไร ขอเริ่มจากบทที่ 1 · Start from lesson 1 instead')
        : null,
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

/**
 * Map a placement wpm onto a starting lesson, on the 27-lesson scale: the top of
 * each row's block, so a fast typist skips the rows they already own but still
 * meets every key of the next one.
 */
export function startChapter(wpm) {
  if (wpm >= 55) return 23;  // straight to the shift layer
  if (wpm >= 40) return 18;  // number row
  if (wpm >= 28) return 13;  // bottom row
  if (wpm >= 18) return 7;   // top row
  return 1;
}
