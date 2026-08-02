// Stats — the progress record behind the home tiles: per-language history and
// a per-key accuracy heatmap for both layouts.

import { el, fmt, mmss, clamp } from '../ui.js';
import * as store from '../store.js';
import { keyRows, capGlyph, layoutName, THAI_LAYOUTS, setThaiLayout, thaiLayoutId } from '../layouts.js';
import { chapters } from '../content.js';
import { adSlot } from '../ads.js';

export function statsScreen(_params, nav) {
  const s = store.get();
  return el('div.wrap', {},
    el('div.spread', { style: 'margin-bottom:16px' },
      el('div.eyebrow', {}, 'สถิติ · STATS'),
      el('div.row', { style: 'gap:8px' },
      layoutSwitcher(nav),
      el('button.btn-ghost', {
        onClick: () => {
          if (confirm('ล้างความคืบหน้าทั้งหมด? / Erase all progress?')) { store.reset(); nav('#/onboarding'); }
        },
      }, 'ล้างข้อมูล · Reset'))),

    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:16px' },
      langPanel('th'), langPanel('en')),

    el('div.card', { style: 'margin-top:16px' },
      el('div.eyebrow', {}, 'รวม · TOTALS'),
      el('div.row', { style: 'gap:36px;margin-top:16px;flex-wrap:wrap' },
        total(fmt(store.combinedScore()), 'คะแนนรวม'),
        total(`★ ${store.totalStars()}`, 'ดาวที่ได้'),
        total(store.tier().th, 'ระดับ'),
        total(`${s.streak.count} / ${s.streak.best}`, 'สตรีค / สูงสุด'),
        total(store.progressOf('th').runs + store.progressOf('en').runs, 'รอบทั้งหมด'),
        total(mmss(s.day.seconds), 'เวลาซ้อมวันนี้'),
        total(fmt(s.arcade.high), 'อาร์เคดสูงสุด'))),

    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px' },
      heatmap('th'), heatmap('en')),
    backupCard(nav),
    adSlot('statsFooter'));
}

/**
 * Switching the Thai layout switches curriculum *and* progress track — each
 * layout keeps its own chapters, stars and key stats — so nothing is lost and
 * nothing is carried across to a keyboard where it would be meaningless.
 */
function layoutSwitcher(nav) {
  const cur = thaiLayoutId();
  return el('div.segmented', {},
    Object.entries(THAI_LAYOUTS).map(([id, l]) =>
      el('button', {
        class: id === cur ? 'on' : '',
        title: `แป้นพิมพ์ไทย · ${l.label}`,
        onClick: () => {
          if (id === cur) return;
          store.update((st) => { st.layout = setThaiLayout(id); });
          nav('#/stats', true);
        },
      }, l.label.split(' · ')[0])));
}

/**
 * Progress lives only in this browser. One cleared cache, or one new laptop, and
 * it is gone — so it has to be possible to take it with you.
 */
