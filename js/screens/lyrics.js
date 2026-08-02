// 1d — Lyrics / verse mode. No keyboard shown: eyes stay on the line. Public
// domain Thai กลอนสุภาพ and English verse.

import { el } from '../ui.js';
import { Engine, isTypingKey } from '../engine.js';
import { TRACKS } from '../content.js';
import * as store from '../store.js';
import { blip, buzz, chord } from '../audio.js';

export function lyricsScreen(params, nav) {
  let track = TRACKS.find((t) => t.id === params.id) || TRACKS[0];
  const root = el('div.wrap', {});
  let teardown = null;

  function build() {
    let line = 0;
    const engine = new Engine(track.lines[0], track.lang);

    const wpmEl = el('div', { style: 'font:500 22px/1 var(--mono);color:var(--lime)' }, '0');
    const accEl = el('div', { style: 'font:500 22px/1 var(--mono)' }, '100%');
    const eq = el('div.eq', {}, [...Array(6)].map(() => el('i', { style: 'height:20%' })));

    const prevEl = el('div.lyr-prev', {});
    const nextEl = el('div.lyr-next', {});
    const curEl = el('div.lyr-cur', { class: track.lang === 'en' ? 'en' : '' });
    const dot = el('div', { style: 'position:absolute;left:0;top:-5px;width:16px;height:16px;border-radius:50%;background:var(--lime);box-shadow:0 0 18px rgba(200,247,90,.6);transition:left .12s' });
    const fill = el('div', { style: 'width:0;height:100%;background:var(--lime);transition:width .12s' });
    const lineCount = el('div', { style: 'font:500 12px/1 var(--mono);color:var(--dim)' }, `1/${track.lines.length} วรรค`);
    const comboPill = el('div', { style: 'padding:7px 13px;border-radius:999px;background:rgba(200,247,90,.12);font:600 11.5px/1 var(--mono);color:var(--lime)' }, 'คอมโบ 0×');

    let clusterEls = [];
    function mountLine() {
      curEl.replaceChildren();
      clusterEls = engine.clusters.map((c) => {
        const span = el('span.cl', {}, c.text === ' ' ? ' ' : c.text);
        curEl.appendChild(span);
        return span;
      });
      prevEl.textContent = line > 0 ? track.lines[line - 1] : track.sub;
      nextEl.textContent = line + 1 < track.lines.length ? track.lines[line + 1] : '— จบบท —';
      lineCount.textContent = `${line + 1}/${track.lines.length} วรรค`;
    }

    function paint() {
      const cursor = engine.cursorCluster;
      clusterEls.forEach((span, i) => {
        const c = engine.clusters[i];
        const wrong = [...Array(c.end - c.start)].some((_, k) => engine.wrongAt.has(c.start + k));
        span.className = `cl${wrong ? ' bad' : c.end <= engine.done ? ' done' : ''}${i === cursor ? ' cur' : ''}`;
      });
      const p = ((line + engine.progress) / track.lines.length) * 100;
      fill.style.width = `${p}%`;
      dot.style.left = `${p}%`;
      wpmEl.textContent = engine.wpm;
      accEl.textContent = `${engine.accuracy}%`;
      comboPill.textContent = `คอมโบ ${engine.combo}×`;
      const energy = Math.min(1, engine.combo / 24);
      [...eq.children].forEach((barEl, i) => {
        barEl.style.height = `${20 + energy * (30 + ((i * 37) % 50))}%`;
      });
    }

    let totalWpm = [], totalAcc = [];
    function onKey(e) {
      if (e.key === ' ' && !engine.t0) { e.preventDefault(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); engine.backspace(); return; }
      if (!isTypingKey(e)) return;
      e.preventDefault();
      const r = engine.press(e.key);
      if (!r) return;
      blip(r.ok, engine.combo);
      if (!r.ok) buzz(20);
      if (r.finished) {
        totalWpm.push(engine.wpm); totalAcc.push(engine.accuracy);
        if (line + 1 >= track.lines.length) return finish();
        line += 1;
        const carriedCombo = engine.combo;
        engine.reset(track.lines[line], track.lang);
        engine.combo = carriedCombo;
        engine.t0 = Date.now();
        mountLine();
        paint();
      }
    }

    function finish() {
      const wpm = Math.round(totalWpm.reduce((a, b) => a + b, 0) / totalWpm.length);
      const acc = Math.round(totalAcc.reduce((a, b) => a + b, 0) / totalAcc.length);
      chord();
      store.update((st) => {
        const p = st.progress[store.track(track.lang)];
        p.points += Math.round(wpm * (acc / 100) / 2) + 15;
        p.bestWpm = Math.max(p.bestWpm, wpm);
        p.history.push({ day: new Date().toISOString().slice(0, 10), wpm, acc, points: 15 });
        st.day.runs += 1;
      });
      curEl.replaceChildren(el('span', { style: 'color:var(--lime)' }, 'จบบท · track complete'));
      nextEl.textContent = `${wpm} wpm · ${acc}% · +15 คะแนน`;
    }

    const stage = el('div.lyr-wrap', { tabindex: '0', style: 'outline:none;border-radius:10px;overflow:hidden;border:1px solid var(--line)' },
      el('div.spread', { style: 'padding:18px 30px;border-bottom:1px solid var(--line)' },
        el('div.row', { style: 'gap:14px' },
          el('div', { style: 'width:44px;height:44px;border-radius:6px;background:var(--key);border:1px solid var(--line-2);display:grid;place-items:center;font:400 9px/1.3 var(--mono);color:var(--dim)' }, 'บท'),
          el('div', {},
            el('div', { style: 'font:600 15px/1.2 var(--th)' }, track.title),
            el('div', { style: 'font:400 11px/1.3 var(--en);color:var(--dim);margin-top:3px' }, track.sub))),
        el('div.row', { style: 'gap:24px' },
          el('div', { style: 'text-align:right' }, wpmEl, el('div', { style: 'font:400 9.5px/1 var(--mono);color:var(--dim);margin-top:4px' }, 'คำ/นาที')),
          el('div', { style: 'text-align:right' }, accEl, el('div', { style: 'font:400 9.5px/1 var(--mono);color:var(--dim);margin-top:4px' }, 'แม่นยำ')),
          eq)),
      el('div.lyr-body', {},
        prevEl,
        curEl,
        el('div.row', { style: 'gap:10px' },
          el('div', { style: 'width:520px;height:6px;border-radius:999px;background:var(--key);position:relative' }, fill, dot),
          lineCount),
        nextEl),
      el('div.spread', { style: 'padding:16px 30px;border-top:1px solid var(--line);background:var(--panel)' },
        el('div.row', { style: 'gap:12px' },
          comboPill,
          el('div', { style: 'font:400 12px/1.4 var(--th);color:var(--sub)' },
            'โหมดนี้ไม่โชว์แป้นพิมพ์ — ฝึกจังหวะและสายตาอยู่บนบรรทัด ',
            el('span.dim', {}, '· eyes-up mode'))),
        el('div.row', { style: 'gap:8px' },
          TRACKS.map((t, i) =>
            el('button.btn-ghost', {
              style: `padding:7px 12px;font-size:11px${t.id === track.id ? ';border-color:var(--lime);color:var(--lime)' : ''}`,
              title: t.title,
              onClick: () => { track = t; render(); },
            }, `${t.lang === 'th' ? 'ไทย' : 'EN'} ${i + 1}`)))));

    stage.addEventListener('keydown', onKey);
    stage.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault(); stage.focus();
    });
    engine.addEventListener('change', paint);
    mountLine(); paint();
    teardown = () => stage.removeEventListener('keydown', onKey);
    return stage;
  }

  function render() {
    teardown?.();
    root.replaceChildren(
      el('div.eyebrow', { style: 'margin-bottom:14px' }, 'พิมพ์ตามบทกลอน · LYRICS MODE'),
      build());
    requestAnimationFrame(() => root.querySelector('.lyr-wrap')?.focus());
  }

  render();
  root.mount = () => root.querySelector('.lyr-wrap')?.focus();
  root.unmount = () => teardown?.();
  return root;
}
