// 1f — คำร่วง / Falling words. Thai and English drop together; type a word to
// clear it before it crosses the red line.

import { el, fmt, mascot, faceMascot } from '../ui.js';
import { ARCADE_WORDS } from '../content.js';
import * as store from '../store.js';
import { blip, buzz, chord } from '../audio.js';

const LIVES = 3;

export function arcadeScreen(_params, nav) {
  const field = el('div.field', { tabindex: '0', style: 'outline:none' });
  const deadline = el('div.deadline');
  const buffer = el('div.buffer');
  const tuk = mascot(60, 15);
  const dock = el('div.dock', {}, tuk, buffer);
  field.append(deadline, dock);

  const scoreEl = el('div', { style: 'font:500 22px/1 var(--mono)' }, '0');
  const multEl = el('div', { style: 'font:500 22px/1 var(--mono);color:var(--lime)' }, '×1');
  const levelEl = el('div', { style: 'font:500 22px/1 var(--mono)' }, '1');
  const livesEl = el('div.lives', {}, [...Array(LIVES)].map(() => el('i', {})));

  const head = el('div.spread', { style: 'padding:14px 22px;background:var(--panel);border-bottom:1px solid var(--line)' },
    el('div.row', { style: 'gap:18px' },
      el('div', { style: 'font:600 15px/1 var(--th)' }, 'คำร่วง ',
        el('span.eyebrow', { style: 'letter-spacing:.12em' }, 'FALLING WORDS')),
      livesEl),
    el('div.row', { style: 'gap:30px' },
      hudCell(scoreEl, 'คะแนน SCORE'),
      hudCell(multEl, 'ตัวคูณ MULT'),
      hudCell(levelEl, 'ระดับ LEVEL')));

  const foot = el('div.spread', { style: 'padding:14px 22px;background:var(--panel);border-top:1px solid var(--line)' },
    el('div', { style: 'font:400 12.5px/1.4 var(--th);color:var(--sub)' },
      'คำไทยและอังกฤษร่วงสลับกัน — พิมพ์ให้ทันก่อนถึงเส้นแดง ',
      el('span.dim', {}, '· mixed-language drop; tone marks count as one keystroke')),
    el('div.row', { style: 'gap:16px;font:400 11px/1 var(--mono);color:var(--dim)' },
      el('span', {}, 'ESC พัก'),
      el('span', {}, `สถิติสูงสุด ${fmt(store.get().arcade.high)}`)));

  const card = el('div', { style: 'border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg)' },
    head, field, foot);

  // ---- game state --------------------------------------------------------
  let words = [];      // {node, text, lang, x, y, speed}
  let typed = '';
  let score = 0, mult = 1, streak = 0, level = 1, lives = LIVES;
  let running = false, raf = 0, lastT = 0, spawnAt = 0;
  const H = 430, DEAD = H - 96;

  function spawn() {
    const lang = Math.random() < 0.5 ? 'th' : 'en';
    const pool = ARCADE_WORDS[lang];
    const text = pool[(Math.random() * pool.length) | 0];
    if (words.some((w) => w.text === text)) return;
    const node = el('div.word', { class: lang === 'en' ? 'en' : '' }, el('span', {}, text));
    const x = 4 + Math.random() * 80;
    node.style.left = `${x}%`;
    field.insertBefore(node, deadline);
    words.push({ node, text, lang, y: -60, speed: 26 + level * 4 + Math.random() * 12 });
  }

  function tick(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;

    if (t > spawnAt) {
      spawn();
      spawnAt = t + Math.max(620, 1900 - level * 90);
    }

    for (const w of words) {
      w.y += w.speed * dt;
      w.node.style.transform = `translateY(${w.y}px)`;
    }

    const crossed = words.filter((w) => w.y > DEAD);
    if (crossed.length) {
      crossed.forEach((w) => w.node.remove());
      words = words.filter((w) => w.y <= DEAD);
      lives -= crossed.length;
      streak = 0; mult = 1;
      buzz(60);
      blip(false);
      paintHud();
      if (lives <= 0) return gameOver();
    }

    highlight();
    raf = requestAnimationFrame(tick);
  }

  function highlight() {
    const target = words.find((w) => typed && w.text.startsWith(typed));
    words.forEach((w) => w.node.classList.toggle('active', w === target));
    buffer.replaceChildren();
    if (target) {
      buffer.append(
        el('span', { style: 'color:var(--lime)' }, typed),
        el('span', { style: 'color:var(--dim-2)' }, target.text.slice(typed.length)));
    } else if (typed) {
      buffer.append(el('span', { style: 'color:var(--red)' }, typed));
    } else {
      buffer.append(el('span', { style: 'color:var(--dim-2);font-size:15px;font-family:var(--th)' }, 'พิมพ์คำที่ร่วงลงมา'));
    }
    buffer.appendChild(el('div.caret'));
  }

  function pop(w, points) {
    const rect = w.node.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const p = el('div.pop', {
      style: `left:${rect.left - fieldRect.left + rect.width / 2}px;top:${rect.top - fieldRect.top}px`,
    }, `+${points}`);
    field.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); running ? pause() : start(); return; }
    if (!running) { if (e.key === 'Enter') start(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); typed = typed.slice(0, -1); highlight(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || [...e.key].length !== 1) return;
    e.preventDefault();

    const next = typed + e.key;
    const hit = words.find((w) => w.text.startsWith(next));
    if (!hit) {
      streak = 0; mult = 1; typed = '';
      blip(false); buzz(20);
      faceMascot(tuk, { bad: true, combo: 0 });
      paintHud(); highlight();
      return;
    }

    typed = next;
    blip(true, streak);
    if (hit.text === typed) {
      const points = (hit.text.length * 10 + 20) * mult;
      score += points;
      streak += 1;
      mult = Math.min(8, 1 + Math.floor(streak / 3));
      level = Math.min(20, 1 + Math.floor(score / 900));
      pop(hit, points);
      hit.node.remove();
      words = words.filter((w) => w !== hit);
      typed = '';
      faceMascot(tuk, { bad: false, combo: streak * 2 });
      paintHud();
    }
    highlight();
  }

  function paintHud() {
    scoreEl.textContent = fmt(score);
    multEl.textContent = `×${mult}`;
    levelEl.textContent = level;
    [...livesEl.children].forEach((n, i) => n.classList.toggle('off', i >= lives));
  }

  let overlay = null;
  function showOverlay(title, sub, btnText, onGo) {
    overlay?.remove();
    overlay = el('div.overlay', { style: 'border-radius:0' },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font:600 24px/1.3 var(--th)' }, title),
        el('div', { style: 'margin-top:8px;font:400 13px/1.5 var(--en);color:var(--sub)' }, sub),
        el('button.btn', { style: 'margin-top:20px', onClick: (e) => { e.stopPropagation(); onGo(); } }, btnText)));
    field.appendChild(overlay);
  }

  function start() {
    overlay?.remove(); overlay = null;
    words.forEach((w) => w.node.remove());
    words = []; typed = ''; score = 0; mult = 1; streak = 0; level = 1; lives = LIVES;
    running = true; lastT = performance.now(); spawnAt = lastT + 400;
    paintHud(); highlight();
    field.focus();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
    showOverlay('พัก · Paused', 'Press ESC or the button to resume.', 'เล่นต่อ · Resume', () => {
      running = true; lastT = performance.now(); spawnAt = lastT + 400;
      overlay?.remove(); overlay = null;
      field.focus();
      raf = requestAnimationFrame(tick);
    });
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);
    const prev = store.get().arcade.high;
    store.recordArcade(score, level);
    chord([392, 330, 262], 0.6);
    showOverlay(
      score > prev ? 'สถิติใหม่!' : 'จบเกม · Game over',
      `${fmt(score)} points · level ${level}${score > prev ? ` — beat your old ${fmt(prev)}` : ` · best ${fmt(prev)}`}`,
      'เล่นอีกครั้ง · Play again', start);
  }

  field.addEventListener('keydown', onKey);
  field.addEventListener('mousedown', (e) => { e.preventDefault(); field.focus(); });

  const root = el('div.wrap', {},
    el('div.eyebrow', { style: 'margin-bottom:14px' }, 'อาร์เคด · ARCADE'),
    card);

  showOverlay('คำร่วง · Falling Words', 'Type each word before it crosses the red line. ESC pauses.', 'เริ่ม · Start', start);
  root.mount = () => field.focus();
  root.unmount = () => { running = false; cancelAnimationFrame(raf); };
  return root;
}

const hudCell = (valueEl, label) =>
  el('div', { style: 'text-align:right' }, valueEl,
    el('div', { style: 'font:400 9.5px/1 var(--mono);letter-spacing:.12em;color:var(--dim);margin-top:5px' }, label));