function backupCard(nav) {
  const status = el('div', { style: 'font:400 11.5px/1.4 var(--th);color:var(--dim);min-height:16px' });

  const save = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = el('a', {
      href: URL.createObjectURL(blob),
      download: `tuktype-progress-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    status.textContent = 'บันทึกไฟล์แล้ว · saved';
    status.style.color = 'var(--lime)';
  };

  // Hidden and triggered by the Import button; named and hidden from the a11y
  // tree so it is not an unlabelled stop for anyone.
  const picker = el('input', {
    type: 'file', accept: 'application/json,.json', style: 'display:none',
    'aria-hidden': 'true', tabindex: '-1', 'aria-label': 'เลือกไฟล์สำรอง · choose a backup file',
  });
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    const text = await file.text();
    // Destructive: this replaces everything, so confirm before touching state.
    if (!confirm('นำเข้าข้อมูลจะเขียนทับความคืบหน้าทั้งหมดที่มีอยู่ ยืนยันหรือไม่?\n\nImporting replaces all current progress. Continue?')) return;
    const res = store.importJSON(text);
    if (!res.ok) {
      status.textContent = `นำเข้าไม่สำเร็จ — ${res.reason}`;
      status.style.color = 'var(--red)';
      return;
    }
    location.reload();
  });

  return el('div.card', { style: 'margin-top:16px' },
    el('div.spread', {},
      el('div', {},
        el('div.eyebrow', {}, 'สำรองข้อมูล · BACKUP'),
        el('div', { style: 'margin-top:8px;font:400 12.5px/1.5 var(--th);color:var(--sub);max-width:560px' },
          'ความคืบหน้าเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่องจะหายไป ',
          el('span.dim', {}, '· progress lives only in this browser')),
        status),
      el('div.row', { style: 'gap:8px' },
        el('button.btn-ghost', { onClick: save }, 'ดาวน์โหลด · Export'),
        el('button.btn-ghost', { onClick: () => picker.click() }, 'นำเข้า · Import'),
        picker)));
}

const total = (n, label) =>
  el('div', {},
    el('div', { style: 'font:500 24px/1 var(--mono)' }, n),
    el('div', { style: 'font:400 11px/1.3 var(--th);color:var(--dim);margin-top:6px' }, label));

function langPanel(lang) {
  const p = store.progressOf(lang);
  const hist = p.history.slice(-30);
  const peak = Math.max(1, ...hist.map((h) => h.wpm));
  const color = lang === 'th' ? 'var(--lime)' : 'var(--sky)';
  const chaptersDone = chapters(lang).filter((c) => store.chapterProgress(lang, c.id).complete).length;

  return el('div.card', {},
    el('div.spread', {},
      el('div', { style: `font:600 17px/1 var(--${lang === 'th' ? 'th' : 'en'})` }, lang === 'th' ? `ไทย · ${layoutName('th')}` : 'English · QWERTY'),
      el('span', { style: `font:500 11px/1 var(--mono);color:${color}` }, `${p.points} pts`)),
    el('div.row', { style: 'gap:26px;margin-top:16px' },
      total(p.bestWpm, 'wpm สูงสุด'),
      total(store.avgOf(lang, 'wpm'), 'wpm เฉลี่ย'),
      total(`${store.avgOf(lang, 'acc') || 100}%`, 'แม่นยำเฉลี่ย'),
      total(`${chaptersDone}/10`, 'บทที่จบ')),
    el('div', { style: 'display:flex;align-items:flex-end;gap:3px;height:80px;margin-top:18px;border-bottom:1px solid var(--line)' },
      hist.length
        ? hist.map((h) => el('i', {
          title: `${h.day} · ${h.wpm} wpm · ${h.acc}%`,
          style: `flex:1;min-width:3px;height:${clamp((h.wpm / peak) * 100, 5, 100)}%;background:${h.acc >= 95 ? color : 'var(--mute)'}`,
        }))
        : el('span.dim', { style: 'font:400 12px/1.4 var(--th);align-self:center' }, 'ยังไม่มีประวัติ')));
}

function heatmap(lang) {
  const ks = store.get().keyStats[store.track(lang)] || {};
  const rows = keyRows(lang);
  return el('div.card', {},
    el('div.eyebrow', {}, `ความแม่นยำรายปุ่ม · ${layoutName(lang)}`),
    el('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:center;margin-top:16px' },
      rows.map((row) =>
        el('div', { style: 'display:flex;gap:6px' },
          row.keys.map((k) => {
            const v = ks[k.id];
            const total = v ? v.hit + v.miss : 0;
            const acc = total ? v.hit / total : null;
            const bg = acc === null ? 'var(--key)'
              : acc >= 0.97 ? 'rgba(200,247,90,.22)'
                : acc >= 0.9 ? 'rgba(200,247,90,.10)'
                  : acc >= 0.8 ? 'rgba(248,113,113,.16)' : 'rgba(248,113,113,.30)';
            return el('div.heat-cell', {
              title: total ? `${v.hit} hit / ${v.miss} miss` : 'ยังไม่เคยพิมพ์',
              style: `background:${bg};min-width:38px`,
            },
              el('div.g', { style: lang === 'en' ? 'font-family:var(--mono);font-size:15px' : '' }, capGlyph(k.glyph)),
              el('div.p', {}, acc === null ? '—' : `${Math.round(acc * 100)}%`));
          })))));
}
