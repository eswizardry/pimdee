// 1c — Practice. Click the card and type; Kedmanee/QWERTY heatmap, ghost pacer,
// reacting mascot, audio feedback.

import { el, mascot, faceMascot } from '../ui.js';
import { Engine, isTypingKey } from '../engine.js';
import { keyboardPanel } from '../keyboard.js';
import { chapter, drillText, drillFocus, drillTip, drillCount, dynamicDrill } from '../content.js';
import { tipCard } from '../tips.js';
import { wrongInputMethod } from '../layouts.js';
import * as store from '../store.js';
import { blip, buzz, chord } from '../audio.js';

export function practiceScreen({ lang = 'th', ch = null, drill = null, dynamic = false }, nav) {
  const s = store.get();
  let curLang = lang;
  let chId = ch ?? store.progressOf(curLang).chapter;
  let drillIx = drill ?? store.progressOf(curLang).drill;

  /** Build the Dynamic Practice text, or null when there is nothing to drill. */
  const dynamicText = (l) => {
    const weak = store.weakKeys(l, 5);
    const settled = Object.entries(store.get().keyStats[store.track(l)] || {})
      .filter(([, v]) => v.hit >= 5 && v.miss / Math.max(1, v.hit + v.miss) < 0.05)
      .map(([id]) => id);
    return dynamicDrill(l, weak, settled);
  };

  const root = el('div.wrap', { style: 'position:relative' });
  let engine, cleanup = null;

  function build() {
    const chap = chapter(curLang, chId);
    // Teaching cards sit in the drill sequence but are read, not typed.
    const tip = dynamic ? null : drillTip(curLang, chId, drillIx);
    if (tip) return buildTip(tip, chap);

    const text = dynamic ? dynamicText(curLang) : drillText(curLang, chId, drillIx);
    if (dynamic && !text) return emptyDynamic();
    engine = new Engine(text, curLang);

    let wrongScriptRun = 0;
    let wrongScript = null;
    let banner = null;

    const ghostWpm = dynamic ? 0 : store.ghostWpm(curLang, chId, drillIx);
    const weak = new Set(store.weakKeys(curLang, 6).map((k) => k.id));

    // --- header -----------------------------------------------------------
    const tabTh = el('button', { class: curLang === 'th' ? 'on' : '', onClick: () => switchLang('th') }, 'ไทย');
    const tabEn = el('button', { class: curLang === 'en' ? 'on' : '', style: 'font-family:var(--en)', onClick: () => switchLang('en') }, 'English');

    const wpmEl = el('div.hud-n', { style: 'color:var(--lime)' }, '0');
    const accEl = el('div.hud-n', {}, '100%');
    const comboEl = el('div.hud-n', {}, '0', el('span', { style: 'font-size:14px;color:var(--dim)' }, '×'));
    const tuk = mascot(52, 13);

    const focus = dynamic
      ? `ปุ่มที่คุณพลาดบ่อย · built from the keys you miss`
      : drillFocus(curLang, chId, drillIx);
    const heading = dynamic
      ? 'ซ้อมเฉพาะปุ่ม · DYNAMIC PRACTICE'
      : `บทที่ ${chId} · DRILL ${drillIx + 1} OF ${drillCount(curLang, chId)} · เป้า ${store.goalWpm(curLang, chId)} WPM`;
    const header = el('div.spread', {},
      el('div.row', { style: 'gap:16px' },
        el('div.segmented', {}, tabTh, tabEn),
        el('div', {},
          el('div.eyebrow', {}, heading),
          focus ? el('div', { style: 'margin-top:6px;font:500 12.5px/1.2 var(--th);color:var(--lime)' }, focus) : null)),
      el('div.hud', {},
        el('div', { style: 'text-align:right' }, wpmEl, el('div.hud-l', {}, 'คำ/นาที WPM')),
        el('div', { style: 'text-align:right' }, accEl, el('div.hud-l', {}, 'แม่นยำ ACC')),
        el('div', { style: 'text-align:right' }, comboEl, el('div.hud-l', {}, 'คอมโบ COMBO')),
        tuk));

    // --- prompt -----------------------------------------------------------
    // lang matters here: a screen reader set to English mangles Thai, and this
    // is the one element whose text the learner is actually reading.
    const promptEl = el('div.prompt', { class: curLang === 'en' ? 'en' : '', lang: curLang });
    const clusterEls = engine.clusters.map((c) => {
      const span = el('span.cl', {}, c.text === ' ' ? ' ' : c.text);
      promptEl.appendChild(span);
      return span;
    });

    const fill = el('div.fill');
    const ghostTick = el('div.ghost', { title: ghostWpm ? `เงาสถิติเดิม ${ghostWpm} wpm` : 'ยังไม่มีสถิติเดิม' });
    const counter = el('div', {
      style: 'font:500 11px/1 var(--mono);color:var(--dim)',
      'aria-label': `ความคืบหน้า · progress`,
    }, `0/${engine.total}`);

    const promptCard = el('div.card-hero', { style: 'padding:34px 36px' },
      promptEl,
      el('div.row', { style: 'margin-top:22px;gap:14px' },
        el('div.track', {}, fill, ghostTick),
        counter),
      el('div', { style: 'margin-top:8px;font:400 11px/1 var(--th);color:var(--dim)' },
        ghostWpm
          ? `เส้นสีเทาคือเงาสถิติเดิมของคุณ ${ghostWpm} wpm · grey tick = your best run's pace`
          : 'ยังไม่มีเงาสถิติสำหรับแบบฝึกนี้ — รอบนี้จะกลายเป็นเงา · this run becomes your ghost'));

    // --- keyboard ---------------------------------------------------------
    const kb = keyboardPanel(curLang);
    kb.style.display = store.get().showKeyboard ? '' : 'none';

    // --- footer -----------------------------------------------------------
    const coach = el('div', { style: 'font:400 13px/1.4 var(--th);color:var(--sub)' });
    coach.innerHTML = 'คลิกที่การ์ดนี้แล้วเริ่มพิมพ์ได้เลย <span class="dim">· click this card and start typing</span>';
    const soundBtn = el('button.btn-soft', { onClick: toggleSound }, store.get().sound ? 'เสียง: เปิด' : 'เสียง: ปิด');
    // Hiding the keyboard is how a learner graduates to touch typing, so it is
    // a first-class control rather than a setting buried elsewhere.
    const kbBtn = el('button.btn-ghost', { onClick: toggleKeyboard },
      store.get().showKeyboard ? 'ซ่อนแป้นพิมพ์ · Hide keys' : 'โชว์แป้นพิมพ์ · Show keys');

    const footer = el('div.spread', {},
      coach,
      el('div.row', { style: 'gap:8px' },
        el('button.btn-ghost', { onClick: () => restart() }, 'เริ่มใหม่ · Restart'),
        kbBtn,
        el('button.btn-ghost', { onClick: () => nav(`#/lessons/${curLang}`) }, 'บทเรียน · Lessons'),
        soundBtn));

    // --- stage ------------------------------------------------------------
    const stage = el('div.stage', {
      tabindex: '0',
      role: 'group',
      'aria-label': `แบบฝึกพิมพ์ · typing drill, ${curLang === 'th' ? 'Thai' : 'English'}`
        + ' — click or focus, then type. Escape to leave.',
    }, header, promptCard, kb, footer);
    const overlay = el('div.overlay', {},
      el('div.msg', {}, 'คลิกเพื่อเริ่มพิมพ์', el('br'), el('span.dim', {}, 'click to focus, then type')));
    const card = el('div', { style: 'position:relative;border-radius:10px;background:var(--bg)' }, stage, overlay);

    stage.addEventListener('focus', () => { overlay.style.display = 'none'; });
    stage.addEventListener('blur', () => { overlay.style.display = ''; });
    card.addEventListener('mousedown', (e) => { e.preventDefault(); stage.focus(); });

    function onKey(e) {
      if (e.key === 'Escape') { stage.blur(); return; }
      if (e.key === 'Tab') return;
      if (e.key === 'Backspace') { e.preventDefault(); engine.backspace(); return; }
      if (e.key === 'Enter' && engine.finished) { e.preventDefault(); finish(); return; }
      if (!isTypingKey(e)) return;
      e.preventDefault();
      // Grab the finger before pressing: press() repaints to the *next* key.
      const pressed = engine.nextKey;
      const expected = engine.nextChar;
      const r = engine.press(e.key);
      if (!r) return;

      // Three wrong-script keystrokes in a row is an input-method problem, not
      // a typing mistake. One or two could be a genuine slip.
      //
      // Space is the same key under every input method, so a correct space says
      // nothing either way — count it as neither evidence nor exoneration, or a
      // drill like "กก าา" would reset the run before the hint could appear.
      const neutral = expected === ' ' || e.key === ' ';
      if (!neutral) {
        const mismatch = r.ok ? null : wrongInputMethod(expected, e.key);
        if (mismatch) {
          wrongScript = mismatch;
          wrongScriptRun += 1;
        } else {
          wrongScriptRun = 0;
        }
      }
      if (wrongScriptRun >= 3 && !banner) {
        banner = inputMethodBanner(wrongScript);
        card.parentNode.insertBefore(banner, card);
      } else if (wrongScriptRun === 0 && banner) {
        banner.remove();
        banner = null;
      }
      kb.hands.press(pressed ? pressed.finger : null, r.ok);
      blip(r.ok, engine.combo);
      if (!r.ok) buzz(20);
      if (r.finished) { chord(); setTimeout(finish, 420); }
    }
    stage.addEventListener('keydown', onKey);

    function paint() {
      const cursor = engine.cursorCluster;
      clusterEls.forEach((span, i) => {
        const c = engine.clusters[i];
        let cls = 'cl';
        const anyWrong = [...Array(c.end - c.start)].some((_, k) => engine.wrongAt.has(c.start + k));
        if (anyWrong) cls += ' bad';
        else if (c.end <= engine.done) cls += ' done';
        if (i === cursor && !engine.finished) cls += ' cur';
        span.className = cls;
      });

      const p = engine.progress * 100;
      fill.style.width = `${p}%`;
      counter.textContent = `${engine.done}/${engine.total}`;
      wpmEl.textContent = engine.wpm;
      accEl.textContent = `${engine.accuracy}%`;
      comboEl.firstChild.textContent = engine.combo;

      // ghost pacer: where your best run would be at this moment
      if (ghostWpm && engine.t0) {
        const gChars = (ghostWpm * 5) * (engine.seconds / 60);
        ghostTick.style.left = `${Math.min(100, (gChars / engine.total) * 100)}%`;
        ghostTick.style.background = gChars > engine.done ? 'var(--red)' : 'var(--green)';
      } else {
        ghostTick.style.left = '0%';
      }

      const nk = engine.nextKey;
      // Boss drills switch script mid-sentence; follow the character's layout.
      if (nk && kb.setLayout(nk.lang)) {
        weak.clear();
        store.weakKeys(nk.lang, 6).forEach((k) => weak.add(k.id));
      }
      kb.paint(nk ? nk.id : null, !!(nk && nk.shift), weak, nk ? nk.finger : null);
      faceMascot(tuk, { bad: engine.lastWrong, combo: engine.combo, done: engine.finished });

      if (engine.done) {
        coach.innerHTML = engine.finished
          ? 'จบแบบฝึก! <span class="dim">· drill complete — saving…</span>'
          : engine.lastWrong
            ? 'ผิดปุ่ม — ไม่เป็นไร พิมพ์ต่อได้เลย <span class="dim">· wrong key, keep going</span>'
            : engine.combo > 20
              ? 'ลื่นมาก! <span class="dim">· great streak, stay on rhythm</span>'
              : 'ดีมาก รักษาจังหวะไว้ <span class="dim">· nice rhythm, keep it steady</span>';
      }
    }

    engine.addEventListener('change', paint);
    paint();

    function finish() {
      const sum = engine.summary();
      if (dynamic) store.commitDynamic({ lang: curLang, ...sum });
      else store.commitRun({ lang: curLang, chapterId: chId, drill: drillIx, ...sum });
      nav('#/results');
    }

    function restart() {
      // A Dynamic run is regenerated, since the weak-key set may have moved.
      engine.reset(dynamic ? (dynamicText(curLang) || text) : drillText(curLang, chId, drillIx), curLang);
      render();
      requestAnimationFrame(() => root.querySelector('.stage')?.focus());
    }

    function switchLang(l) {
      if (l === curLang) return;
      curLang = l;
      chId = store.progressOf(l).chapter;
      drillIx = store.progressOf(l).drill;
      render();
      requestAnimationFrame(() => root.querySelector('.stage')?.focus());
    }

    function toggleKeyboard() {
      store.update((st) => { st.showKeyboard = !st.showKeyboard; });
      const on = store.get().showKeyboard;
      kb.style.display = on ? '' : 'none';
      kbBtn.textContent = on ? 'ซ่อนแป้นพิมพ์ · Hide keys' : 'โชว์แป้นพิมพ์ · Show keys';
      stage.focus();
    }

    function toggleSound() {
      store.update((st) => { st.sound = !st.sound; });
      soundBtn.textContent = store.get().sound ? 'เสียง: เปิด' : 'เสียง: ปิด';
      if (store.get().sound) blip(true, 4);
    }

    cleanup = () => { engine.removeEventListener('change', paint); stage.removeEventListener('keydown', onKey); };

    return el('div', {},
      el('div', { style: 'margin-bottom:14px' },
        el('div.eyebrow', {}, `${chap.name} · ${chap.en}`)),
      card);
  }

  /**
   * Shown when several keystrokes in a row look like the OS input method is on
   * the wrong script. Without this a learner alone at the keyboard just sees
   * every key marked wrong and concludes the app is broken.
   */
  function inputMethodBanner(want) {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const combo = mac ? 'Control + Space' : 'Windows + Space';
    const th = want === 'th';
    return el('div.card', {
      role: 'alert',
      style: 'margin-bottom:14px;border-color:var(--red);background:rgba(248,113,113,.08)',
    },
      el('div.eyebrow', { style: 'color:var(--red)' },
        th ? 'สลับแป้นพิมพ์เป็นภาษาไทย · SWITCH TO THAI' : 'สลับแป้นพิมพ์เป็นภาษาอังกฤษ · SWITCH TO ENGLISH'),
      el('div', { style: 'margin-top:8px;font:500 15px/1.4 var(--th)' },
        th
          ? `บทนี้ต้องพิมพ์ภาษาไทย แต่เครื่องยังเป็นภาษาอังกฤษอยู่ — กด ${combo} เพื่อสลับ`
          : `บทนี้ต้องพิมพ์ภาษาอังกฤษ แต่เครื่องยังเป็นภาษาไทยอยู่ — กด ${combo} เพื่อสลับ`),
      el('div', { style: 'margin-top:6px;font:400 12.5px/1.5 var(--en);color:var(--sub)' },
        th
          ? `This lesson needs Thai. Your keyboard is still on English — press ${combo} to switch. `
            + 'If Thai is not in the list yet, add it in your computer\'s language settings.'
          : `This lesson needs English. Press ${combo} to switch back.`));
  }

  /** A teaching card: read it, acknowledge, move to the next drill. */
  function buildTip(tipId, chap) {
    const total = drillCount(curLang, chId);
    const advance = () => {
      const { next } = store.commitTip({ lang: curLang, chapterId: chId, drill: drillIx });
      if (next === null) nav(`#/lessons/${curLang}`);
      else nav(`#/practice/${curLang}/${chId}/${next}`);
    };

    const card = tipCard(tipId, { onDone: advance, index: drillIx, total });
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    cleanup = () => { card.stop?.(); window.removeEventListener('keydown', onKey); };

    return el('div', {},
      el('div.eyebrow', { style: 'margin-bottom:14px' },
        `บทที่ ${chap.id} · ${chap.name} · ${chap.en}`),
      card);
  }

  /** Dynamic Practice has nothing to work with until some keys have been missed. */
  function emptyDynamic() {
    return el('div.card-hero', { style: 'text-align:center;padding:56px 30px' },
      mascot(66, 16),
      el('div', { style: 'margin-top:18px;font:600 19px/1.4 var(--th)' },
        'ยังไม่มีปุ่มที่พลาดบ่อยพอจะสร้างแบบฝึก'),
      el('div', { style: 'margin-top:8px;font:400 13px/1.5 var(--en);color:var(--sub)' },
        'Dynamic Practice builds a drill from the keys you miss. Finish a couple of '
        + 'normal drills first and it will have something to work with.'),
      el('div.row', { style: 'gap:8px;justify-content:center;margin-top:22px' },
        el('button.btn', { onClick: () => nav(`#/practice/${curLang}`) }, 'ไปซ้อมบทเรียน · Go to lessons'),
        el('button.btn-ghost', { onClick: () => nav('#/home') }, 'หน้าแรก · Home')));
  }

  function render() {
    cleanup?.();
    root.replaceChildren(build());
  }

  render();
  root.mount = () => requestAnimationFrame(() => root.querySelector('.stage')?.focus());
  root.unmount = () => cleanup?.();
  return root;
}
